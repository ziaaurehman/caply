import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

// Get ALL projects with capacity planning enabled (no pagination limits)
export async function GET(req: NextRequest) {
  console.log("🔍 GET /api/capacity/projects/all - Starting request");

  try {
    const { searchParams } = new URL(req.url);
    const organizationId =
      searchParams.get("organizationId") ||
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
      resource: "capacity",
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

    // Check if user has admin/manager role or capacity.manage permission for full access
    const role = userContext.membership.role;
    const hasFullAccess =
      role.name === "admin" ||
      role.name === "manager" ||
      (role.rolePermissions?.some(
        (rp: any) =>
          rp.permission?.resource === "capacity" &&
          rp.permission?.action === "manage"
      ) ?? false);

    let projectIds: string[] = [];

    if (hasFullAccess) {
      console.log(
        "Admin gets all capacity-enabled projects - get ALL IDs (no limit)"
      );
      // Admin gets all capacity-enabled projects - get ALL IDs (no limit)
      const allProjects = await prisma.project.findMany({
        where: {
          organizationId,
          capacityPlanningEnabled: true,
        },
        select: {
          id: true,
        },
      });

      projectIds = allProjects.map((p) => p.id);
    } else {
      // Regular users can only see capacity projects they are members of
      const memberProjects = await prisma.projectMember.findMany({
        where: {
          organizationMemberId: userContext.membership.id,
          project: {
            capacityPlanningEnabled: true,
          },
        },
        select: {
          projectId: true,
        },
      });

      projectIds = memberProjects.map((p) => p.projectId);
    }

    if (projectIds.length === 0) {
      const emptyResponse = {
        projects: [],
        user_access: hasFullAccess ? "full" : "member",
        total_projects: 0,
        access_level: hasFullAccess
          ? "all_organization_projects"
          : "member_projects_only",
      };

      return NextResponse.json(emptyResponse);
    }

    // Get ALL project details (no pagination limits)
    const projects = await prisma.project.findMany({
      where: {
        id: {
          in: projectIds,
        },
      },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        capacityPlanningEnabled: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get member count for each project
    const memberCounts = await prisma.projectMember.groupBy({
      by: ["projectId"],
      where: {
        projectId: {
          in: projectIds,
        },
      },
      _count: {
        id: true,
      },
    });

    // Count members per project
    const memberCountMap = new Map<string, number>();
    memberCounts.forEach((member) => {
      memberCountMap.set(member.projectId, member._count.id);
    });

    // Enrich projects with member count
    const enrichedProjects = projects.map((project) => ({
      id: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      capacity_planning_enabled: project.capacityPlanningEnabled,
      created_at: project.createdAt,
      member_count: memberCountMap.get(project.id) || 0,
    }));

    const response = {
      projects: enrichedProjects,
      user_access: hasFullAccess ? "full" : "member",
      total_projects: enrichedProjects.length,
      access_level: hasFullAccess
        ? "all_organization_projects"
        : "member_projects_only",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("💥 Unexpected error in capacity projects all API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
