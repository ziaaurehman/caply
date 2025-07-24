-- Migration: Create capacity planning system
-- This includes resource allocations, project members capacity tracking, and team capacity management

-- Create resource_allocations table for tracking capacity per project per member
CREATE TABLE resource_allocations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_member_id UUID NOT NULL REFERENCES project_members(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  allocated_hours_per_week DECIMAL(5,2) DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  role VARCHAR(100), -- e.g., 'Frontend Developer', 'Project Manager', 'Designer'
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_hours_per_week CHECK (allocated_hours_per_week >= 0 AND allocated_hours_per_week <= 168),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date),
  UNIQUE(project_id, project_member_id, start_date)
);

-- Create capacity_settings table for organization-wide capacity configuration
CREATE TABLE capacity_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  default_work_hours_per_week DECIMAL(5,2) DEFAULT 40,
  default_work_days_per_week INTEGER DEFAULT 5,
  capacity_planning_enabled BOOLEAN DEFAULT TRUE,
  allow_overallocation BOOLEAN DEFAULT FALSE,
  overallocation_threshold_percent INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_work_hours CHECK (default_work_hours_per_week > 0 AND default_work_hours_per_week <= 168),
  CONSTRAINT valid_work_days CHECK (default_work_days_per_week > 0 AND default_work_days_per_week <= 7),
  CONSTRAINT valid_threshold CHECK (overallocation_threshold_percent > 0 AND overallocation_threshold_percent <= 500)
);

-- Create member_capacity table for individual member capacity configuration
CREATE TABLE member_capacity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_member_id UUID NOT NULL REFERENCES project_members(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  weekly_capacity_hours DECIMAL(5,2) DEFAULT 40,
  work_days_per_week INTEGER DEFAULT 5,
  availability_start_date DATE,
  availability_end_date DATE,
  time_zone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_capacity_hours CHECK (weekly_capacity_hours > 0 AND weekly_capacity_hours <= 168),
  CONSTRAINT valid_capacity_days CHECK (work_days_per_week > 0 AND work_days_per_week <= 7),
  CONSTRAINT valid_availability_range CHECK (availability_end_date IS NULL OR availability_end_date >= availability_start_date)
);

-- Create capacity_history table for tracking capacity changes over time
CREATE TABLE capacity_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resource_allocation_id UUID NOT NULL REFERENCES resource_allocations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  previous_hours DECIMAL(5,2),
  new_hours DECIMAL(5,2),
  change_reason VARCHAR(255),
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_resource_allocations_project ON resource_allocations(project_id);
CREATE INDEX idx_resource_allocations_member ON resource_allocations(project_member_id);
CREATE INDEX idx_resource_allocations_org ON resource_allocations(organization_id);
CREATE INDEX idx_resource_allocations_dates ON resource_allocations(start_date, end_date);
CREATE INDEX idx_resource_allocations_active ON resource_allocations(is_active);

CREATE INDEX idx_member_capacity_org ON member_capacity(organization_id);
CREATE INDEX idx_member_capacity_member ON member_capacity(project_member_id);
CREATE INDEX idx_member_capacity_active ON member_capacity(is_active);

CREATE INDEX idx_capacity_history_allocation ON capacity_history(resource_allocation_id);
CREATE INDEX idx_capacity_history_org ON capacity_history(organization_id);
CREATE INDEX idx_capacity_history_date ON capacity_history(changed_at);

-- Create RLS policies for resource_allocations
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view allocations for their organization" ON resource_allocations
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users can insert allocations for their organization" ON resource_allocations
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users can update allocations for their organization" ON resource_allocations
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users can delete allocations for their organization" ON resource_allocations
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Create RLS policies for capacity_settings
ALTER TABLE capacity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view capacity settings for their organization" ON capacity_settings
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Organization owners can manage capacity settings" ON capacity_settings
FOR ALL USING (
  organization_id IN (
    SELECT o.id FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    JOIN roles r ON om.role_id = r.id
    WHERE om.user_id = auth.uid() AND r.name = 'admin' AND om.status = 'active'
  )
);

-- Create RLS policies for member_capacity
ALTER TABLE member_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view member capacity for their organization" ON member_capacity
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users can manage their own capacity" ON member_capacity
FOR ALL USING (
  project_member_id IN (
    SELECT pm.id FROM project_members pm
    JOIN organization_members om ON pm.organization_member_id = om.id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

CREATE POLICY "Organization owners can manage all member capacity" ON member_capacity
FOR ALL USING (
  organization_id IN (
    SELECT o.id FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    JOIN roles r ON om.role_id = r.id
    WHERE om.user_id = auth.uid() AND r.name = 'admin' AND om.status = 'active'
  )
);

-- Create RLS policies for capacity_history
ALTER TABLE capacity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view capacity history for their organization" ON capacity_history
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users can insert capacity history for their organization" ON capacity_history
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Comments for documentation
COMMENT ON TABLE resource_allocations IS 'Track resource allocation for projects - how many hours each team member is allocated to each project';
COMMENT ON TABLE capacity_settings IS 'Organization-wide capacity planning configuration and settings';
COMMENT ON TABLE member_capacity IS 'Individual team member capacity configuration and availability';
COMMENT ON TABLE capacity_history IS 'Historical tracking of capacity allocation changes for audit purposes';

-- Function to automatically create member capacity when project member is added
CREATE OR REPLACE FUNCTION create_default_member_capacity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO member_capacity (
    project_member_id,
    organization_id,
    weekly_capacity_hours,
    work_days_per_week,
    is_active
  ) 
  SELECT 
    NEW.id,
    p.organization_id,
    40,
    5,
    true
  FROM projects p 
  WHERE p.id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic member capacity creation
CREATE TRIGGER trigger_create_member_capacity
AFTER INSERT ON project_members
FOR EACH ROW
EXECUTE FUNCTION create_default_member_capacity();

-- Function to automatically create capacity settings when organization is created
CREATE OR REPLACE FUNCTION create_default_capacity_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO capacity_settings (
    organization_id,
    default_work_hours_per_week,
    default_work_days_per_week,
    capacity_planning_enabled,
    allow_overallocation,
    overallocation_threshold_percent
  ) VALUES (
    NEW.id,
    40,
    5,
    true,
    false,
    100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic capacity settings creation
CREATE TRIGGER trigger_create_capacity_settings
AFTER INSERT ON organizations
FOR EACH ROW
EXECUTE FUNCTION create_default_capacity_settings();
