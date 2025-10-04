-- Migration to add weekly timesheet workflow system
-- This migration creates tables for the weekly timesheet specification

-- Timesheet Submissions table
CREATE TABLE timesheet_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_member_id UUID REFERENCES project_members(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL, -- Monday of the week
  week_end_date DATE NOT NULL, -- Friday of the week
  status VARCHAR(20) CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  total_hours DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id, week_start_date)
);

-- Timesheet Entries table (daily breakdown)
CREATE TABLE timesheet_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timesheet_submission_id UUID REFERENCES timesheet_submissions(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  monday_hours DECIMAL(5,2) DEFAULT 0,
  tuesday_hours DECIMAL(5,2) DEFAULT 0,
  wednesday_hours DECIMAL(5,2) DEFAULT 0,
  thursday_hours DECIMAL(5,2) DEFAULT 0,
  friday_hours DECIMAL(5,2) DEFAULT 0,
  monday_notes TEXT,
  tuesday_notes TEXT,
  wednesday_notes TEXT,
  thursday_notes TEXT,
  friday_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_timesheet_submissions_org_user ON timesheet_submissions(organization_id, user_id);
CREATE INDEX idx_timesheet_submissions_status ON timesheet_submissions(status);
CREATE INDEX idx_timesheet_submissions_date ON timesheet_submissions(week_start_date);
CREATE INDEX idx_timesheet_entries_submission ON timesheet_entries(timesheet_submission_id);
CREATE INDEX idx_timesheet_entries_project ON timesheet_entries(project_id);

-- Add update triggers for updated_at
CREATE TRIGGER update_timesheet_submissions_updated_at 
  BEFORE UPDATE ON timesheet_submissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timesheet_entries_updated_at 
  BEFORE UPDATE ON timesheet_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE timesheet_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timesheet_submissions
CREATE POLICY "Users can view their own timesheet submissions" ON timesheet_submissions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own timesheet submissions" ON timesheet_submissions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own draft timesheet submissions" ON timesheet_submissions
  FOR UPDATE USING (user_id = auth.uid() AND status = 'draft');

-- Managers/admins can view and approve all submissions in their organization
CREATE POLICY "Managers can view organization timesheet submissions" ON timesheet_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
        AND om.organization_id = timesheet_submissions.organization_id
        AND r.name IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers can approve timesheet submissions" ON timesheet_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
        AND om.organization_id = timesheet_submissions.organization_id
        AND r.name IN ('admin', 'manager')
    )
  );

-- RLS Policies for timesheet_entries
CREATE POLICY "Users can manage entries for their own submissions" ON timesheet_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM timesheet_submissions ts
      WHERE ts.id = timesheet_entries.timesheet_submission_id
        AND ts.user_id = auth.uid()
        AND ts.status = 'draft'
    )
  );

CREATE POLICY "Managers can view entries for organization submissions" ON timesheet_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM timesheet_submissions ts
      JOIN organization_members om ON om.user_id = auth.uid()
      JOIN roles r ON om.role_id = r.id
      WHERE ts.id = timesheet_entries.timesheet_submission_id
        AND ts.organization_id = om.organization_id
        AND r.name IN ('admin', 'manager')
    )
  );

-- Add permissions for timesheet management
INSERT INTO permissions (name, display_name, description, module, action) VALUES
  ('timesheets.create', 'Create Timesheets', 'Can create and edit timesheet entries', 'timesheets', 'create'),
  ('timesheets.read', 'View Timesheets', 'Can view timesheet entries', 'timesheets', 'read'),
  ('timesheets.update', 'Update Timesheets', 'Can edit timesheet entries', 'timesheets', 'update'),
  ('timesheets.manage', 'Manage Timesheets', 'Can fully manage timesheet workflow', 'timesheets', 'manage'),
  ('timesheets.approve', 'Approve Timesheets', 'Can approve or reject timesheet submissions', 'timesheets', 'approve')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions to existing roles
-- Admin role gets all timesheet permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
  AND p.name IN ('timesheets.create', 'timesheets.read', 'timesheets.update', 'timesheets.manage', 'timesheets.approve')
ON CONFLICT DO NOTHING;

-- Manager role gets read, update, and approve permissions  
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' 
  AND p.name IN ('timesheets.read', 'timesheets.update', 'timesheets.approve')
ON CONFLICT DO NOTHING;

-- Member role gets create, read, and update permissions (can create/edit draft, cannot approve)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'member' 
  AND p.name IN ('timesheets.create', 'timesheets.read', 'timesheets.update')
ON CONFLICT DO NOTHING;