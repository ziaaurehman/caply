import { User } from './types';

type Permission = 'read' | 'write' | 'delete' | 'approve';
type Resource = 'dashboard' | 'team' | 'projects' | 'kanban' | 'capacity' | 'timesheets' | 'leave' | 'reports' | 'settings' | 'licenses' | 'billing' | 'support' | 'estimates' | 'expenses' | 'invoices';

const permissions: Record<string, Record<Resource, Permission[]>> = {
  admin: {
    dashboard: ['read', 'write'],
    team: ['read', 'write', 'delete'],
    projects: ['read', 'write', 'delete'],
    kanban: ['read', 'write', 'delete'],
    capacity: ['read', 'write'],
    timesheets: ['read', 'write', 'approve'],
    leave: ['read', 'write', 'approve'],
    reports: ['read', 'write'],
    settings: ['read', 'write'],
    licenses: ['read', 'write'],
    billing: ['read', 'write'],
    support: ['read', 'write', 'approve'],
    estimates: ['read', 'write', 'approve'],
    expenses: ['read', 'write', 'delete', 'approve'],
    invoices: ['read', 'write', 'approve'],
  },
  support: {
    dashboard: ['read'],
    team: ['read'],
    projects: [],
    kanban: [],
    capacity: [],
    timesheets: [],
    leave: [],
    reports: ['read'],
    settings: ['read'],
    licenses: ['read', 'write'],
    billing: ['read', 'write'],
    support: ['read', 'write', 'approve'],
    estimates: ['read'],
    expenses: ['read'],
    invoices: ['read'],
  },
  manager: {
    dashboard: ['read'],
    team: ['read'],
    projects: ['read', 'write'],
    kanban: ['read', 'write'],
    capacity: ['read', 'write'],
    timesheets: ['read', 'approve'],
    leave: ['read'],
    reports: ['read'],
    settings: [],
    licenses: [],
    billing: [],
    support: ['read'],
    estimates: ['read', 'write'],
    expenses: ['read', 'write', 'approve'],
    invoices: ['read', 'write'],
  },
  employee: {
    dashboard: ['read'],
    team: ['read'],
    projects: ['read'],
    kanban: ['read', 'write'],
    capacity: ['read'],
    timesheets: ['read', 'write'],
    leave: ['read', 'write'],
    reports: ['read'],
    settings: [],
    licenses: [],
    billing: [],
    support: ['read'],
    estimates: ['read'],
    expenses: ['read', 'write'],
    invoices: ['read'],
  },
};

export const hasPermission = (user: User | null, resource: Resource, action: Permission): boolean => {
  if (!user) return false;
  return permissions[user.role]?.[resource]?.includes(action) || false;
};

export const canAccessRoute = (user: User | null, route: string): boolean => {
  if (!user) return false;
  
  const routePermissions: Record<string, Resource> = {
    '/dashboard': 'dashboard',
    '/employees': 'team',
    '/projects': 'projects',
    '/projects/management': 'kanban',
    '/capacity': 'capacity',
    '/timesheets': 'timesheets',
    '/leave': 'leave',
    '/reports': 'reports',
    '/settings': 'settings',
    '/licenses': 'licenses',
    '/billing': 'billing',
    '/support': 'support',
    '/estimates': 'estimates',
    '/expenses': 'expenses',
    '/invoices': 'invoices',
  };
  
  const resource = routePermissions[route];
  if (!resource) return true; // Allow access to unprotected routes
  
  return permissions[user.role]?.[resource]?.includes('read') || false;
};