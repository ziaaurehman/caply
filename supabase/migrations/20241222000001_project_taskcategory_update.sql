-- Migration: Update projects table for new project creation requirements (task_categories as array, team_member_ids nullable, draft/publish state)

-- Drop old projects table (if you want to preserve data, use ALTER TABLE instead)
DROP TABLE IF EXISTS projects CASCADE;

-- Create new projects table
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  project_type VARCHAR(50) DEFAULT 'time_materials', -- time_materials, fixed_fee, non_billable
  billing_rate DECIMAL(10,2),
  budget_hours INTEGER,
  budget_amount DECIMAL(12,2),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- active, on_hold, completed, cancelled
  team_member_ids UUID[], -- Array of organization_member IDs (nullable)
  task_categories TEXT[], -- Array of task category names
  kanban_enabled BOOLEAN DEFAULT TRUE,
  timesheet_enabled BOOLEAN DEFAULT TRUE,
  team_availability_enabled BOOLEAN DEFAULT TRUE,
  capacity_planning_enabled BOOLEAN DEFAULT TRUE,
  state VARCHAR(20) DEFAULT 'draft', -- draft, published
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for projects
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_state ON projects(state);

-- Comments for clarity
COMMENT ON COLUMN projects.team_member_ids IS 'Array of organization_member IDs assigned to this project (nullable)';
COMMENT ON COLUMN projects.task_categories IS 'Array of task category names for this project';
COMMENT ON COLUMN projects.kanban_enabled IS 'Enable Kanban board for this project';
COMMENT ON COLUMN projects.timesheet_enabled IS 'Enable timesheet/time tracking for this project';
COMMENT ON COLUMN projects.team_availability_enabled IS 'Enable team availability integration for this project';
COMMENT ON COLUMN projects.capacity_planning_enabled IS 'Enable capacity planning for this project';
COMMENT ON COLUMN projects.state IS 'Project state: draft or published'; 