import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Get organization ID from query params or headers
    const url = new URL(req.url);
    const organizationId =
      url.searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        {
          error: "Organization ID is required",
        },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "projects",
      action: "read",
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

    // First verify the project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has access to this project (either admin/manager or project member)
    const hasFullAccess =
      userContext.membership.role.name === "admin" ||
      userContext.membership.role.name === "manager" ||
      userContext.membership.role.permissions.some(
        (p) => p.resource === "projects" && p.action === "manage"
      );

    if (!hasFullAccess) {
      // Check if user is a member of this project
      const memberCheck = await prisma.projectMember.findFirst({
        where: {
          projectId,
          organizationMemberId: userContext.membership.id,
        },
      });

      if (!memberCheck) {
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 404 }
        );
      }
    }

    // Fetch project members
    const members = await prisma.projectMember.findMany({
      where: {
        projectId,
      },
      include: {
        organizationMember: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Transform to match expected format
    const transformedMembers = members.map((member) => ({
      id: member.id,
      organization_member_id: member.organizationMemberId,
      role: member.role,
      joined_at: member.joinedAt,
      organization_members: {
        id: member.organizationMember.id,
        user_id: member.organizationMember.userId,
        users: {
          id: member.organizationMember.user.id,
          full_name: member.organizationMember.user.fullName,
          email: member.organizationMember.user.email,
          avatar_url: member.organizationMember.user.avatarUrl,
        },
      },
    }));

    const result = {
      members: transformedMembers,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching project members:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
