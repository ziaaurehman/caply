import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

// PUT /api/team-members/[id] - Update team member
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberId = params.id;
    const body = await request.json();
    const { roleId, department, hourlyRate, weeklyCapacity } = body;

    // Get organization ID from headers
    const headerOrgId = request.headers.get("x-organization-id");

    if (!headerOrgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(headerOrgId, {
      resource: "users",
      action: "update",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const userContext = validation.context!;

    // Get the member to update
    const member = await prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId: headerOrgId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Update the member
    const updateData: any = {};
    if (roleId) updateData.roleId = roleId;
    if (department !== undefined) updateData.department = department;
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    if (weeklyCapacity !== undefined)
      updateData.weeklyCapacity = weeklyCapacity;

    const updatedMember = await prisma.organizationMember.update({
      where: { id: memberId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            position: true,
            phone: true,
            isActive: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
          },
        },
      },
    });

    // Transform to match expected format
    const transformedMember = {
      id: updatedMember.id,
      user_id: updatedMember.userId,
      role_id: updatedMember.roleId,
      hourly_rate: updatedMember.hourlyRate,
      weekly_capacity: updatedMember.weeklyCapacity,
      department: updatedMember.department,
      hire_date: updatedMember.hireDate,
      status: updatedMember.status,
      joined_at: updatedMember.joinedAt,
      users: {
        id: updatedMember.user.id,
        email: updatedMember.user.email,
        full_name: updatedMember.user.fullName,
        avatar_url: updatedMember.user.avatarUrl,
        position: updatedMember.user.position,
        phone: updatedMember.user.phone,
        is_active: updatedMember.user.isActive,
      },
      roles: {
        id: updatedMember.role.id,
        name: updatedMember.role.name,
        display_name: updatedMember.role.displayName,
        description: updatedMember.role.description,
      },
    };

    return NextResponse.json({
      success: true,
      member: transformedMember,
    });
  } catch (error) {
    console.error("Error in team member PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/team-members/[id] - Remove team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberId = params.id;

    // Get organization ID from headers
    const headerOrgId = request.headers.get("x-organization-id");

    if (!headerOrgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(headerOrgId, {
      resource: "users",
      action: "delete",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const userContext = validation.context!;

    // Get the member to delete
    const member = await prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId: headerOrgId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent deleting yourself
    if (member.userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself from the organization" },
        { status: 400 }
      );
    }

    // Check if the user is an organization owner
    const organization = await prisma.organization.findUnique({
      where: { id: headerOrgId },
      select: { ownerId: true },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Prevent deleting organization owner
    if (organization.ownerId === member.userId) {
      return NextResponse.json(
        {
          error:
            "Cannot remove organization owner. Transfer ownership first before removing this member.",
        },
        { status: 400 }
      );
    }

    // Delete the member
    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Error in team member DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
