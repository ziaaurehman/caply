import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    const { id: userId } = await params;
    const currentUserId = session.user.id;

    // Check if user is requesting their own data or has permission to view other users
    if (userId !== currentUserId) {
      // Check if current user has permission to view other users
      // Get current user's role and check for users.read permission
      const currentUserMember = await prisma.organizationMember.findFirst({
        where: {
          userId: currentUserId,
          status: "active",
        },
        include: {
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

      const hasPermission = currentUserMember?.role.rolePermissions.some(
        (rp) => rp.permission.name === "users.read"
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: "Forbidden - Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    // Get user's role and permissions
    const userRoleData = await prisma.organizationMember.findFirst({
      where: {
        userId,
        status: "active",
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            isSystemRole: true,
          },
        },
      },
    });

    if (!userRoleData) {
      return NextResponse.json(
        { error: "User role not found" },
        { status: 404 }
      );
    }

    // Get all permissions for the user's role
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        roleId: userRoleData.roleId,
      },
      include: {
        permission: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            module: true,
            action: true,
          },
        },
      },
    });

    // Check if user is super admin
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });

    if (!userData) {
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    const userPermissions = rolePermissions
      .map((rp) => rp.permission)
      .filter(Boolean);

    return NextResponse.json({
      userId,
      organizationId: userRoleData.organizationId,
      role: userRoleData.role,
      permissions: userPermissions,
      isSuperAdmin: userData.isSuperAdmin || false,
      status: userRoleData.status,
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
