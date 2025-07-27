-- Migration: Add Role and Permission Management Permissions
-- This migration adds missing permissions for role and permission management

-- =====================================================
-- ADD MISSING PERMISSIONS
-- =====================================================

-- Insert role management permissions
INSERT INTO permissions (name, display_name, description, module, action) VALUES
  -- Role management
  ('roles.create', 'Create Roles', 'Can create new roles', 'roles', 'create'),
  ('roles.read', 'View Roles', 'Can view roles and their permissions', 'roles', 'read'),
  ('roles.update', 'Update Roles', 'Can update role details and permissions', 'roles', 'update'),
  ('roles.delete', 'Delete Roles', 'Can delete roles', 'roles', 'delete'),
  
  -- Permission management
  ('permissions.read', 'View Permissions', 'Can view available permissions', 'permissions', 'read'),
  ('permissions.manage', 'Manage Permissions', 'Can assign/remove permissions from roles', 'permissions', 'manage'),
  
  -- Team management (was missing)
  ('teams.create', 'Create Teams', 'Can create new teams', 'teams', 'create'),
  ('teams.read', 'View Teams', 'Can view team information', 'teams', 'read'),
  ('teams.update', 'Update Teams', 'Can update team details', 'teams', 'update'),
  ('teams.delete', 'Delete Teams', 'Can delete teams', 'teams', 'delete'),
  
  -- Invitation management
  ('invitations.create', 'Send Invitations', 'Can invite users to organization', 'invitations', 'create'),
  ('invitations.read', 'View Invitations', 'Can view pending invitations', 'invitations', 'read'),
  ('invitations.delete', 'Cancel Invitations', 'Can cancel pending invitations', 'invitations', 'delete'),
  
  -- Capacity planning permissions
  ('capacity.read', 'View Capacity', 'Can view capacity planning information', 'capacity', 'read'),
  ('capacity.manage', 'Manage Capacity', 'Can manage team capacity and allocations', 'capacity', 'manage')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- UPDATE ORGANIZATION-SPECIFIC ROLE PERMISSIONS
-- =====================================================

-- Add role management permissions to organization admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'admin' 
AND r.is_system_role = false
AND r.organization_id IS NOT NULL
AND p.name IN (
  'roles.create', 'roles.read', 'roles.update', 'roles.delete',
  'permissions.read', 'permissions.manage',
  'teams.create', 'teams.read', 'teams.update', 'teams.delete',
  'invitations.create', 'invitations.read', 'invitations.delete',
  'capacity.read', 'capacity.manage'
)
ON CONFLICT DO NOTHING;

-- Add limited role viewing permissions to organization manager roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'manager' 
AND r.is_system_role = false
AND r.organization_id IS NOT NULL
AND p.name IN (
  'roles.read',
  'permissions.read',
  'teams.read', 'teams.update',
  'invitations.read',
  'capacity.read', 'capacity.manage'
)
ON CONFLICT DO NOTHING;

-- Add basic team and capacity viewing to organization member roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'member' 
AND r.is_system_role = false
AND r.organization_id IS NOT NULL
AND p.name IN (
  'teams.read',
  'capacity.read'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- UPDATE SYSTEM ROLES (ONLY IF THEY EXIST)
-- =====================================================

-- Add permissions to system roles only if they exist
DO $$
DECLARE
  superadmin_id UUID;
  support_admin_id UUID;
  global_admin_id UUID;
  global_manager_id UUID;
BEGIN
  -- Check if system roles exist and get their IDs
  SELECT id INTO superadmin_id FROM roles WHERE name = 'superadmin' AND is_system_role = true LIMIT 1;
  SELECT id INTO support_admin_id FROM roles WHERE name = 'support_admin' AND is_system_role = true LIMIT 1;
  SELECT id INTO global_admin_id FROM roles WHERE name = 'admin' AND is_system_role = true LIMIT 1;
  SELECT id INTO global_manager_id FROM roles WHERE name = 'manager' AND is_system_role = true LIMIT 1;

  -- Super Admin gets all new permissions (if exists)
  IF superadmin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT superadmin_id, id 
    FROM permissions 
    WHERE name IN (
      'roles.create', 'roles.read', 'roles.update', 'roles.delete',
      'permissions.read', 'permissions.manage',
      'teams.create', 'teams.read', 'teams.update', 'teams.delete',
      'invitations.create', 'invitations.read', 'invitations.delete',
      'capacity.read', 'capacity.manage'
    )
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Added permissions to superadmin role';
  END IF;

  -- Support Admin gets read permissions (if exists)
  IF support_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT support_admin_id, id 
    FROM permissions 
    WHERE name IN (
      'roles.read', 'permissions.read', 'teams.read', 'invitations.read', 'capacity.read'
    )
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Added permissions to support_admin role';
  END IF;

  -- Global Admin gets full access except global permissions (if exists)
  IF global_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT global_admin_id, id 
    FROM permissions 
    WHERE name IN (
      'roles.create', 'roles.read', 'roles.update', 'roles.delete',
      'permissions.read', 'permissions.manage',
      'teams.create', 'teams.read', 'teams.update', 'teams.delete',
      'invitations.create', 'invitations.read', 'invitations.delete',
      'capacity.read', 'capacity.manage'
    )
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Added permissions to global admin role';
  END IF;

  -- Global Manager gets management permissions (if exists)
  IF global_manager_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT global_manager_id, id 
    FROM permissions 
    WHERE name IN (
      'roles.read', 'permissions.read', 'teams.read', 'teams.update',
      'invitations.read', 'capacity.read', 'capacity.manage'
    )
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Added permissions to global manager role';
  END IF;

  -- Log what was found
  RAISE NOTICE 'System roles status: superadmin=%, support_admin=%, global_admin=%, global_manager=%', 
    CASE WHEN superadmin_id IS NOT NULL THEN 'EXISTS' ELSE 'NOT FOUND' END,
    CASE WHEN support_admin_id IS NOT NULL THEN 'EXISTS' ELSE 'NOT FOUND' END,
    CASE WHEN global_admin_id IS NOT NULL THEN 'EXISTS' ELSE 'NOT FOUND' END,
    CASE WHEN global_manager_id IS NOT NULL THEN 'EXISTS' ELSE 'NOT FOUND' END;

END $$;

-- =====================================================
-- ADD COMMENTS
-- =====================================================

COMMENT ON TABLE permissions IS 'System permissions that can be assigned to roles for fine-grained access control';
COMMENT ON TABLE role_permissions IS 'Junction table linking roles to their assigned permissions';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Log the total number of permissions now available
DO $$
DECLARE
  total_permissions INTEGER;
  total_modules INTEGER;
  org_admin_roles INTEGER;
  permissions_assigned INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_permissions FROM permissions;
  SELECT COUNT(DISTINCT module) INTO total_modules FROM permissions;
  SELECT COUNT(*) INTO org_admin_roles FROM roles WHERE name = 'admin' AND is_system_role = false;
  
  SELECT COUNT(*) INTO permissions_assigned 
  FROM role_permissions rp 
  JOIN roles r ON rp.role_id = r.id 
  WHERE r.name = 'admin' AND r.is_system_role = false;
  
  RAISE NOTICE 'Migration complete. Total permissions: %, Total modules: %, Organization admin roles: %, Permissions assigned to org admins: %', 
    total_permissions, total_modules, org_admin_roles, permissions_assigned;
END $$;
