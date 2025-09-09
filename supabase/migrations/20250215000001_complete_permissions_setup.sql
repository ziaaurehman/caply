-- Migration: Complete Permissions Setup
-- Date: 2025-02-15
-- This migration ensures ALL permissions are present in the database
-- Includes both leave.* and leave_requests.* naming for compatibility

-- =====================================================
-- COMPREHENSIVE PERMISSIONS INSERT
-- =====================================================

-- Insert all permissions (using ON CONFLICT to avoid duplicates)
INSERT INTO permissions (name, display_name, description, module, action) VALUES
  -- =====================================================
  -- USER MANAGEMENT
  -- =====================================================
  ('users.create', 'Create Users', 'Can invite and create new users', 'users', 'create'),
  ('users.read', 'View Users', 'Can view user profiles and lists', 'users', 'read'),
  ('users.update', 'Update Users', 'Can edit user profiles and settings', 'users', 'update'),
  ('users.delete', 'Delete Users', 'Can deactivate or delete users', 'users', 'delete'),
  ('users.global_read', 'View All Users', 'Can view users across all organizations', 'users', 'global_read'),
  ('users.manage', 'Manage Users', 'Can fully manage user accounts', 'users', 'manage'),

  -- =====================================================
  -- ROLE MANAGEMENT
  -- =====================================================
  ('roles.create', 'Create Roles', 'Can create new roles', 'roles', 'create'),
  ('roles.read', 'View Roles', 'Can view roles and permissions', 'roles', 'read'),
  ('roles.update', 'Update Roles', 'Can edit roles and assign permissions', 'roles', 'update'),
  ('roles.delete', 'Delete Roles', 'Can delete roles', 'roles', 'delete'),
  ('roles.manage', 'Manage Roles', 'Can fully manage roles and permissions', 'roles', 'manage'),

  -- =====================================================
  -- PERMISSION MANAGEMENT
  -- =====================================================
  ('permissions.read', 'View Permissions', 'Can view available permissions', 'permissions', 'read'),
  ('permissions.manage', 'Manage Permissions', 'Can assign/remove permissions from roles', 'permissions', 'manage'),

  -- =====================================================
  -- ORGANIZATION MANAGEMENT
  -- =====================================================
  ('organizations.create', 'Create Organizations', 'Can create organizations', 'organizations', 'create'),
  ('organizations.read', 'View Organizations', 'Can view organization information', 'organizations', 'read'),
  ('organizations.update', 'Update Organizations', 'Can update organization settings', 'organizations', 'update'),
  ('organizations.delete', 'Delete Organizations', 'Can delete organizations', 'organizations', 'delete'),
  ('organizations.global_read', 'View All Organizations', 'Can view all organizations for support', 'organizations', 'global_read'),
  ('organizations.support_access', 'Support Access', 'Can access organizations for customer support', 'organizations', 'support_access'),
  ('organizations.manage', 'Manage Organizations', 'Can fully manage organization', 'organizations', 'manage'),

  -- =====================================================
  -- PROJECT MANAGEMENT
  -- =====================================================
  ('projects.create', 'Create Projects', 'Can create new projects', 'projects', 'create'),
  ('projects.read', 'View Projects', 'Can view project details', 'projects', 'read'),
  ('projects.update', 'Update Projects', 'Can edit project details', 'projects', 'update'),
  ('projects.delete', 'Delete Projects', 'Can delete projects', 'projects', 'delete'),
  ('projects.manage', 'Manage Projects', 'Can manage project assignments and resources', 'projects', 'manage'),

  -- =====================================================
  -- TASK MANAGEMENT
  -- =====================================================
  ('tasks.create', 'Create Tasks', 'Can create new tasks', 'tasks', 'create'),
  ('tasks.read', 'View Tasks', 'Can view task details', 'tasks', 'read'),
  ('tasks.update', 'Update Tasks', 'Can edit task details', 'tasks', 'update'),
  ('tasks.delete', 'Delete Tasks', 'Can delete tasks', 'tasks', 'delete'),
  ('tasks.assign', 'Assign Tasks', 'Can assign tasks to team members', 'tasks', 'assign'),
  ('tasks.manage', 'Manage Tasks', 'Can fully manage tasks', 'tasks', 'manage'),

  -- =====================================================
  -- TIME TRACKING / TIMESHEETS
  -- =====================================================
  ('time_entries.create', 'Create Time Entries', 'Can create time entries', 'time_entries', 'create'),
  ('time_entries.read', 'View Time Entries', 'Can view time entries', 'time_entries', 'read'),
  ('time_entries.update', 'Update Time Entries', 'Can edit time entries', 'time_entries', 'update'),
  ('time_entries.delete', 'Delete Time Entries', 'Can delete time entries', 'time_entries', 'delete'),
  ('time_entries.approve', 'Approve Time Entries', 'Can approve or reject time entries', 'time_entries', 'approve'),
  ('time_entries.manage', 'Manage Time Entries', 'Can fully manage time entries', 'time_entries', 'manage'),
  
  -- Timesheets (alternative naming)
  ('timesheets.create', 'Create Timesheets', 'Can create timesheet entries', 'timesheets', 'create'),
  ('timesheets.read', 'View Timesheets', 'Can view timesheet entries', 'timesheets', 'read'),
  ('timesheets.update', 'Update Timesheets', 'Can edit timesheet entries', 'timesheets', 'update'),
  ('timesheets.delete', 'Delete Timesheets', 'Can delete timesheet entries', 'timesheets', 'delete'),
  ('timesheets.approve', 'Approve Timesheets', 'Can approve or reject timesheets', 'timesheets', 'approve'),
  ('timesheets.manage', 'Manage Timesheets', 'Can fully manage timesheets', 'timesheets', 'manage'),

  -- =====================================================
  -- LEAVE MANAGEMENT (BOTH NAMING CONVENTIONS)
  -- =====================================================
  -- leave_requests.* (used in organization setup)
  ('leave_requests.create', 'Create Leave Requests', 'Can create leave requests', 'leave_requests', 'create'),
  ('leave_requests.read', 'View Leave Requests', 'Can view leave requests', 'leave_requests', 'read'),
  ('leave_requests.update', 'Update Leave Requests', 'Can edit leave requests', 'leave_requests', 'update'),
  ('leave_requests.delete', 'Delete Leave Requests', 'Can delete leave requests', 'leave_requests', 'delete'),
  ('leave_requests.approve', 'Approve Leave Requests', 'Can approve or reject leave requests', 'leave_requests', 'approve'),
  ('leave_requests.manage', 'Manage Leave Requests', 'Can fully manage leave requests', 'leave_requests', 'manage'),
  
  -- leave.* (used in permissions.ts)
  ('leave.create', 'Create Leave Requests', 'Can create leave requests', 'leave', 'create'),
  ('leave.read', 'View Leave Requests', 'Can view leave requests', 'leave', 'read'),
  ('leave.update', 'Update Leave Requests', 'Can edit leave requests', 'leave', 'update'),
  ('leave.delete', 'Delete Leave Requests', 'Can delete leave requests', 'leave', 'delete'),
  ('leave.approve', 'Approve Leave Requests', 'Can approve or reject leave requests', 'leave', 'approve'),
  ('leave.manage', 'Manage Leave Requests', 'Can fully manage leave requests', 'leave', 'manage'),

  -- =====================================================
  -- CLIENT MANAGEMENT
  -- =====================================================
  ('clients.create', 'Create Clients', 'Can create new clients', 'clients', 'create'),
  ('clients.read', 'View Clients', 'Can view client information', 'clients', 'read'),
  ('clients.update', 'Update Clients', 'Can edit client information', 'clients', 'update'),
  ('clients.delete', 'Delete Clients', 'Can delete clients', 'clients', 'delete'),
  ('clients.manage', 'Manage Clients', 'Can fully manage clients', 'clients', 'manage'),

  -- =====================================================
  -- INVOICE MANAGEMENT
  -- =====================================================
  ('invoices.create', 'Create Invoices', 'Can create invoices', 'invoices', 'create'),
  ('invoices.read', 'View Invoices', 'Can view invoices', 'invoices', 'read'),
  ('invoices.update', 'Update Invoices', 'Can edit invoices', 'invoices', 'update'),
  ('invoices.delete', 'Delete Invoices', 'Can delete invoices', 'invoices', 'delete'),
  ('invoices.send', 'Send Invoices', 'Can send invoices to clients', 'invoices', 'send'),
  ('invoices.manage', 'Manage Invoices', 'Can fully manage invoices', 'invoices', 'manage'),

  -- =====================================================
  -- ESTIMATE MANAGEMENT
  -- =====================================================
  ('estimates.create', 'Create Estimates', 'Can create estimates', 'estimates', 'create'),
  ('estimates.read', 'View Estimates', 'Can view estimates', 'estimates', 'read'),
  ('estimates.update', 'Update Estimates', 'Can edit estimates', 'estimates', 'update'),
  ('estimates.delete', 'Delete Estimates', 'Can delete estimates', 'estimates', 'delete'),
  ('estimates.send', 'Send Estimates', 'Can send estimates to clients', 'estimates', 'send'),
  ('estimates.manage', 'Manage Estimates', 'Can fully manage estimates', 'estimates', 'manage'),

  -- =====================================================
  -- EXPENSE MANAGEMENT
  -- =====================================================
  ('expenses.create', 'Create Expenses', 'Can create expense entries', 'expenses', 'create'),
  ('expenses.read', 'View Expenses', 'Can view expense entries', 'expenses', 'read'),
  ('expenses.update', 'Update Expenses', 'Can edit expense entries', 'expenses', 'update'),
  ('expenses.delete', 'Delete Expenses', 'Can delete expense entries', 'expenses', 'delete'),
  ('expenses.approve', 'Approve Expenses', 'Can approve or reject expenses', 'expenses', 'approve'),
  ('expenses.manage', 'Manage Expenses', 'Can fully manage expenses', 'expenses', 'manage'),

  -- =====================================================
  -- CAPACITY PLANNING
  -- =====================================================
  ('capacity.read', 'View Capacity', 'Can view capacity planning data', 'capacity', 'read'),
  ('capacity.manage', 'Manage Capacity', 'Can manage resource allocation and capacity', 'capacity', 'manage'),
  ('capacity.create', 'Create Capacity', 'Can create capacity allocations', 'capacity', 'create'),
  ('capacity.update', 'Update Capacity', 'Can update capacity allocations', 'capacity', 'update'),
  ('capacity.delete', 'Delete Capacity', 'Can delete capacity allocations', 'capacity', 'delete'),

  -- =====================================================
  -- TEAM MANAGEMENT
  -- =====================================================
  ('teams.create', 'Create Teams', 'Can create new teams', 'teams', 'create'),
  ('teams.read', 'View Teams', 'Can view team information', 'teams', 'read'),
  ('teams.update', 'Update Teams', 'Can update team details', 'teams', 'update'),
  ('teams.delete', 'Delete Teams', 'Can delete teams', 'teams', 'delete'),
  ('teams.manage', 'Manage Teams', 'Can fully manage teams', 'teams', 'manage'),

  -- =====================================================
  -- INVITATION MANAGEMENT
  -- =====================================================
  ('invitations.create', 'Send Invitations', 'Can invite users to organization', 'invitations', 'create'),
  ('invitations.read', 'View Invitations', 'Can view pending invitations', 'invitations', 'read'),
  ('invitations.update', 'Update Invitations', 'Can update invitation details', 'invitations', 'update'),
  ('invitations.delete', 'Cancel Invitations', 'Can cancel pending invitations', 'invitations', 'delete'),
  ('invitations.manage', 'Manage Invitations', 'Can fully manage invitations', 'invitations', 'manage'),

  -- =====================================================
  -- REPORTS AND ANALYTICS
  -- =====================================================
  ('reports.read', 'View Reports', 'Can view reports and analytics', 'reports', 'read'),
  ('reports.export', 'Export Reports', 'Can export reports and data', 'reports', 'export'),
  ('reports.create', 'Create Reports', 'Can create custom reports', 'reports', 'create'),
  ('reports.manage', 'Manage Reports', 'Can fully manage reports', 'reports', 'manage'),

  -- =====================================================
  -- SETTINGS AND CONFIGURATION
  -- =====================================================
  ('settings.read', 'View Settings', 'Can view organization settings', 'settings', 'read'),
  ('settings.update', 'Update Settings', 'Can modify organization settings', 'settings', 'update'),
  ('settings.manage', 'Manage Settings', 'Can fully manage settings', 'settings', 'manage'),

  -- =====================================================
  -- SUPPORT AND PLATFORM MANAGEMENT
  -- =====================================================
  ('support.access_logs', 'Access Support Logs', 'Can view platform activity logs', 'support', 'access_logs'),
  ('support.view_tickets', 'View Support Tickets', 'Can view and respond to support tickets', 'support', 'view_tickets'),
  ('support.access_analytics', 'Access Platform Analytics', 'Can view platform usage analytics', 'support', 'access_analytics'),
  ('support.manage', 'Manage Support', 'Can fully manage support operations', 'support', 'manage'),

  -- =====================================================
  -- PLATFORM MANAGEMENT
  -- =====================================================
  ('platform.manage_subscriptions', 'Manage Subscriptions', 'Can manage customer subscriptions', 'platform', 'manage_subscriptions'),
  ('platform.global_settings', 'Manage Platform Settings', 'Can update global platform settings', 'platform', 'global_settings'),
  ('platform.manage', 'Manage Platform', 'Can fully manage platform operations', 'platform', 'manage'),

  -- =====================================================
  -- KANBAN MANAGEMENT
  -- =====================================================
  ('kanban.read', 'View Kanban', 'Can view kanban boards', 'kanban', 'read'),
  ('kanban.create', 'Create Kanban', 'Can create kanban boards', 'kanban', 'create'),
  ('kanban.update', 'Update Kanban', 'Can edit kanban boards', 'kanban', 'update'),
  ('kanban.delete', 'Delete Kanban', 'Can delete kanban boards', 'kanban', 'delete'),
  ('kanban.manage', 'Manage Kanban', 'Can fully manage kanban boards', 'kanban', 'manage'),

  -- =====================================================
  -- BILLING MANAGEMENT
  -- =====================================================
  ('billing.read', 'View Billing', 'Can view billing information', 'billing', 'read'),
  ('billing.update', 'Update Billing', 'Can update billing settings', 'billing', 'update'),
  ('billing.manage', 'Manage Billing', 'Can fully manage billing', 'billing', 'manage'),

  -- =====================================================
  -- WEBHOOK MANAGEMENT
  -- =====================================================
  ('webhooks.read', 'View Webhooks', 'Can view webhook configurations', 'webhooks', 'read'),
  ('webhooks.create', 'Create Webhooks', 'Can create webhook configurations', 'webhooks', 'create'),
  ('webhooks.update', 'Update Webhooks', 'Can update webhook configurations', 'webhooks', 'update'),
  ('webhooks.delete', 'Delete Webhooks', 'Can delete webhook configurations', 'webhooks', 'delete'),
  ('webhooks.manage', 'Manage Webhooks', 'Can fully manage webhooks', 'webhooks', 'manage')

ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- VERIFICATION AND LOGGING
-- =====================================================

