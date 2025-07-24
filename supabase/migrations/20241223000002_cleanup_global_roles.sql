-- Migration: Cleanup Global Roles After Organization-Specific Migration
-- This migration safely removes old global roles after ensuring all references are updated

-- =====================================================
-- VERIFY ALL REFERENCES ARE UPDATED
-- =====================================================

-- Check if there are any remaining references to old global roles
DO $$
DECLARE
  remaining_refs INTEGER;
BEGIN
  -- Check organization_members
  SELECT COUNT(*) INTO remaining_refs
  FROM organization_members om
  JOIN roles r ON om.role_id = r.id
  WHERE r.is_system_role = false AND r.organization_id IS NULL;
  
  IF remaining_refs > 0 THEN
    RAISE NOTICE 'Found % remaining references in organization_members', remaining_refs;
  END IF;

  -- Check organization_invitations  
  SELECT COUNT(*) INTO remaining_refs
  FROM organization_invitations oi
  JOIN roles r ON oi.role_id = r.id
  WHERE r.is_system_role = false AND r.organization_id IS NULL;
  
  IF remaining_refs > 0 THEN
    RAISE NOTICE 'Found % remaining references in organization_invitations', remaining_refs;
  END IF;
END $$;

-- =====================================================
-- UPDATE ANY REMAINING REFERENCES
-- =====================================================

-- Update any remaining organization invitations
DO $$
DECLARE
  invitation_record RECORD;
  new_role_id UUID;
BEGIN
  FOR invitation_record IN 
    SELECT oi.id, oi.organization_id, r.name as role_name, r.id as old_role_id
    FROM organization_invitations oi
    JOIN roles r ON oi.role_id = r.id
    WHERE r.is_system_role = false
    AND r.organization_id IS NULL
  LOOP
    -- Find the corresponding organization-specific role
    SELECT id INTO new_role_id
    FROM roles
    WHERE name = invitation_record.role_name
    AND organization_id = invitation_record.organization_id
    AND is_system_role = false;

    -- Update the invitation to use the new role
    IF new_role_id IS NOT NULL THEN
      UPDATE organization_invitations
      SET role_id = new_role_id
      WHERE id = invitation_record.id;
      
      RAISE NOTICE 'Updated invitation % from role % to %', 
        invitation_record.id, invitation_record.old_role_id, new_role_id;
    ELSE
      RAISE WARNING 'Could not find organization-specific role % for organization %', 
        invitation_record.role_name, invitation_record.organization_id;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- SAFE CLEANUP OF OLD GLOBAL ROLES
-- =====================================================

-- Remove role permissions first
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM role_permissions 
  WHERE role_id IN (
    SELECT id FROM roles 
    WHERE is_system_role = false 
    AND organization_id IS NULL
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % role permissions for old global roles', deleted_count;
END $$;

-- Remove the old global non-system roles
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM roles 
  WHERE is_system_role = false 
  AND organization_id IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % old global roles', deleted_count;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify cleanup was successful
DO $$
DECLARE
  remaining_roles INTEGER;
  total_org_roles INTEGER;
  total_orgs INTEGER;
BEGIN
  -- Check for any remaining old global roles
  SELECT COUNT(*) INTO remaining_roles
  FROM roles 
  WHERE is_system_role = false AND organization_id IS NULL;
  
  -- Count organization-specific roles
  SELECT COUNT(*) INTO total_org_roles
  FROM roles 
  WHERE organization_id IS NOT NULL;
  
  -- Count organizations
  SELECT COUNT(*) INTO total_orgs
  FROM organizations;
  
  RAISE NOTICE 'Cleanup complete. Remaining old global roles: %, Organization-specific roles: %, Organizations: %', 
    remaining_roles, total_org_roles, total_orgs;
    
  -- We expect 3 roles per organization (admin, manager, member)
  IF total_org_roles < total_orgs * 3 THEN
    RAISE WARNING 'Expected at least % organization roles but found %', total_orgs * 3, total_org_roles;
  END IF;
END $$;
