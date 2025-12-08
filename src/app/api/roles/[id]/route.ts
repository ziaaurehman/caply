import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateOrganizationAccess,
  validateOrganizationAccessWithId,
} from "@/utils/organizationUtils";

interface Params {
  id: string;
}

// GET /api/roles/[id] - Get specific role details
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // Get organization ID from headers or use session-based validation
    const headerOrgId = request.headers.get("x-organization-id");

    let validation;
    if (headerOrgId) {
      // Use header-based validation if organization ID is provided
      validation = await validateOrganizationAccessWithId(headerOrgId, {
        resource: "roles",
        action: "read",
      });
    } else {
      // Fallback to session-based validation
      validation = await validateOrganizationAccess({
        resource: "roles",
        action: "read",
      });
    }

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const roleId = params.id;
    const organizationId = validation.context!.organizationId;

    // Get role details
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Transform the data
    const transformedRole = {
      id: role.id,
      name: role.name,
      display_name: role.displayName,
      description: role.description,
      is_system_role: role.isSystemRole,
      organization_id: role.organizationId,
      permissions:
        role.rolePermissions?.map((rp) => rp.permission).filter(Boolean) || [],
    };

    return NextResponse.json({ role: transformedRole });
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/roles/[id] - Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // Get organization ID from headers or use session-based validation
    const headerOrgId = request.headers.get("x-organization-id");

    let validation;
    if (headerOrgId) {
      // Use header-based validation if organization ID is provided
      validation = await validateOrganizationAccessWithId(headerOrgId, {
        resource: "roles",
        action: "update",
      });
    } else {
      // Fallback to session-based validation
      validation = await validateOrganizationAccess({
        resource: "roles",
        action: "update",
      });
    }

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const roleId = params.id;
    const organizationId = validation.context!.organizationId;

    const body = await request.json();
    const { display_name, description, permission_ids } = body;

    // Update role and permissions in a transaction
    await prisma.$transaction(async (tx) => {
      // Update role basic info
      await tx.role.update({
        where: {
          id: roleId,
          organizationId,
        },
        data: {
          displayName: display_name,
          description,
        },
      });

      // Update permissions if provided
      if (permission_ids && Array.isArray(permission_ids)) {
        // Delete existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        // Add new permissions
        if (permission_ids.length > 0) {
          await tx.rolePermission.createMany({
            data: permission_ids.map((permissionId: string) => ({
              roleId,
              permissionId,
            })),
          });
        }
      }
    });

    return NextResponse.json({ message: "Role updated successfully" });
  } catch (error) {
    console.error("Error in PUT roles API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[id] - Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // Get organization ID from headers or use session-based validation
    const headerOrgId = request.headers.get("x-organization-id");

    let validation;
    if (headerOrgId) {
      // Use header-based validation if organization ID is provided
      validation = await validateOrganizationAccessWithId(headerOrgId, {
        resource: "roles",
        action: "delete",
      });
    } else {
      // Fallback to session-based validation
      validation = await validateOrganizationAccess({
        resource: "roles",
        action: "delete",
      });
    }

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const roleId = params.id;
    const organizationId = validation.context!.organizationId;

    // Check if role exists and belongs to the organization
    const roleToDelete = await prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!roleToDelete) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Prevent deletion of default roles
    if (["admin", "manager", "member"].includes(roleToDelete.name)) {
      return NextResponse.json(
        {
          error: "Cannot delete default organization roles",
        },
        { status: 400 }
      );
    }

    // Check if role is being used by any members
    const membersWithRole = await prisma.organizationMember.findMany({
      where: {
        roleId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (membersWithRole.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete role that is assigned to team members",
        },
        { status: 400 }
      );
    }

    // Delete the role (permissions will be deleted automatically via CASCADE)
    await prisma.role.delete({
      where: {
        id: roleId,
      },
    });

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE roles API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
