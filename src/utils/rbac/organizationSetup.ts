import { prisma } from "@/lib/prisma";
import { ensurePermissionsExist } from "./seedPermissions";

// Define the interface for our role template
interface RoleTemplate {
  name: string;
  display_name: string;
  description: string;
  is_system_role: boolean;
  permissions: string[];
}

// Default organization roles configuration (maps to database structure)
export const DEFAULT_ORGANIZATION_ROLES: RoleTemplate[] = [
  {
    name: "admin",
    display_name: "Organization Administrator",
    description: "Full control over organization",
    is_system_role: false,
    permissions: [
      // User management
      "users.create",
      "users.read",
      "users.update",
      "users.delete",

      // Role management
      "roles.create",
      "roles.read",
      "roles.update",
      "roles.delete",
      "roles.manage",

      // Organization management (except create/delete org)
      "organizations.read",
      "organizations.update",

      // Project management
      "projects.create",
      "projects.read",
      "projects.update",
      "projects.delete",

      // Task management
      "tasks.create",
      "tasks.read",
      "tasks.update",
      "tasks.delete",

      // Time tracking
      "time_entries.read",
      "time_entries.approve",

      // Timesheet management
      "timesheets.create",
      "timesheets.read",
      "timesheets.update",
      "timesheets.delete",
      "timesheets.approve",

      // Client management
      "clients.create",
      "clients.read",
      "clients.update",
      "clients.delete",

      // Invoice management
      "invoices.create",
      "invoices.read",
      "invoices.update",
      "invoices.delete",
      "invoices.send",

      // Estimate management
      "estimates.create",
      "estimates.read",
      "estimates.update",
      "estimates.delete",
      "estimates.send",

      // Expense management
      "expenses.read",
      "expenses.approve",

      // Leave management
      "leave_requests.read",
      "leave_requests.approve",
      "leave_requests.create",
      "leave_requests.read",
      "leave_requests.update",

      // Capacity planning
      "capacity.read",
      "capacity.manage",
      "capacity.create",
      "capacity.update",
      "capacity.delete",

      // Reports and settings
      "reports.read",
      "reports.export",
      "settings.read",
      "settings.update",
    ],
  },
  {
    name: "manager",
    display_name: "Manager",
    description: "Project and team management",
    is_system_role: false,
    permissions: [
      "users.read",
      "projects.create",
      "projects.read",
      "projects.update",
      "projects.delete",
      "tasks.create",
      "tasks.read",
      "tasks.update",
      "tasks.delete",
      "time_entries.read",
      "time_entries.approve",
      "timesheets.read",
      "timesheets.approve",
      "clients.read",
      "clients.create",
      "clients.update",
      "invoices.create",
      "invoices.read",
      "invoices.update",
      "invoices.send",
      "estimates.create",
      "estimates.read",
      "estimates.update",
      "estimates.send",
      "expenses.read",
      "expenses.approve",
      "leave_requests.read",
      "leave_requests.approve",
      "capacity.read",
      "capacity.manage",
      "reports.read",
      "reports.export",
      "settings.read",
    ],
  },
  {
    name: "member",
    display_name: "Team Member",
    description: "Basic team member access",
    is_system_role: false,
    permissions: [
      "projects.read",
      "users.read",
      "capacity.read",
      "tasks.read",
      "projects.update",
      "tasks.update",
      "time_entries.create",
      "time_entries.read",
      "time_entries.update",
      "timesheets.create",
      "timesheets.read",
      "timesheets.update",
      "clients.read",
      // "invoices.read",
      "estimates.read",
      "expenses.create",
      "expenses.read",
      "leave_requests.create",
      "leave_requests.read",
      "leave_requests.update",
    ],
  },
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
  try {
    // 0. Ensure all permissions exist in the database first
    await ensurePermissionsExist();

    // 1. Create the organization
    const organization = await prisma.organization.create({
      data: {
        name: organizationData.name,
        slug: organizationData.slug,
        ownerId: organizationData.owner_id,
        description: organizationData.description,
      },
    });

    // 2. Create organization-specific roles
    const rolesToCreate = DEFAULT_ORGANIZATION_ROLES.map(
      (roleTemplate: RoleTemplate) => ({
        name: roleTemplate.name,
        displayName: roleTemplate.display_name,
        description: roleTemplate.description,
        isSystemRole: roleTemplate.is_system_role,
        organizationId: organization.id,
      })
    );

    const createdRoles = await prisma.role.createManyAndReturn({
      data: rolesToCreate,
    });

    // 3. Get all permissions for role assignments
    const permissions = await prisma.permission.findMany();

    if (permissions.length === 0) {
      console.error(
        "⚠️ No permissions found in database after seeding attempt"
      );
      return {
        organization: null,
        roles: [],
        error:
          "No permissions available in database. Please seed permissions first.",
      };
    }

    // 4. Assign permissions to each role
    const rolePermissionsToCreate: Array<{
      roleId: string;
      permissionId: string;
    }> = [];

    for (const role of createdRoles) {
      const roleTemplate = DEFAULT_ORGANIZATION_ROLES.find(
        (r: RoleTemplate) => r.name === role.name
      );
      if (roleTemplate) {
        const rolePermissions = permissions
          .filter((permission: { name: string }) =>
            roleTemplate.permissions.includes(permission.name)
          )
          .map((permission: { id: string }) => ({
            roleId: role.id,
            permissionId: permission.id,
          }));

        rolePermissionsToCreate.push(...rolePermissions);
      }
    }

    if (rolePermissionsToCreate.length > 0) {
      await prisma.rolePermission.createMany({
        data: rolePermissionsToCreate,
        skipDuplicates: true,
      });
      console.log(
        `✅ Created ${rolePermissionsToCreate.length} role-permission assignments`
      );
    } else {
      console.warn(
        "⚠️ No role permissions were created. This might indicate missing permissions."
      );
    }

    return { organization, roles: createdRoles };
  } catch (error: any) {
    return {
      organization: null,
      roles: [],
      error: `Unexpected error: ${error.message}`,
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
  try {
    // Get the admin role for this organization
    const adminRole = await prisma.role.findFirst({
      where: {
        name: "admin",
        organizationId: organizationId,
        isSystemRole: false,
      },
    });

    if (!adminRole) {
      return { error: "Failed to find admin role: Role not found" };
    }

    // Add user as organization member with admin role
    await prisma.organizationMember.create({
      data: {
        organizationId: organizationId,
        userId: userId,
        roleId: adminRole.id,
        status: "active",
      },
    });

    return {};
  } catch (error: any) {
    return { error: `Unexpected error: ${error.message}` };
  }
}

/**
 * Helper function to generate organization slug from name
 */
export function generateOrgSlug(name: string, userId: string): string {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");
  const userIdShort = userId.substring(0, 8);
  return `org-${cleanName}-${userIdShort}`;
}
