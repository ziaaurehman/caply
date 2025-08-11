-- Migration: Capacity planning rework – switch to org members + assignments
-- Notes:
-- - Drops legacy capacity objects (capacity_settings, member_capacity, capacity_history,
--   trigger/function create_default_member_capacity) if present
-- - Recreates schema using:
--   resource_allocations (one row per organization_member participating in capacity planning)
--   project_assignments  (hours per week for a resource on a project, with dates)
--   weekly_capacity_overrides (vacations/part-time etc.)
--   project_tasks (lightweight tasks aggregation for capacity view)

-- SAFETY: Wrap in a transaction
BEGIN;

-- 1) Drop trigger and function that auto-created member capacity on project_members insert
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_create_member_capacity') THEN
    EXECUTE 'DROP TRIGGER trigger_create_member_capacity ON project_members';
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- ignore
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_default_member_capacity'
  ) THEN
    EXECUTE 'DROP FUNCTION create_default_member_capacity()';
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- ignore
END$$;

-- 2) Drop legacy tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'capacity_history') THEN
    EXECUTE 'DROP TABLE capacity_history CASCADE';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_capacity') THEN
    EXECUTE 'DROP TABLE member_capacity CASCADE';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'capacity_settings') THEN
    EXECUTE 'DROP TABLE capacity_settings CASCADE';
  END IF;
  -- Replace previous resource_allocations structure
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resource_allocations') THEN
    EXECUTE 'DROP TABLE resource_allocations CASCADE';
  END IF;
END$$;

-- 3) New tables (PostgreSQL + UUID IDs)

-- resource_allocations: one per org member participating in capacity planning
CREATE TABLE resource_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  organization_member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  weekly_capacity_hours NUMERIC(5,2) DEFAULT 40.00 CHECK (weekly_capacity_hours >= 0),
  hourly_rate NUMERIC(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, organization_member_id)
);

CREATE INDEX idx_resource_allocations_org_active ON resource_allocations(organization_id, is_active);

-- project_assignments: hours per week on a project
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_allocation_id UUID NOT NULL REFERENCES resource_allocations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  hours_per_week NUMERIC(5,2) NOT NULL CHECK (hours_per_week >= 0),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_assignments_resource_project ON project_assignments(resource_allocation_id, project_id);
CREATE INDEX idx_project_assignments_project_dates ON project_assignments(project_id, start_date, end_date);
CREATE INDEX idx_project_assignments_active ON project_assignments(is_active);

-- weekly_capacity_overrides
CREATE TABLE weekly_capacity_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_allocation_id UUID NOT NULL REFERENCES resource_allocations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  override_hours NUMERIC(5,2) NOT NULL CHECK (override_hours >= 0),
  reason VARCHAR(200),
  override_type TEXT NOT NULL DEFAULT 'vacation',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (resource_allocation_id, year, week_number),
  CHECK (override_type IN ('vacation','sick_leave','part_time','overtime','holiday','training'))
);

-- project_tasks (lightweight, for capacity popup). We keep it optional and independent from existing tasks.
CREATE TABLE project_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  resource_allocation_id UUID NOT NULL REFERENCES resource_allocations(id) ON DELETE CASCADE,
  task_name VARCHAR(200) NOT NULL,
  estimated_hours NUMERIC(6,2) NOT NULL CHECK (estimated_hours >= 0),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  week_assigned INTEGER,
  year_assigned INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_tasks_project_resource ON project_tasks(project_id, resource_allocation_id);
CREATE INDEX idx_project_tasks_week ON project_tasks(year_assigned, week_assigned);

-- 4) RLS – enable and create permissive policies scoped by organization
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_capacity_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Helper: membership organization ids for current auth uid()
-- Policies are similar to existing ones elsewhere in the repo
CREATE POLICY "org members can select resource_allocations" ON resource_allocations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "org members can manage resource_allocations" ON resource_allocations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
    )
  ) WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "org members can select project_assignments" ON project_assignments
  FOR SELECT USING (
    resource_allocation_id IN (
      SELECT id FROM resource_allocations WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "org members can manage project_assignments" ON project_assignments
  FOR ALL USING (
    resource_allocation_id IN (
      SELECT id FROM resource_allocations WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  ) WITH CHECK (
    resource_allocation_id IN (
      SELECT id FROM resource_allocations WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "org members can select weekly_capacity_overrides" ON weekly_capacity_overrides
  FOR SELECT USING (
    resource_allocation_id IN (
      SELECT id FROM resource_allocations WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "org members can manage weekly_capacity_overrides" ON weekly_capacity_overrides
  FOR ALL USING (
    resource_allocation_id IN (
      SELECT id FROM resource_allocations WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  ) WITH CHECK (
    resource_allocation_id IN (
      SELECT id FROM resource_allocations WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "org members can select project_tasks" ON project_tasks
  FOR SELECT USING (
    resource_allocation_id IN (
      SELECT id FROM resource_allocations WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "org members can manage project_tasks" ON project_tasks
  FOR ALL USING (
    resource_allocation_id IN (
      SELECT id FROM resource_allocations WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  ) WITH CHECK (
    resource_allocation_id IN (
      SELECT id FROM resource_allocations WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

COMMIT;


