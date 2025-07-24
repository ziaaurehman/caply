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
-- UPDATE ROLE PERMISSIONS
-- =====================================================

-- Add role management permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'admin' 
AND r.is_system_role = false
AND p.name IN (
  'roles.create', 'roles.read', 'roles.update', 'roles.delete',
  'permissions.read', 'permissions.manage',
  'teams.create', 'teams.read', 'teams.update', 'teams.delete',
  'invitations.create', 'invitations.read', 'invitations.delete',
  'capacity.read', 'capacity.manage'
)
ON CONFLICT DO NOTHING;

-- Add limited role viewing permissions to manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'manager' 
AND r.is_system_role = false
AND p.name IN (
  'roles.read',
  'permissions.read',
  'teams.read', 'teams.update',
  'invitations.read',
  'capacity.read', 'capacity.manage'
)
ON CONFLICT DO NOTHING;

-- Add basic team and capacity viewing to member role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'member' 
AND r.is_system_role = false
AND p.name IN (
  'teams.read',
  'capacity.read'
)
ON CONFLICT DO NOTHING;

-- Also update system roles if they exist
-- Super Admin gets all new permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000001', id 
FROM permissions 
WHERE name IN (
  'roles.create', 'roles.read', 'roles.update', 'roles.delete',
  'permissions.read', 'permissions.manage',
  'teams.create', 'teams.read', 'teams.update', 'teams.delete',
  'invitations.create', 'invitations.read', 'invitations.delete',
  'capacity.read', 'capacity.manage'
)
ON CONFLICT DO NOTHING;

-- Support Admin gets read permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000002', id 
FROM permissions 
WHERE name IN (
  'roles.read', 'permissions.read', 'teams.read', 'invitations.read', 'capacity.read'
)
ON CONFLICT DO NOTHING;

-- Global Admin (organization admin system role) gets full access except global permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000003', id 
FROM permissions 
WHERE name IN (
  'roles.create', 'roles.read', 'roles.update', 'roles.delete',
  'permissions.read', 'permissions.manage',
  'teams.create', 'teams.read', 'teams.update', 'teams.delete',
  'invitations.create', 'invitations.read', 'invitations.delete',
  'capacity.read', 'capacity.manage'
)
ON CONFLICT DO NOTHING;

-- Manager system role gets management permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000004', id 
FROM permissions 
WHERE name IN (
  'roles.read', 'permissions.read', 'teams.read', 'teams.update',
  'invitations.read', 'capacity.read', 'capacity.manage'
)
ON CONFLICT DO NOTHING;

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
BEGIN
  SELECT COUNT(*) INTO total_permissions FROM permissions;
  SELECT COUNT(DISTINCT module) INTO total_modules FROM permissions;
  
  RAISE NOTICE 'Migration complete. Total permissions: %, Total modules: %', 
    total_permissions, total_modules;
END $$;
