import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensurePermissionsExist } from "@/utils/rbac/seedPermissions";
import { DEFAULT_ORGANIZATION_ROLES } from "@/utils/rbac/organizationSetup";

interface RoleTemplate {
  name: string;
  display_name: string;
  description: string;
  is_system_role: boolean;
  permissions: string[];
}

/**
 * POST /api/admin/fix-permissions
 * Fixes missing permissions for existing organizations
 * This should be run once to fix organizations created before permissions were seeded
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure all permissions exist
    await ensurePermissionsExist();

    // Get all organizations
    const organizations = await prisma.organization.findMany({
      include: {
        roles: true,
      },
    });

    const results = [];

    for (const org of organizations) {
      // Get all permissions
      const permissions = await prisma.permission.findMany();
      const permissionMap = new Map(permissions.map((p) => [p.name, p.id]));

      // For each role in the organization
      for (const role of org.roles) {
        // Find the role template
        const roleTemplate = DEFAULT_ORGANIZATION_ROLES.find(
          (rt: RoleTemplate) => rt.name === role.name
        );

        if (!roleTemplate) continue;

        // Get existing role permissions
        const existingRolePermissions = await prisma.rolePermission.findMany({
          where: { roleId: role.id },
          select: { permissionId: true },
        });
        const existingPermissionIds = new Set(
          existingRolePermissions.map((rp) => rp.permissionId)
        );

        // Create missing role permissions
        const rolePermissionsToCreate = roleTemplate.permissions
          .map((permName) => {
            const permissionId = permissionMap.get(permName);
            if (!permissionId || existingPermissionIds.has(permissionId)) {
              return null;
            }
            return {
              roleId: role.id,
              permissionId,
            };
          })
          .filter(
            (rp): rp is { roleId: string; permissionId: string } => rp !== null
          );

        if (rolePermissionsToCreate.length > 0) {
          await prisma.rolePermission.createMany({
            data: rolePermissionsToCreate,
            skipDuplicates: true,
          });

          results.push({
            organization: org.name,
            role: role.name,
            permissionsAdded: rolePermissionsToCreate.length,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed permissions for ${results.length} role(s)`,
      results,
    });
  } catch (error: any) {
    console.error("Error fixing permissions:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
