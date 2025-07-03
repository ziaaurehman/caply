import { Role } from '@/lib/types';
import { PERMISSIONS } from './permissions';

// Default roles for the project management system
export const DEFAULT_ROLES: Omit<Role, 'organizationId' | 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: PERMISSIONS, // Admins get all permissions
    isDefault: true,
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Project and team management with approval capabilities',
    permissions: PERMISSIONS.filter(p => 
      // Project management permissions
      p.resource === 'projects' ||
      // Task management permissions
      p.resource === 'tasks' ||
      // Team member view/update permissions
      (p.resource === 'users' && ['read', 'update'].includes(p.action)) ||
      // Timesheet approval permissions
      p.resource === 'timesheets' ||
      // Leave approval permissions
      p.resource === 'leave' ||
      // Financial management permissions
      p.resource === 'estimates' ||
      p.resource === 'invoices' ||
      // Expense approval permissions
      p.resource === 'expenses' ||
      // Capacity planning permissions
      p.resource === 'capacity' ||
      // Reports access
      p.resource === 'reports' ||
      // Client management permissions
      p.resource === 'clients' ||
      // Basic settings view
      (p.resource === 'settings' && p.action === 'read')
    ),
    isDefault: true,
  },
  {
    id: 'employee',
    name: 'Employee',
    description: 'Basic user with limited permissions for day-to-day work',
    permissions: PERMISSIONS.filter(p => 
      // Can view projects and tasks
      (p.resource === 'projects' && p.action === 'read') ||
      (p.resource === 'tasks' && ['read', 'update'].includes(p.action)) ||
      // Can view their own profile
      (p.resource === 'users' && p.action === 'read') ||
      // Can manage their own timesheets
      (p.resource === 'timesheets' && ['create', 'read', 'update', 'delete'].includes(p.action)) ||
      // Can manage their own leave requests
      (p.resource === 'leave' && ['create', 'read', 'update', 'delete'].includes(p.action)) ||
      // Can manage their own expenses
      (p.resource === 'expenses' && ['create', 'read', 'update', 'delete'].includes(p.action)) ||
      // Can view capacity planning
      (p.resource === 'capacity' && p.action === 'read') ||
      // Can view basic reports
      (p.resource === 'reports' && p.action === 'read') ||
      // Can view clients
      (p.resource === 'clients' && p.action === 'read')
    ),
    isDefault: true,
  },
  {
    id: 'project-lead',
    name: 'Project Lead',
    description: 'Enhanced employee role with project leadership capabilities',
    permissions: PERMISSIONS.filter(p => 
      // All employee permissions plus:
      (p.resource === 'projects' && ['read', 'update'].includes(p.action)) ||
      (p.resource === 'tasks' && ['create', 'read', 'update', 'delete', 'assign'].includes(p.action)) ||
      (p.resource === 'users' && p.action === 'read') ||
      (p.resource === 'timesheets' && ['create', 'read', 'update', 'delete'].includes(p.action)) ||
      (p.resource === 'leave' && ['create', 'read', 'update', 'delete'].includes(p.action)) ||
      (p.resource === 'expenses' && ['create', 'read', 'update', 'delete'].includes(p.action)) ||
      (p.resource === 'capacity' && ['read', 'manage'].includes(p.action)) ||
      (p.resource === 'reports' && p.action === 'read') ||
      (p.resource === 'clients' && p.action === 'read') ||
      // Can create estimates for their projects
      (p.resource === 'estimates' && ['create', 'read', 'update'].includes(p.action))
    ),
    isDefault: false,
  },
  {
    id: 'finance-manager',
    name: 'Finance Manager',
    description: 'Financial management with invoice and expense oversight',
    permissions: PERMISSIONS.filter(p => 
      // Financial permissions
      p.resource === 'estimates' ||
      p.resource === 'invoices' ||
      p.resource === 'expenses' ||
      // View projects and users for context
      (p.resource === 'projects' && p.action === 'read') ||
      (p.resource === 'users' && p.action === 'read') ||
      (p.resource === 'clients' && ['read', 'update'].includes(p.action)) ||
      // Reports access
      p.resource === 'reports'
    ),
    isDefault: false,
  },
  {
    id: 'hr-manager',
    name: 'HR Manager',
    description: 'Human resources management with user and leave oversight',
    permissions: PERMISSIONS.filter(p => 
      // User management permissions
      (p.resource === 'users' && ['create', 'read', 'update'].includes(p.action)) ||
      // Role management (view only)
      (p.resource === 'roles' && p.action === 'read') ||
      // Leave management
      p.resource === 'leave' ||
      // Timesheet approval
      (p.resource === 'timesheets' && ['read', 'approve'].includes(p.action)) ||
      // Basic project view for context
      (p.resource === 'projects' && p.action === 'read') ||
      // Reports access
      p.resource === 'reports'
    ),
    isDefault: false,
  },
  {
    id: 'readonly',
    name: 'Read Only',
    description: 'View-only access for stakeholders and observers',
    permissions: PERMISSIONS.filter(p => 
      p.action === 'read'
    ),
    isDefault: false,
  }
];

// Helper function to get role by ID
export const getRoleById = (id: string): typeof DEFAULT_ROLES[0] | undefined => {
  return DEFAULT_ROLES.find(role => role.id === id);
};

// Helper function to get all default role IDs
export const getDefaultRoleIds = (): string[] => {
  return DEFAULT_ROLES.filter(role => role.isDefault).map(role => role.id);
};

// Helper function to create a role with timestamps
export const createRole = (
  roleData: Omit<Role, 'createdAt' | 'updatedAt'>,
  organizationId?: string
): Role => {
  const now = new Date().toISOString();
  return {
    ...roleData,
    organizationId: organizationId || roleData.organizationId,
    createdAt: now,
    updatedAt: now,
  };
}; 