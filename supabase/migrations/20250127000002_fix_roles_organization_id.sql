-- Migration: Add organization_id column to roles table if it doesn't exist
-- This ensures the roles table has the organization_id column needed for organization-specific roles

-- =====================================================
-- ADD ORGANIZATION_ID COLUMN TO ROLES TABLE
-- =====================================================

-- Add organization_id column if it doesn't exist
DO $$
BEGIN
  -- Check if organization_id column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'roles' 
    AND column_name = 'organization_id' 
    AND table_schema = 'public'
  ) THEN
    -- Add the column
    ALTER TABLE roles 
    ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added organization_id column to roles table';
  ELSE
    RAISE NOTICE 'organization_id column already exists in roles table';
  END IF;
END $$;

-- =====================================================
-- UPDATE UNIQUE CONSTRAINTS FOR ORGANIZATION-SPECIFIC ROLES
-- =====================================================

-- Drop existing unique constraint on name if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'roles_name_key' 
    AND table_name = 'roles'
  ) THEN
    ALTER TABLE roles DROP CONSTRAINT roles_name_key;
    RAISE NOTICE 'Dropped existing roles_name_key constraint';
  END IF;
END $$;

-- Create unique indexes for organization-specific roles
-- System roles (is_system_role = true) remain globally unique
-- Organization roles (organization_id IS NOT NULL) are unique within organization

DO $$
BEGIN
  -- Create unique constraint for organization-specific roles
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'roles_org_name_unique'
  ) THEN
    CREATE UNIQUE INDEX roles_org_name_unique 
    ON roles (organization_id, name) 
    WHERE organization_id IS NOT NULL;
    
    RAISE NOTICE 'Created unique index for organization-specific roles';
  END IF;

  -- Create unique constraint for system roles
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'roles_system_name_unique'
  ) THEN
    CREATE UNIQUE INDEX roles_system_name_unique 
    ON roles (name) 
    WHERE is_system_role = true AND organization_id IS NULL;
    
    RAISE NOTICE 'Created unique index for system roles';
  END IF;
END $$;

-- =====================================================
-- ENSURE SYSTEM ROLES HAVE NULL ORGANIZATION_ID
-- =====================================================

-- Update existing system roles to have organization_id = NULL
UPDATE roles 
SET organization_id = NULL 
WHERE is_system_role = true;

-- =====================================================
-- VERIFY THE CHANGES
-- =====================================================

-- Check if organization_id column exists and show structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'roles' 
  AND table_schema = 'public'
  AND column_name = 'organization_id';

-- Show unique constraints/indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'roles' 
  AND (indexname LIKE '%unique%' OR indexname LIKE '%name%');

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📋 Changes made:';
  RAISE NOTICE '   - Added organization_id column to roles table (if missing)';
  RAISE NOTICE '   - Updated unique constraints for organization-specific roles';
  RAISE NOTICE '   - System roles now have organization_id = NULL';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 The signup API should now work correctly!';
END $$;
