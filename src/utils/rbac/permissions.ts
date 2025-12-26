import { Permission } from '@/lib/types';

// Permission definitions for the project management system
export const PERMISSIONS: Permission[] = [
  // User Management
  {
    id: 'users.create',
    name: 'Create Users',
    description: 'Can invite and create new users',
    resource: 'users',
    action: 'create'
  },
  {
    id: 'users.read',
    name: 'View Users',
    description: 'Can view user profiles and lists',
    resource: 'users',
    action: 'read'
  },
  {
    id: 'users.update',
    name: 'Update Users',
    description: 'Can edit user profiles and settings',
    resource: 'users',
    action: 'update'
  },
  {
    id: 'users.delete',
    name: 'Delete Users',
    description: 'Can deactivate or delete users',
    resource: 'users',
    action: 'delete'
  },

  // Role Management
  {
    id: 'roles.create',
    name: 'Create Roles',
    description: 'Can create new roles',
    resource: 'roles',
    action: 'create'
  },
  {
    id: 'roles.read',
    name: 'View Roles',
    description: 'Can view roles and permissions',
    resource: 'roles',
    action: 'read'
  },
  {
    id: 'roles.update',
    name: 'Update Roles',
    description: 'Can edit roles and assign permissions',
    resource: 'roles',
    action: 'update'
  },
  {
    id: 'roles.delete',
    name: 'Delete Roles',
    description: 'Can delete roles',
    resource: 'roles',
    action: 'delete'
  },

  // Project Management
  {
    id: 'projects.create',
    name: 'Create Projects',
    description: 'Can create new projects',
    resource: 'projects',
    action: 'create'
  },
  {
    id: 'projects.read',
    name: 'View Projects',
    description: 'Can view project details',
    resource: 'projects',
    action: 'read'
  },
  {
    id: 'projects.update',
    name: 'Update Projects',
    description: 'Can edit project details',
    resource: 'projects',
    action: 'update'
  },
  {
    id: 'projects.delete',
    name: 'Delete Projects',
    description: 'Can delete projects',
    resource: 'projects',
    action: 'delete'
  },
  {
    id: 'projects.manage',
    name: 'Manage Projects',
    description: 'Can manage project assignments and resources',
    resource: 'projects',
    action: 'manage'
  },

  // Task Management
  {
    id: 'tasks.create',
    name: 'Create Tasks',
    description: 'Can create new tasks',
    resource: 'tasks',
    action: 'create'
  },
  {
    id: 'tasks.read',
    name: 'View Tasks',
    description: 'Can view task details',
    resource: 'tasks',
    action: 'read'
  },
  {
    id: 'tasks.update',
    name: 'Update Tasks',
    description: 'Can edit task details',
    resource: 'tasks',
    action: 'update'
  },
  {
    id: 'tasks.delete',
    name: 'Delete Tasks',
    description: 'Can delete tasks',
    resource: 'tasks',
    action: 'delete'
  },
  {
    id: 'tasks.assign',
    name: 'Assign Tasks',
    description: 'Can assign tasks to team members',
    resource: 'tasks',
    action: 'assign'
  },

  // Timesheet Management
  {
    id: 'timesheets.create',
    name: 'Create Timesheets',
    description: 'Can create timesheet entries',
    resource: 'timesheets',
    action: 'create'
  },
  {
    id: 'timesheets.read',
    name: 'View Timesheets',
    description: 'Can view timesheet entries',
    resource: 'timesheets',
    action: 'read'
  },
  {
    id: 'timesheets.update',
    name: 'Update Timesheets',
    description: 'Can edit timesheet entries',
    resource: 'timesheets',
    action: 'update'
  },
  {
    id: 'timesheets.delete',
    name: 'Delete Timesheets',
    description: 'Can delete timesheet entries',
    resource: 'timesheets',
    action: 'delete'
  },
  {
    id: 'timesheets.approve',
    name: 'Approve Timesheets',
    description: 'Can approve or reject timesheets',
    resource: 'timesheets',
    action: 'approve'
  },

  // Leave Management
  {
    id: 'leave.create',
    name: 'Create Leave Requests',
    description: 'Can create leave requests',
    resource: 'leave',
    action: 'create'
  },
  {
    id: 'leave.read',
    name: 'View Leave Requests',
    description: 'Can view leave requests',
    resource: 'leave',
    action: 'read'
  },
  {
    id: 'leave.update',
    name: 'Update Leave Requests',
    description: 'Can edit leave requests',
    resource: 'leave',
    action: 'update'
  },
  {
    id: 'leave.delete',
    name: 'Delete Leave Requests',
    description: 'Can delete leave requests',
    resource: 'leave',
    action: 'delete'
  },
  {
    id: 'leave.approve',
    name: 'Approve Leave Requests',
    description: 'Can approve or reject leave requests',
    resource: 'leave',
    action: 'approve'
  },

  // Financial Management
  {
    id: 'estimates.create',
    name: 'Create Estimates',
    description: 'Can create project estimates',
    resource: 'estimates',
    action: 'create'
  },
  {
    id: 'estimates.read',
    name: 'View Estimates',
    description: 'Can view estimates',
    resource: 'estimates',
    action: 'read'
  },
  {
    id: 'estimates.update',
    name: 'Update Estimates',
    description: 'Can edit estimates',
    resource: 'estimates',
    action: 'update'
  },
  {
    id: 'estimates.delete',
    name: 'Delete Estimates',
    description: 'Can delete estimates',
    resource: 'estimates',
    action: 'delete'
  },
  {
    id: 'estimates.send',
    name: 'Send Estimates',
    description: 'Can send estimates to clients',
    resource: 'estimates',
    action: 'send'
  },

  // Invoice Management
  {
    id: 'invoices.create',
    name: 'Create Invoices',
    description: 'Can create invoices',
    resource: 'invoices',
    action: 'create'
  },
  {
    id: 'invoices.read',
    name: 'View Invoices',
    description: 'Can view invoices',
    resource: 'invoices',
    action: 'read'
  },
  {
    id: 'invoices.update',
    name: 'Update Invoices',
    description: 'Can edit invoices',
    resource: 'invoices',
    action: 'update'
  },
  {
    id: 'invoices.delete',
    name: 'Delete Invoices',
    description: 'Can delete invoices',
    resource: 'invoices',
    action: 'delete'
  },
  {
    id: 'invoices.send',
    name: 'Send Invoices',
    description: 'Can send invoices to clients',
    resource: 'invoices',
    action: 'send'
  },
  {
    id: 'teams.create',
    name: 'Create teams',
    description: 'Can create teams',
    resource: 'teams',
    action: 'create'
  },
  {
    id: 'teams.read',
    name: 'View teams',
    description: 'Can view teams',
    resource: 'teams',
    action: 'read'
  },
  {
    id: 'teams.update',
    name: 'Update teams',
    description: 'Can edit teams',
    resource: 'teams',
    action: 'update'
  },
  {
    id: 'teams.delete',
    name: 'Delete teams',
    description: 'Can delete teams',
    resource: 'teams',
    action: 'delete'
  },
  {
    id: 'teams.send',
    name: 'Send teams',
    description: 'Can send teams to clients',
    resource: 'teams',
    action: 'send'
  },

  // Expense Management
  {
    id: 'expenses.create',
    name: 'Create Expenses',
    description: 'Can create expense entries',
    resource: 'expenses',
    action: 'create'
  },
  {
    id: 'expenses.read',
    name: 'View Expenses',
    description: 'Can view expense entries',
    resource: 'expenses',
    action: 'read'
  },
  {
    id: 'expenses.update',
    name: 'Update Expenses',
    description: 'Can edit expense entries',
    resource: 'expenses',
    action: 'update'
  },
  {
    id: 'expenses.delete',
    name: 'Delete Expenses',
    description: 'Can delete expense entries',
    resource: 'expenses',
    action: 'delete'
  },
  {
    id: 'expenses.approve',
    name: 'Approve Expenses',
    description: 'Can approve or reject expenses',
    resource: 'expenses',
    action: 'approve'
  },

  // Capacity Planning
  {
    id: 'capacity.read',
    name: 'View Capacity',
    description: 'Can view capacity planning data',
    resource: 'capacity',
    action: 'read'
  },
  {
    id: 'capacity.manage',
    name: 'Manage Capacity',
    description: 'Can manage resource allocation and capacity',
    resource: 'capacity',
    action: 'manage'
  },

  // Reports
  {
    id: 'reports.read',
    name: 'View Reports',
    description: 'Can view reports and analytics',
    resource: 'reports',
    action: 'read'
  },
  {
    id: 'reports.export',
    name: 'Export Reports',
    description: 'Can export reports and data',
    resource: 'reports',
    action: 'export'
  },

  // Settings
  {
    id: 'settings.read',
    name: 'View Settings',
    description: 'Can view organization settings',
    resource: 'settings',
    action: 'read'
  },
  {
    id: 'settings.update',
    name: 'Update Settings',
    description: 'Can modify organization settings',
    resource: 'settings',
    action: 'update'
  },

  // Client Management
  {
    id: 'clients.create',
    name: 'Create Clients',
    description: 'Can create new clients',
    resource: 'clients',
    action: 'create'
  },
  {
    id: 'clients.read',
    name: 'View Clients',
    description: 'Can view client information',
    resource: 'clients',
    action: 'read'
  },
  {
    id: 'clients.update',
    name: 'Update Clients',
    description: 'Can edit client information',
    resource: 'clients',
    action: 'update'
  },
  {
    id: 'clients.delete',
    name: 'Delete Clients',
    description: 'Can delete clients',
    resource: 'clients',
    action: 'delete'
  }
];

// Get permission by ID
export const getPermissionById = (id: string): Permission | undefined => {
  return PERMISSIONS.find(permission => permission.id === id);
};

// Get permissions by resource
export const getPermissionsByResource = (resource: string): Permission[] => {
  return PERMISSIONS.filter(permission => permission.resource === resource);
};

// Get permissions by action
export const getPermissionsByAction = (action: string): Permission[] => {
  return PERMISSIONS.filter(permission => permission.action === action);
}; 