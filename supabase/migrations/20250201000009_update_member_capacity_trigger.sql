-- Migration: Update member capacity trigger to respect project capacity flag
-- and use organization defaults from capacity_settings

-- Safe redefinition of function used by trigger_create_member_capacity
CREATE OR REPLACE FUNCTION create_default_member_capacity()
RETURNS TRIGGER AS $$
DECLARE
  project_record RECORD;
  defaults RECORD;
BEGIN
  -- Fetch project org and capacity flag
  SELECT p.organization_id, p.capacity_planning_enabled INTO project_record
  FROM projects p 
  WHERE p.id = NEW.project_id;

  -- Respect project capacity flag
  IF project_record.capacity_planning_enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Pull org defaults; fallback to 40/5 when missing
  SELECT 
    cs.default_work_hours_per_week AS weekly_hours,
    cs.default_work_days_per_week AS work_days
  INTO defaults
  FROM capacity_settings cs
  WHERE cs.organization_id = project_record.organization_id
  LIMIT 1;

  INSERT INTO member_capacity (
    project_member_id,
    organization_id,
    weekly_capacity_hours,
    work_days_per_week,
    is_active
  ) VALUES (
    NEW.id,
    project_record.organization_id,
    COALESCE(defaults.weekly_hours, 40),
    COALESCE(defaults.work_days, 5),
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: trigger_create_member_capacity already exists and references the function name above,
-- so no trigger recreation is necessary.


