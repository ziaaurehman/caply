-- Migration: Add Missing Permissions for Capacity, Roles, and Other Resources
-- Date: 2025-01-27
-- This migration adds missing permissions that are defined in permissions.ts but not in database

-- =====================================================
-- ADD MISSING PERMISSIONS
-- =====================================================

-- Insert missing permissions (using ON CONFLICT to avoid duplicates)
INSERT INTO permissions (name, display_name, description, module, action) VALUES
  -- Roles management (ensure all are present)
  ('roles.create', 'Create Roles', 'Can create new roles', 'roles', 'create'),
  ('roles.read', 'View Roles', 'Can view roles and permissions', 'roles', 'read'),
  ('roles.update', 'Update Roles', 'Can edit roles and assign permissions', 'roles', 'update'),
  ('roles.delete', 'Delete Roles', 'Can delete roles', 'roles', 'delete'),
  ('roles.manage', 'Manage Roles', 'Can fully manage roles and permissions', 'roles', 'manage'),
  
  -- Capacity planning (ensure all are present)
  ('capacity.read', 'View Capacity', 'Can view capacity planning data', 'capacity', 'read'),
  ('capacity.manage', 'Manage Capacity', 'Can manage resource allocation and capacity', 'capacity', 'manage'),
  ('capacity.create', 'Create Capacity', 'Can create capacity allocations', 'capacity', 'create'),
  ('capacity.update', 'Update Capacity', 'Can update capacity allocations', 'capacity', 'update'),
  ('capacity.delete', 'Delete Capacity', 'Can delete capacity allocations', 'capacity', 'delete'),
  
  -- Task management (ensure all are present)
  ('tasks.create', 'Create Tasks', 'Can create new tasks', 'tasks', 'create'),
  ('tasks.read', 'View Tasks', 'Can view task details', 'tasks', 'read'),
  ('tasks.update', 'Update Tasks', 'Can edit task details', 'tasks', 'update'),
  ('tasks.delete', 'Delete Tasks', 'Can delete tasks', 'tasks', 'delete'),
  ('tasks.assign', 'Assign Tasks', 'Can assign tasks to team members', 'tasks', 'assign'),
  
  -- Time entries (ensure all are present)
  ('time_entries.create', 'Create Time Entries', 'Can create time entries', 'time_entries', 'create'),
  ('time_entries.read', 'View Time Entries', 'Can view time entries', 'time_entries', 'read'),
  ('time_entries.update', 'Update Time Entries', 'Can edit time entries', 'time_entries', 'update'),
  ('time_entries.delete', 'Delete Time Entries', 'Can delete time entries', 'time_entries', 'delete'),
  ('time_entries.approve', 'Approve Time Entries', 'Can approve or reject time entries', 'time_entries', 'approve'),
  
  -- Leave requests (ensure all are present)
  ('leave_requests.create', 'Create Leave Requests', 'Can create leave requests', 'leave_requests', 'create'),
  ('leave_requests.read', 'View Leave Requests', 'Can view leave requests', 'leave_requests', 'read'),
  ('leave_requests.update', 'Update Leave Requests', 'Can edit leave requests', 'leave_requests', 'update'),
  ('leave_requests.delete', 'Delete Leave Requests', 'Can delete leave requests', 'leave_requests', 'delete'),
  ('leave_requests.approve', 'Approve Leave Requests', 'Can approve or reject leave requests', 'leave_requests', 'approve'),
  
  -- Reports (ensure all are present)
  ('reports.read', 'View Reports', 'Can view reports and analytics', 'reports', 'read'),
  ('reports.export', 'Export Reports', 'Can export reports and data', 'reports', 'export'),
  ('reports.create', 'Create Reports', 'Can create custom reports', 'reports', 'create'),
  
  -- Settings (ensure all are present)
  ('settings.read', 'View Settings', 'Can view organization settings', 'settings', 'read'),
  ('settings.update', 'Update Settings', 'Can modify organization settings', 'settings', 'update'),
  
  -- Organizations (ensure all are present)
  ('organizations.read', 'View Organizations', 'Can view organization details', 'organizations', 'read'),
  ('organizations.update', 'Update Organizations', 'Can modify organization details', 'organizations', 'update'),
  ('organizations.manage', 'Manage Organizations', 'Can fully manage organization', 'organizations', 'manage')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- UPDATE ADMIN ROLES WITH MISSING PERMISSIONS
-- =====================================================

-- Add missing permissions to existing admin roles in all organizations
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'admin' 
AND r.is_system_role = false
AND r.organization_id IS NOT NULL
AND p.name IN (
  -- Roles management (CRITICAL for existing admin roles)
  'roles.create', 'roles.read', 'roles.update', 'roles.delete', 'roles.manage',
  
  -- Capacity management (CRITICAL for existing admin roles)
  'capacity.read', 'capacity.manage', 'capacity.create', 'capacity.update', 'capacity.delete',
  
  -- Additional permissions for admin
  'reports.read', 'reports.export', 'reports.create',
  'settings.read', 'settings.update',
  'organizations.read', 'organizations.update', 'organizations.manage'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp2 
  WHERE rp2.role_id = r.id AND rp2.permission_id = p.id
);

-- Add capacity permissions to manager roles (CRITICAL for existing manager roles)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'manager' 
AND r.is_system_role = false
AND r.organization_id IS NOT NULL
AND p.name IN (
  -- Capacity management for managers
  'capacity.read', 'capacity.manage',
  'reports.read', 'reports.export'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp2 
  WHERE rp2.role_id = r.id AND rp2.permission_id = p.id
);

-- Add basic capacity read permission to team_lead roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'team_lead' 
AND r.is_system_role = false
AND r.organization_id IS NOT NULL
AND p.name IN ('capacity.read', 'reports.read')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp2 
  WHERE rp2.role_id = r.id AND rp2.permission_id = p.id
);

-- =====================================================
-- VERIFY PERMISSIONS SETUP
-- =====================================================

-- Create a view to check role permissions (for debugging)
CREATE OR REPLACE VIEW role_permissions_summary AS
SELECT 
  r.id as role_id,
  r.name as role_name,
  r.display_name as role_display_name,
  r.organization_id,
  o.name as organization_name,
  array_agg(p.name ORDER BY p.name) as permissions
FROM roles r
LEFT JOIN organizations o ON r.organization_id = o.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_system_role = false
GROUP BY r.id, r.name, r.display_name, r.organization_id, o.name
ORDER BY o.name, r.name;

-- Grant access to the view
GRANT SELECT ON role_permissions_summary TO authenticated;

-- Add comment
COMMENT ON VIEW role_permissions_summary IS 'Summary view of role permissions for debugging and verification'; 