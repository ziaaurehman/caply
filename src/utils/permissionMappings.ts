/**
 * Permission Mappings Reference
 * 
 * This file maps common API operations to the actual permissions stored in the database.
 * Use this as a reference when implementing permission checks in API endpoints.
 */

export const PERMISSION_MAPPINGS = {
  // Team Members / Users Management
  TEAM_MEMBERS: {
    READ: { resource: 'users', action: 'read' },
    CREATE: { resource: 'users', action: 'create' },
    UPDATE: { resource: 'users', action: 'update' },
    DELETE: { resource: 'users', action: 'delete' },
  },

  // Project Management
  PROJECTS: {
    READ: { resource: 'projects', action: 'read' },
    CREATE: { resource: 'projects', action: 'create' },
    UPDATE: { resource: 'projects', action: 'update' },
    DELETE: { resource: 'projects', action: 'delete' },
  },

  // Client Management
  CLIENTS: {
    READ: { resource: 'clients', action: 'read' },
    CREATE: { resource: 'clients', action: 'create' },
    UPDATE: { resource: 'clients', action: 'update' },
    DELETE: { resource: 'clients', action: 'delete' },
  },

  // Task Management
  TASKS: {
    READ: { resource: 'tasks', action: 'read' },
    CREATE: { resource: 'tasks', action: 'create' },
    UPDATE: { resource: 'tasks', action: 'update' },
    DELETE: { resource: 'tasks', action: 'delete' },
  },

  // Time Entries
  TIME_ENTRIES: {
    READ: { resource: 'time_entries', action: 'read' },
    APPROVE: { resource: 'time_entries', action: 'approve' },
  },

  // Invoices
  INVOICES: {
    READ: { resource: 'invoices', action: 'read' },
    CREATE: { resource: 'invoices', action: 'create' },
    UPDATE: { resource: 'invoices', action: 'update' },
    DELETE: { resource: 'invoices', action: 'delete' },
    SEND: { resource: 'invoices', action: 'send' },
  },

  // Estimates
  ESTIMATES: {
    READ: { resource: 'estimates', action: 'read' },
    CREATE: { resource: 'estimates', action: 'create' },
    UPDATE: { resource: 'estimates', action: 'update' },
    DELETE: { resource: 'estimates', action: 'delete' },
    SEND: { resource: 'estimates', action: 'send' },
  },

  // Expenses
  EXPENSES: {
    READ: { resource: 'expenses', action: 'read' },
    APPROVE: { resource: 'expenses', action: 'approve' },
  },

  // Leave Requests
  LEAVE_REQUESTS: {
    READ: { resource: 'leave_requests', action: 'read' },
    APPROVE: { resource: 'leave_requests', action: 'approve' },
  },

  // Reports
  REPORTS: {
    READ: { resource: 'reports', action: 'read' },
    EXPORT: { resource: 'reports', action: 'export' },
  },

  // Settings
  SETTINGS: {
    READ: { resource: 'settings', action: 'read' },
    UPDATE: { resource: 'settings', action: 'update' },
  },

  // Organizations
  ORGANIZATIONS: {
    READ: { resource: 'organizations', action: 'read' },
    UPDATE: { resource: 'organizations', action: 'update' },
  },
} as const

/**
 * Helper function to get permission for a specific operation
 */
export function getPermission(category: keyof typeof PERMISSION_MAPPINGS, action: string) {
  const categoryPermissions = PERMISSION_MAPPINGS[category] as any
  return categoryPermissions[action.toUpperCase()] || null
} 