import { createClient } from '@/utils/supabase/server';

// Define the interface for our role template
interface RoleTemplate {
  name: string;
  display_name: string;
  description: string;
  is_system_role: boolean;
  permissions: string[];
}

// Default organization roles configuration (maps to database structure)
const DEFAULT_ORGANIZATION_ROLES: RoleTemplate[] = [
  {
    name: 'admin',
    display_name: 'Organization Administrator',
    description: 'Full control over organization',
    is_system_role: false,
    permissions: [
      // User management
      'users.create',
      'users.read',
      'users.update',
      'users.delete',
      
      // Role management
      'roles.create',
      'roles.read',
      'roles.update',
      'roles.delete',
      'roles.manage',
      
      // Organization management (except create/delete org)
      'organizations.read',
      'organizations.update',
      
      // Project management
      'projects.create',
      'projects.read',
      'projects.update',
      'projects.delete',
      
      // Task management
      'tasks.create',
      'tasks.read',
      'tasks.update',
      'tasks.delete',
      
      // Time tracking
      'time_entries.read',
      'time_entries.approve',
      
      // Client management
      'clients.create',
      'clients.read',
      'clients.update',
      'clients.delete',
      
      // Invoice management
      'invoices.create',
      'invoices.read',
      'invoices.update',
      'invoices.delete',
      'invoices.send',
      
      // Estimate management
      'estimates.create',
      'estimates.read',
      'estimates.update',
      'estimates.delete',
      'estimates.send',
      
      // Expense management
      'expenses.read',
      'expenses.approve',
      
      // Leave management
      'leave_requests.read',
      'leave_requests.approve',
      
      // Capacity planning
      'capacity.read',
      'capacity.manage',
      'capacity.create',
      'capacity.update',
      'capacity.delete',
      
      // Reports and settings
      'reports.read',
      'reports.export',
      'settings.read',
      'settings.update'
    ]
  },
  {
    name: 'manager',
    display_name: 'Manager',
    description: 'Project and team management',
    is_system_role: false,
    permissions: [
      'users.read',
      'projects.create',
      'projects.read',
      'projects.update',
      'projects.delete',
      'tasks.create',
      'tasks.read',
      'tasks.update',
      'tasks.delete',
      'time_entries.read',
      'time_entries.approve',
      'clients.read',
      'clients.create',
      'clients.update',
      'invoices.create',
      'invoices.read',
      'invoices.update',
      'invoices.send',
      'estimates.create',
      'estimates.read',
      'estimates.update',
      'estimates.send',
      'expenses.read',
      'expenses.approve',
      'leave_requests.read',
      'leave_requests.approve',
      'capacity.read',
      'capacity.manage',
      'reports.read',
      'reports.export',
      'settings.read'
    ]
  },
  {
    name: 'member',
    display_name: 'Team Member',
    description: 'Basic team member access',
    is_system_role: false,
    permissions: [
      'projects.read',
      'tasks.read',
      'tasks.update',
      'time_entries.create',
      'time_entries.read',
      'time_entries.update',
      'clients.read',
      'invoices.read',
      'estimates.read',
      'expenses.create',
      'expenses.read',
      'leave_requests.create',
      'leave_requests.read',
      'leave_requests.update'
    ]
  }
];

export interface CreateOrganizationData {
  name: string;
  slug: string;
  owner_id: string;
  description?: string;
}

export interface CreateOrganizationResult {
  organization: any;
  roles: any[];
  error?: string;
}

/**
 * Creates an organization with default roles and permissions
 */
export async function createOrganizationWithRoles(
  organizationData: CreateOrganizationData
): Promise<CreateOrganizationResult> {
  const supabase = await createClient();

  try {
    // 1. Create the organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert([organizationData])
      .select()
      .single();

    if (orgError) {
      return { organization: null, roles: [], error: `Failed to create organization: ${orgError.message}` };
    }

    // 2. Create organization-specific roles
    const rolesToCreate = DEFAULT_ORGANIZATION_ROLES.map((roleTemplate: RoleTemplate) => ({
      name: roleTemplate.name,
      display_name: roleTemplate.display_name,
      description: roleTemplate.description,
      is_system_role: roleTemplate.is_system_role,
      organization_id: organization.id,
    }));

    const { data: createdRoles, error: rolesError } = await supabase
      .from('roles')
      .insert(rolesToCreate)
      .select();

    if (rolesError) {
      return { organization, roles: [], error: `Failed to create roles: ${rolesError.message}` };
    }

    // 3. Get all permissions for role assignments
    const { data: permissions, error: permissionsError } = await supabase
      .from('permissions')
      .select('*');

    if (permissionsError) {
      return { organization, roles: createdRoles, error: `Failed to fetch permissions: ${permissionsError.message}` };
    }

    // 4. Assign permissions to each role
    const rolePermissionsToCreate = [];

    for (const role of createdRoles) {
      const roleTemplate = DEFAULT_ORGANIZATION_ROLES.find((r: RoleTemplate) => r.name === role.name);
      if (roleTemplate) {
        const rolePermissions = permissions
          .filter(permission => roleTemplate.permissions.includes(permission.name))
          .map(permission => ({
            role_id: role.id,
            permission_id: permission.id,
          }));

        rolePermissionsToCreate.push(...rolePermissions);
      }
    }

    if (rolePermissionsToCreate.length > 0) {
      const { error: rolePermissionsError } = await supabase
        .from('role_permissions')
        .insert(rolePermissionsToCreate);

      if (rolePermissionsError) {
        return { 
          organization, 
          roles: createdRoles, 
          error: `Failed to assign permissions: ${rolePermissionsError.message}` 
        };
      }
    }

    return { organization, roles: createdRoles };
  } catch (error: any) {
    return { 
      organization: null, 
      roles: [], 
      error: `Unexpected error: ${error.message}` 
    };
  }
}

/**
 * Adds a user as an admin to an organization
 */
export async function addUserAsAdmin(
  userId: string, 
  organizationId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  try {
    // Get the admin role for this organization
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .eq('organization_id', organizationId)
      .eq('is_system_role', false)
      .single();

    if (roleError || !adminRole) {
      return { error: `Failed to find admin role: ${roleError?.message || 'Role not found'}` };
    }

    // Add user as organization member with admin role
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert([{
        organization_id: organizationId,
        user_id: userId,
        role_id: adminRole.id,
        status: 'active',
      }]);

    if (memberError) {
      return { error: `Failed to add user as admin: ${memberError.message}` };
    }

    return {};
  } catch (error: any) {
    return { error: `Unexpected error: ${error.message}` };
  }
}

/**
 * Helper function to generate organization slug from name
 */
export function generateOrgSlug(name: string, userId: string): string {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const userIdShort = userId.substring(0, 8);
  return `org-${cleanName}-${userIdShort}`;
}
