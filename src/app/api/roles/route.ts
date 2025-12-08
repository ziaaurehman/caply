import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateOrganizationAccess,
  validateOrganizationAccessWithId,
} from "@/utils/organizationUtils";

// GET /api/roles - Get organization-specific roles with pagination
export async function GET(request: NextRequest) {
  try {
    // Get organization ID from headers or use session-based validation
    const headerOrgId = request.headers.get("x-organization-id");
    const url = new URL(request.url);

    // Get pagination parameters
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const search = url.searchParams.get("search") || "";

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

    const organizationId = validation.context!.organizationId;

    console.log("User organization:", organizationId);

    // Calculate offset for pagination
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      organizationId,
      isSystemRole: false,
    };

    // Add search filter if search term provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count and roles in parallel
    const [totalCount, roles] = await Promise.all([
      prisma.role.count({ where }),
      prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      }),
    ]);

    console.log(
      `Found ${roles?.length || 0} roles for organization ${organizationId}`
    );

    // Transform the data to flatten permissions
    const transformedRoles = roles.map((role) => ({
      id: role.id,
      name: role.name,
      display_name: role.displayName,
      description: role.description,
      is_system_role: role.isSystemRole,
      organization_id: role.organizationId,
      created_at: role.createdAt,
      updated_at: role.updatedAt,
      permissions:
        role.rolePermissions?.map((rp) => rp.permission).filter(Boolean) || [],
    }));

    const totalPages = Math.ceil(totalCount / limit);

    const result = {
      roles: transformedRoles,
      organization_id: organizationId,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in roles API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/roles - Create a new organization-specific role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, display_name, description, permission_ids, organizationId } =
      body;

    // Get organization ID from body, headers, or use session-based validation
    const headerOrgId = request.headers.get("x-organization-id");
    const orgId = organizationId || headerOrgId;

    let validation;
    if (orgId) {
      // Use header/body-based validation if organization ID is provided
      validation = await validateOrganizationAccessWithId(orgId, {
        resource: "roles",
        action: "create",
      });
    } else {
      // Fallback to session-based validation
      validation = await validateOrganizationAccess({
        resource: "roles",
        action: "create",
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

    const finalOrganizationId = validation.context!.organizationId;
    const userId = validation.context!.userId;

    console.log("Creating role with data:", {
      name,
      display_name,
      description,
      permission_ids,
      organizationId: finalOrganizationId,
    });

    if (
      !name ||
      !display_name ||
      !permission_ids ||
      !Array.isArray(permission_ids)
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields: name, display_name, permission_ids",
        },
        { status: 400 }
      );
    }

    // Check if role name already exists in this organization
    const existingRole = await prisma.role.findFirst({
      where: {
        name,
        organizationId: finalOrganizationId,
      },
    });

    if (existingRole) {
      return NextResponse.json(
        {
          error: "Role name already exists in this organization",
        },
        { status: 400 }
      );
    }

    // Create the role and permissions in a transaction
    const newRole = await prisma.$transaction(async (tx) => {
      // Create the role
      const role = await tx.role.create({
        data: {
          name,
          displayName: display_name,
          description: description || null,
          organizationId: finalOrganizationId,
          isSystemRole: false,
        },
      });

      // Create role-permission relationships
      if (permission_ids.length > 0) {
        await tx.rolePermission.createMany({
          data: permission_ids.map((permissionId: string) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }

      // Fetch the role with permissions
      return await tx.role.findUnique({
        where: { id: role.id },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });

    console.log("Role created:", newRole);

    return NextResponse.json({
      role: newRole,
      message: "Role created successfully",
    });
  } catch (error) {
    console.error("Error in POST roles API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
