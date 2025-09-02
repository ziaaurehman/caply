-- Migration to remove capacity planning functions and triggers
-- Remove triggers first (they depend on the functions)
DROP TRIGGER IF EXISTS trigger_create_member_capacity ON project_members;
DROP TRIGGER IF EXISTS trigger_create_capacity_settings ON organizations;

-- Remove the functions
DROP FUNCTION IF EXISTS create_default_member_capacity();
DROP FUNCTION IF EXISTS create_default_capacity_settings();
