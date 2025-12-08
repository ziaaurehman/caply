import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

// GET /api/organizations - Get user's organizations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's organizations with complete membership and role data
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId,
        status: "active",
      },
      include: {
        organization: true,
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const transformedOrganizations = memberships.map((org) => ({
      id: org.organization.id,
      name: org.organization.name,
      slug: org.organization.slug,
      description: org.organization.description,
      logo_url: org.organization.logoUrl,
      is_owner: org.organization.ownerId === userId,
      created_at: org.organization.createdAt,
      membership_status: org.status,
      membership: {
        id: org.id,
        organization_id: org.organizationId,
        user_id: org.userId,
        role_id: org.roleId,
        status: org.status,
        hourly_rate: org.hourlyRate,
        weekly_capacity: org.weeklyCapacity,
        department: org.department,
        hire_date: org.hireDate,
        joined_at: org.joinedAt,
        role: {
          id: org.role.id,
          name: org.role.name,
          display_name: org.role.displayName,
          description: org.role.description,
          permissions:
            org.role.rolePermissions?.map((rp) => ({
              resource: rp.permission.module,
              action: rp.permission.action,
            })) || [],
        },
      },
    }));

    return NextResponse.json({ organizations: transformedOrganizations });
  } catch (error) {
    console.error("Error in organizations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/organizations - Create a new organization
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        {
          error: "Organization name is required",
        },
        { status: 400 }
      );
    }

    // Create a slug from the name
    const slug =
      "org-" +
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") +
      "-" +
      Math.random().toString(36).substr(2, 8);

    // Create the organization and set up default roles and membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the organization
      const organization = await tx.organization.create({
        data: {
          name,
          slug,
          description: description || null,
          ownerId: session.user.id,
        },
      });

      // Create default roles for the organization
      const adminRole = await tx.role.create({
        data: {
          name: "admin",
          displayName: "Organization Administrator",
          description: "Full control over organization",
          isSystemRole: false,
          organizationId: organization.id,
        },
      });

      const managerRole = await tx.role.create({
        data: {
          name: "manager",
          displayName: "Manager",
          description: "Project and team management",
          isSystemRole: false,
          organizationId: organization.id,
        },
      });

      const memberRole = await tx.role.create({
        data: {
          name: "member",
          displayName: "Team Member",
          description: "Basic team member access",
          isSystemRole: false,
          organizationId: organization.id,
        },
      });

      // Get default permissions for admin role (copy from existing system admin if exists)
      const systemAdminRole = await tx.role.findFirst({
        where: {
          name: "admin",
          isSystemRole: true,
        },
        include: {
          rolePermissions: true,
        },
      });

      if (systemAdminRole) {
        // Copy permissions to new admin role
        await tx.rolePermission.createMany({
          data: systemAdminRole.rolePermissions.map((rp) => ({
            roleId: adminRole.id,
            permissionId: rp.permissionId,
          })),
        });
      }

      // Add the creator as an admin member
      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: session.user.id,
          roleId: adminRole.id,
          status: "active",
        },
      });

      return organization;
    });

    return NextResponse.json({
      organization: {
        id: result.id,
        name: result.name,
        slug: result.slug,
        description: result.description,
        is_owner: true,
        created_at: result.createdAt,
      },
      message: "Organization created successfully",
    });
  } catch (error) {
    console.error("Error in POST organizations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
