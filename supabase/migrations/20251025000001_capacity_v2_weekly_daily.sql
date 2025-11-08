-- Capacity v2: Weekly + Daily per-project allocations with default vs actual semantics
-- - Adds per-week plans per (resource_allocation, project)
-- - Adds per-day overrides with opt-in weekends
-- - Persists assignment-level defaults: hours_per_day and allow_weekends

BEGIN;

-- 0) Utility: ensure we have the standard updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) Extend project_assignments with per-day default + weekends flag
ALTER TABLE project_assignments
  ADD COLUMN IF NOT EXISTS default_hours_per_day NUMERIC(4,2) NOT NULL DEFAULT 8.00 CHECK (default_hours_per_day >= 0),
  ADD COLUMN IF NOT EXISTS allow_weekends BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Weekly plan table per resource+project+week (captures weekly default from assignment)
CREATE TABLE IF NOT EXISTS project_weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_allocation_id UUID NOT NULL REFERENCES resource_allocations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_assignment_id UUID NOT NULL REFERENCES project_assignments(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL, -- ISO week Monday
  default_hours_per_day NUMERIC(4,2) NOT NULL CHECK (default_hours_per_day >= 0),
  allow_weekends BOOLEAN NOT NULL DEFAULT FALSE,
  is_linked BOOLEAN NOT NULL DEFAULT TRUE, -- UI: if linked, editing a day updates weekly default
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resource_allocation_id, project_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_pwp_org_project_week ON project_weekly_plans(organization_id, project_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_pwp_resource_week ON project_weekly_plans(resource_allocation_id, week_start_date);

CREATE TRIGGER trg_pwp_updated_at
BEFORE UPDATE ON project_weekly_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3) Daily overrides per weekly plan + day_of_week (1=Mon ... 7=Sun)
CREATE TABLE IF NOT EXISTS project_daily_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  weekly_plan_id UUID NOT NULL REFERENCES project_weekly_plans(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  actual_hours NUMERIC(4,2) NOT NULL CHECK (actual_hours >= 0),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (weekly_plan_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_pdo_org_weekly ON project_daily_overrides(organization_id, weekly_plan_id);

CREATE TRIGGER trg_pdo_updated_at
BEFORE UPDATE ON project_daily_overrides
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4) RLS: scope to user's organizations (mirrors existing capacity policies)
ALTER TABLE project_weekly_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_daily_overrides DISABLE ROW LEVEL SECURITY;

-- 5) Helper: ISO week Monday start
CREATE OR REPLACE FUNCTION week_monday_start(d DATE)
RETURNS DATE AS $$
BEGIN
  RETURN date_trunc('week', d)::date; -- ISO: Monday
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6) Seeder/maintainer: upsert weekly plans for an assignment
CREATE OR REPLACE FUNCTION seed_project_weekly_plans_for_assignment(p_assignment_id UUID)
RETURNS VOID AS $$
DECLARE
  a RECORD;
  v_org_id UUID;
  v_start DATE;
  v_end DATE;
  ws DATE;
BEGIN
  SELECT pa.id,
         pa.resource_allocation_id,
         pa.project_id,
         pa.hours_per_week,
         pa.start_date,
         pa.end_date,
         pa.default_hours_per_day,
         pa.allow_weekends,
         pa.is_active,
         ra.organization_id
    INTO a
  FROM project_assignments pa
  JOIN resource_allocations ra ON ra.id = pa.resource_allocation_id
  WHERE pa.id = p_assignment_id;

  IF a.id IS NULL OR a.is_active IS NOT TRUE THEN
    RETURN; -- nothing to seed
  END IF;

  v_org_id := a.organization_id;
  v_start := week_monday_start(a.start_date);
  IF a.end_date IS NULL THEN
    v_end := week_monday_start(a.start_date + INTERVAL '52 weeks');
  ELSE
    v_end := week_monday_start(a.end_date);
  END IF;

  FOR ws IN SELECT generate_series(v_start, v_end, INTERVAL '1 week')::date LOOP
    INSERT INTO project_weekly_plans (
      organization_id,
      resource_allocation_id,
      project_id,
      project_assignment_id,
      week_start_date,
      default_hours_per_day,
      allow_weekends
    ) VALUES (
      v_org_id,
      a.resource_allocation_id,
      a.project_id,
      a.id,
      ws,
      a.default_hours_per_day,
      a.allow_weekends
    )
    ON CONFLICT (resource_allocation_id, project_id, week_start_date)
    DO UPDATE SET
      default_hours_per_day = EXCLUDED.default_hours_per_day,
      allow_weekends = EXCLUDED.allow_weekends,
      project_assignment_id = EXCLUDED.project_assignment_id,
      updated_at = NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM project_daily_overrides d
      WHERE d.weekly_plan_id = project_weekly_plans.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7) Triggers on project_assignments to seed plans
-- DROP TRIGGER IF EXISTS trg_seed_pwp_on_pa_insert ON project_assignments;
-- CREATE TRIGGER trg_seed_pwp_on_pa_insert
-- AFTER INSERT ON project_assignments
-- FOR EACH ROW
-- WHEN (NEW.is_active = TRUE)
-- EXECUTE FUNCTION seed_project_weekly_plans_for_assignment(NEW.id);

-- DROP TRIGGER IF EXISTS trg_seed_pwp_on_pa_update ON project_assignments;
-- CREATE TRIGGER trg_seed_pwp_on_pa_update
-- AFTER UPDATE OF default_hours_per_day, start_date, end_date, allow_weekends, is_active ON project_assignments
-- FOR EACH ROW
-- WHEN (NEW.is_active = TRUE)
-- EXECUTE FUNCTION seed_project_weekly_plans_for_assignment(NEW.id);

-- 8) Backfill existing active assignments (52 weeks window for open-ended)
-- DO $$
-- BEGIN
--   PERFORM seed_project_weekly_plans_for_assignment(pa.id)
--   FROM project_assignments pa
--   WHERE pa.is_active = TRUE;
-- END$$;

-- COMMIT;