-- Log the total number of permissions
DO $$
DECLARE
  total_permissions INTEGER;
  total_modules INTEGER;
  unique_permissions INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_permissions FROM permissions;
  SELECT COUNT(DISTINCT module) INTO total_modules FROM permissions;
  SELECT COUNT(DISTINCT name) INTO unique_permissions FROM permissions;
  
  RAISE NOTICE 'Migration complete. Total permissions: %, Total modules: %, Unique permissions: %', 
    total_permissions, total_modules, unique_permissions;
END $$;

-- =====================================================
-- CREATE HELPFUL VIEWS
-- =====================================================

-- View to see all permissions grouped by module
CREATE OR REPLACE VIEW permissions_by_module AS
SELECT 
  module,
  action,
  array_agg(name ORDER BY name) as permissions,
  count(*) as permission_count
FROM permissions 
GROUP BY module, action
ORDER BY module, action;

-- View to see all permissions with their details
CREATE OR REPLACE VIEW permissions_summary AS
SELECT 
  name,
  display_name,
  description,
  module,
  action,
  created_at
FROM permissions 
ORDER BY module, action, name;

-- Grant access to the views
GRANT SELECT ON permissions_by_module TO authenticated;
GRANT SELECT ON permissions_summary TO authenticated;

-- Add comments
COMMENT ON VIEW permissions_by_module IS 'Permissions grouped by module and action for easy reference';
COMMENT ON VIEW permissions_summary IS 'Complete list of all permissions with details';

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Verify that all expected permissions exist
DO $$
DECLARE
  missing_permissions TEXT[];
  expected_permissions TEXT[] := ARRAY[
    'users.create', 'users.read', 'users.update', 'users.delete',
    'roles.create', 'roles.read', 'roles.update', 'roles.delete',
    'projects.create', 'projects.read', 'projects.update', 'projects.delete',
    'tasks.create', 'tasks.read', 'tasks.update', 'tasks.delete',
    'time_entries.create', 'time_entries.read', 'time_entries.update', 'time_entries.delete',
    'timesheets.create', 'timesheets.read', 'timesheets.update', 'timesheets.delete',
    'leave_requests.create', 'leave_requests.read', 'leave_requests.update', 'leave_requests.delete',
    'leave.create', 'leave.read', 'leave.update', 'leave.delete',
    'clients.create', 'clients.read', 'clients.update', 'clients.delete',
    'invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete',
    'estimates.create', 'estimates.read', 'estimates.update', 'estimates.delete',
    'expenses.create', 'expenses.read', 'expenses.update', 'expenses.delete',
    'capacity.read', 'capacity.manage',
    'reports.read', 'reports.export',
    'settings.read', 'settings.update'
  ];
  permission_name TEXT;
BEGIN
  missing_permissions := ARRAY[]::TEXT[];
  
  FOREACH permission_name IN ARRAY expected_permissions
  LOOP
    IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = permission_name) THEN
      missing_permissions := array_append(missing_permissions, permission_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_permissions, 1) > 0 THEN
    RAISE WARNING 'Missing permissions: %', array_to_string(missing_permissions, ', ');
  ELSE
    RAISE NOTICE 'All expected permissions are present!';
  END IF;
END $$;
