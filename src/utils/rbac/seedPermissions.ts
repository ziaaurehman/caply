import { prisma } from "@/lib/prisma";

/**
 * All permissions that should exist in the database
 * Maps permission names to their module and action
 */
const ALL_PERMISSIONS = [
  // User management
  {
    name: "users.create",
    module: "users",
    action: "create",
    displayName: "Create Users",
    description: "Can invite and create new users",
  },
  {
    name: "users.read",
    module: "users",
    action: "read",
    displayName: "View Users",
    description: "Can view user profiles and lists",
  },
  {
    name: "users.update",
    module: "users",
    action: "update",
    displayName: "Update Users",
    description: "Can edit user profiles and settings",
  },
  {
    name: "users.delete",
    module: "users",
    action: "delete",
    displayName: "Delete Users",
    description: "Can deactivate or delete users",
  },
  {
    name: "users.manage",
    module: "users",
    action: "manage",
    displayName: "Manage Users",
    description: "Can fully manage user accounts",
  },

  // Role management
  {
    name: "roles.create",
    module: "roles",
    action: "create",
    displayName: "Create Roles",
    description: "Can create new roles",
  },
  {
    name: "roles.read",
    module: "roles",
    action: "read",
    displayName: "View Roles",
    description: "Can view roles and permissions",
  },
  {
    name: "roles.update",
    module: "roles",
    action: "update",
    displayName: "Update Roles",
    description: "Can edit roles and assign permissions",
  },
  {
    name: "roles.delete",
    module: "roles",
    action: "delete",
    displayName: "Delete Roles",
    description: "Can delete roles",
  },
  {
    name: "roles.manage",
    module: "roles",
    action: "manage",
    displayName: "Manage Roles",
    description: "Can fully manage roles and permissions",
  },

  // Organization management
  {
    name: "organizations.read",
    module: "organizations",
    action: "read",
    displayName: "View Organizations",
    description: "Can view organization details",
  },
  {
    name: "organizations.update",
    module: "organizations",
    action: "update",
    displayName: "Update Organizations",
    description: "Can edit organization settings",
  },

  // Project management
  {
    name: "projects.create",
    module: "projects",
    action: "create",
    displayName: "Create Projects",
    description: "Can create new projects",
  },
  {
    name: "projects.read",
    module: "projects",
    action: "read",
    displayName: "View Projects",
    description: "Can view project details",
  },
  {
    name: "projects.update",
    module: "projects",
    action: "update",
    displayName: "Update Projects",
    description: "Can edit project details",
  },
  {
    name: "projects.delete",
    module: "projects",
    action: "delete",
    displayName: "Delete Projects",
    description: "Can delete projects",
  },

  // Task management
  {
    name: "tasks.create",
    module: "tasks",
    action: "create",
    displayName: "Create Tasks",
    description: "Can create new tasks",
  },
  {
    name: "tasks.read",
    module: "tasks",
    action: "read",
    displayName: "View Tasks",
    description: "Can view task details",
  },
  {
    name: "tasks.update",
    module: "tasks",
    action: "update",
    displayName: "Update Tasks",
    description: "Can edit task details",
  },
  {
    name: "tasks.delete",
    module: "tasks",
    action: "delete",
    displayName: "Delete Tasks",
    description: "Can delete tasks",
  },

  // Time tracking
  {
    name: "time_entries.read",
    module: "time_entries",
    action: "read",
    displayName: "View Time Entries",
    description: "Can view time entries",
  },
  {
    name: "time_entries.approve",
    module: "time_entries",
    action: "approve",
    displayName: "Approve Time Entries",
    description: "Can approve or reject time entries",
  },

  // Timesheet management
  {
    name: "timesheets.create",
    module: "timesheets",
    action: "create",
    displayName: "Create Timesheets",
    description: "Can create and save timesheet drafts",
  },
  {
    name: "timesheets.read",
    module: "timesheets",
    action: "read",
    displayName: "View Timesheets",
    description: "Can view timesheet submissions",
  },
  {
    name: "timesheets.update",
    module: "timesheets",
    action: "update",
    displayName: "Update Timesheets",
    description: "Can update and submit timesheets",
  },
  {
    name: "timesheets.delete",
    module: "timesheets",
    action: "delete",
    displayName: "Delete Timesheets",
    description: "Can delete timesheet entries",
  },
  {
    name: "timesheets.approve",
    module: "timesheets",
    action: "approve",
    displayName: "Approve Timesheets",
    description: "Can approve or reject timesheet submissions",
  },

  // Client management
  {
    name: "clients.create",
    module: "clients",
    action: "create",
    displayName: "Create Clients",
    description: "Can create new clients",
  },
  {
    name: "clients.read",
    module: "clients",
    action: "read",
    displayName: "View Clients",
    description: "Can view client information",
  },
  {
    name: "clients.update",
    module: "clients",
    action: "update",
    displayName: "Update Clients",
    description: "Can edit client information",
  },
  {
    name: "clients.delete",
    module: "clients",
    action: "delete",
    displayName: "Delete Clients",
    description: "Can delete clients",
  },

  // Invoice management
  {
    name: "invoices.create",
    module: "invoices",
    action: "create",
    displayName: "Create Invoices",
    description: "Can create invoices",
  },
  {
    name: "invoices.read",
    module: "invoices",
    action: "read",
    displayName: "View Invoices",
    description: "Can view invoices",
  },
  {
    name: "invoices.update",
    module: "invoices",
    action: "update",
    displayName: "Update Invoices",
    description: "Can edit invoices",
  },
  {
    name: "invoices.delete",
    module: "invoices",
    action: "delete",
    displayName: "Delete Invoices",
    description: "Can delete invoices",
  },
  {
    name: "invoices.send",
    module: "invoices",
    action: "send",
    displayName: "Send Invoices",
    description: "Can send invoices to clients",
  },

  // Estimate management
  {
    name: "estimates.create",
    module: "estimates",
    action: "create",
    displayName: "Create Estimates",
    description: "Can create project estimates",
  },
  {
    name: "estimates.read",
    module: "estimates",
    action: "read",
    displayName: "View Estimates",
    description: "Can view estimates",
  },
  {
    name: "estimates.update",
    module: "estimates",
    action: "update",
    displayName: "Update Estimates",
    description: "Can edit estimates",
  },
  {
    name: "estimates.delete",
    module: "estimates",
    action: "delete",
    displayName: "Delete Estimates",
    description: "Can delete estimates",
  },
  {
    name: "estimates.send",
    module: "estimates",
    action: "send",
    displayName: "Send Estimates",
    description: "Can send estimates to clients",
  },

  // Expense management
  {
    name: "expenses.read",
    module: "expenses",
    action: "read",
    displayName: "View Expenses",
    description: "Can view expense entries",
  },
  {
    name: "expenses.approve",
    module: "expenses",
    action: "approve",
    displayName: "Approve Expenses",
    description: "Can approve or reject expenses",
  },

  // Leave management
  {
    name: "leave_requests.create",
    module: "leave_requests",
    action: "create",
    displayName: "Create Leave Requests",
    description: "Can create leave requests",
  },
  {
    name: "leave_requests.read",
    module: "leave_requests",
    action: "read",
    displayName: "View Leave Requests",
    description: "Can view leave requests",
  },
  {
    name: "leave_requests.update",
    module: "leave_requests",
    action: "update",
    displayName: "Update Leave Requests",
    description: "Can edit leave requests",
  },
  {
    name: "leave_requests.approve",
    module: "leave_requests",
    action: "approve",
    displayName: "Approve Leave Requests",
    description: "Can approve or reject leave requests",
  },

  // Capacity planning
  {
    name: "capacity.read",
    module: "capacity",
    action: "read",
    displayName: "View Capacity",
    description: "Can view capacity planning data",
  },
  {
    name: "capacity.manage",
    module: "capacity",
    action: "manage",
    displayName: "Manage Capacity",
    description: "Can manage resource allocation and capacity",
  },
  {
    name: "capacity.create",
    module: "capacity",
    action: "create",
    displayName: "Create Capacity",
    description: "Can create capacity allocations",
  },
  {
    name: "capacity.update",
    module: "capacity",
    action: "update",
    displayName: "Update Capacity",
    description: "Can update capacity allocations",
  },
  {
    name: "capacity.delete",
    module: "capacity",
    action: "delete",
    displayName: "Delete Capacity",
    description: "Can delete capacity allocations",
  },

  // Reports and settings
  {
    name: "reports.read",
    module: "reports",
    action: "read",
    displayName: "View Reports",
    description: "Can view reports and analytics",
  },
  {
    name: "reports.export",
    module: "reports",
    action: "export",
    displayName: "Export Reports",
    description: "Can export reports and data",
  },
  {
    name: "settings.read",
    module: "settings",
    action: "read",
    displayName: "View Settings",
    description: "Can view organization settings",
  },
  {
    name: "settings.update",
    module: "settings",
    action: "update",
    displayName: "Update Settings",
    description: "Can modify organization settings",
  },
];

/**
 * Ensures all permissions exist in the database
 * Creates them if they don't exist (idempotent)
 */
export async function ensurePermissionsExist(): Promise<void> {
  try {
    // Get all existing permissions
    const existingPermissions = await prisma.permission.findMany({
      select: { name: true },
    });
    const existingNames = new Set(existingPermissions.map((p) => p.name));

    // Find permissions that need to be created
    const permissionsToCreate = ALL_PERMISSIONS.filter(
      (p) => !existingNames.has(p.name)
    );

    if (permissionsToCreate.length > 0) {
      console.log(
        `Creating ${permissionsToCreate.length} missing permissions...`
      );
      await prisma.permission.createMany({
        data: permissionsToCreate,
        skipDuplicates: true,
      });
      console.log("✅ Permissions seeded successfully");
    } else {
      console.log("✅ All permissions already exist");
    }
  } catch (error: any) {
    console.error("Error ensuring permissions exist:", error);
    // Don't throw - we'll try to continue anyway
  }
}
