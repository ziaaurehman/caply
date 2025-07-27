-- Migration: Remove signup-related functions and triggers
-- Remove the automatic signup handling to move logic to API

-- =====================================================
-- REMOVE SIGNUP TRIGGER AND FUNCTION
-- =====================================================

-- Drop the trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the signup function
DROP FUNCTION IF EXISTS handle_new_user_signup();

-- Drop the test organization roles creation function if it exists
DROP FUNCTION IF EXISTS test_organization_roles_creation();

-- =====================================================
-- KEEP ALL OTHER FUNCTIONS AND STRUCTURES INTACT
-- =====================================================

-- The following functions and structures remain unchanged:
-- - create_default_organization_roles() function
-- - All tables and their structures
-- - All RLS policies
-- - All other triggers (updated_at triggers, etc.)
-- - All permissions and role assignments
-- - All helper functions (user_has_permission, etc.)

-- =====================================================
-- ADD COMMENT FOR CLARITY
-- =====================================================

COMMENT ON SCHEMA public IS 'Signup trigger removed - signup logic moved to API endpoint';
