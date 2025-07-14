-- Migration: Add project_members table and update projects table
-- This migration creates a proper relational table for project members instead of using arrays

-- Create project_members table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(100), -- Project-specific role (optional)
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, organization_member_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_org_member ON project_members(organization_member_id);
CREATE INDEX IF NOT EXISTS idx_project_members_added_by ON project_members(added_by);

-- Add documents column to projects table (from the provided schema)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';

-- Add updated_at trigger for project_members
CREATE TRIGGER update_project_members_updated_at 
  BEFORE UPDATE ON project_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for clarity
COMMENT ON TABLE project_members IS 'Members assigned to specific projects with their roles and join information';
COMMENT ON COLUMN project_members.organization_member_id IS 'References organization_members.id - the actual member of the organization';
COMMENT ON COLUMN project_members.role IS 'Optional project-specific role (e.g., "Developer", "Designer", "Lead")';
COMMENT ON COLUMN project_members.added_by IS 'User who added this member to the project';
COMMENT ON COLUMN projects.documents IS 'Array of document objects for the project';

-- Enable RLS on project_members table
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_members
CREATE POLICY "Organization members can view project members" ON project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_members.project_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Organization members can add project members" ON project_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_members.project_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Organization members can update project members" ON project_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_members.project_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Organization members can delete project members" ON project_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_members.project_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Support admins can view all project members
CREATE POLICY "Support admins can view all project members" ON project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
      AND r.name = 'support_admin'
      AND om.status = 'active'
    )
  ); 