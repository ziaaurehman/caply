import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

// Optimized: Simple queries with smart caching and pre-calculations
export async function GET(req: NextRequest) {
  console.log("🔍 GET /api/capacity/overview - Starting request");

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const projectId = searchParams.get("project_id");
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");
    const filterUserIds = searchParams.getAll("filter_user_id");
    const showOnlyOverallocated =
      searchParams.get("only_overallocated") === "true";

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

    // Simple cache key - main queries get longer cache
    const isMainQuery =
      !projectId &&
      !startDate &&
      !endDate &&
      filterUserIds.length === 0 &&
      !showOnlyOverallocated;
    const cacheKey = isMainQuery
      ? `overview:main:${organizationId}`
      : `overview:${organizationId}:${projectId || ""}:${startDate || ""}:${endDate || ""}:${filterUserIds.join(",") || ""}:${showOnlyOverallocated}`;

    // Step 1: Get active resources for this organization (simple query)
    const resources = await prisma.resourceAllocation.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        organizationMemberId: true,
        weeklyCapacityHours: true,
        isActive: true,
      },
    });

    if (!resources || resources.length === 0) {
      const emptyResponse = {
        capacityOverview: [],
        summary: {
          totalMembers: 0,
          overallocatedMembers: 0,
          optimalMembers: 0,
          underutilizedMembers: 0,
          totalCapacity: 0,
          totalAllocated: 0,
          totalAvailable: 0,
        },
      };

      return NextResponse.json(emptyResponse);
    }

    // Step 2: Get organization members info
    const orgMembers = await prisma.organizationMember.findMany({
      where: {
        id: {
          in: resources.map((r) => r.organizationMemberId),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            position: true,
          },
        },
      },
    });

    // Filter by user IDs if specified
    let filteredMembers = orgMembers;
    if (filterUserIds.length > 0) {
      filteredMembers = filteredMembers.filter((member) =>
        filterUserIds.includes(member.userId)
      );
    }

    if (filteredMembers.length === 0) {
      const emptyResponse = {
        capacityOverview: [],
        summary: {
          totalMembers: 0,
          overallocatedMembers: 0,
          optimalMembers: 0,
          underutilizedMembers: 0,
          totalCapacity: 0,
          totalAllocated: 0,
          totalAvailable: 0,
        },
      };

      return NextResponse.json(emptyResponse);
    }

    // Step 3: Get project assignments for date range
    const resourceIds = resources
      .filter((r) =>
        filteredMembers.some((m) => m.id === r.organizationMemberId)
      )
      .map((r) => r.id);

    const assignmentsWhere: any = {
      resourceAllocationId: {
        in: resourceIds,
      },
      isActive: true,
    };

    // Apply date filtering
    if (startDate && endDate) {
      assignmentsWhere.OR = [
        {
          startDate: {
            lte: new Date(endDate),
          },
        },
        {
          OR: [{ endDate: null }, { endDate: { gte: new Date(startDate) } }],
        },
      ];
    } else if (endDate) {
      assignmentsWhere.startDate = {
        lte: new Date(endDate),
      };
    } else if (startDate) {
      assignmentsWhere.OR = [
        { endDate: null },
        { endDate: { gte: new Date(startDate) } },
      ];
    }

    if (projectId) {
      assignmentsWhere.projectId = projectId;
    }

    const assignments = await prisma.projectAssignment.findMany({
      where: assignmentsWhere,
      select: {
        id: true,
        projectId: true,
        hoursPerWeek: true,
        startDate: true,
        endDate: true,
        resourceAllocationId: true,
      },
    });

    // Step 4: Build overview (in memory calculations - fast)
    const resourceMap = new Map(resources.map((r) => [r.id, r]));
    const memberMap = new Map(filteredMembers.map((m) => [m.id, m]));

    // Group assignments by resource
    const assignmentsByResource = new Map<string, any[]>();
    assignments.forEach((assignment) => {
      const resourceId = assignment.resourceAllocationId;
      if (!assignmentsByResource.has(resourceId)) {
        assignmentsByResource.set(resourceId, []);
      }
      assignmentsByResource.get(resourceId)!.push(assignment);
    });

    const capacityOverview = Array.from(memberMap.values())
      .map((member) => {
        // Find corresponding resource
        const resource = resources.find(
          (r) => r.organizationMemberId === member.id
        );
        if (!resource) return null;

        const memberAssignments = assignmentsByResource.get(resource.id) || [];
        const totalAllocatedHours = memberAssignments.reduce(
          (sum: number, a: any) => sum + Number(a.hoursPerWeek || 0),
          0
        );
        const capacity = Number(resource.weeklyCapacityHours || 40);
        const utilizationPercent =
          capacity > 0 ? (totalAllocatedHours / capacity) * 100 : 0;

        return {
          member: {
            id: member.user?.id,
            user: member.user
              ? {
                  id: member.user.id,
                  full_name: member.user.fullName,
                  email: member.user.email,
                  avatar_url: member.user.avatarUrl,
                  position: member.user.position,
                }
              : null,
            role: member.department || member.user?.position || "",
            organization_member_id: member.id,
          },
          allocations: memberAssignments.map((a: any) => ({
            id: a.id,
            project_id: a.projectId,
            hours_per_week: Number(a.hoursPerWeek),
            start_date: a.startDate,
            end_date: a.endDate,
            resource_allocation_id: a.resourceAllocationId,
          })),
          capacity,
          totalAllocatedHours,
          availableHours: Math.max(0, capacity - totalAllocatedHours),
          utilizationPercent,
          status:
            utilizationPercent > 100
              ? "overallocated"
              : utilizationPercent >= 80
                ? "nearOptimal"
                : utilizationPercent >= 60
                  ? "optimal"
                  : "underutilized",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Filter overallocated if requested
    const filteredOverview = showOnlyOverallocated
      ? capacityOverview.filter((m) => m && m.utilizationPercent > 100)
      : capacityOverview.filter((m) => m !== null);

    // Calculate summary
    const summary = {
      totalMembers: filteredOverview.length,
      overallocatedMembers: filteredOverview.filter(
        (m) => m && m.status === "overallocated"
      ).length,
      optimalMembers: filteredOverview.filter(
        (m) => m && (m.status === "optimal" || m.status === "nearOptimal")
      ).length,
      underutilizedMembers: filteredOverview.filter(
        (m) => m && m.status === "underutilized"
      ).length,
      totalCapacity: filteredOverview.reduce(
        (sum, m) => sum + (m?.capacity || 0),
        0
      ),
      totalAllocated: filteredOverview.reduce(
        (sum, m) => sum + (m?.totalAllocatedHours || 0),
        0
      ),
      totalAvailable: filteredOverview.reduce(
        (sum, m) => sum + (m?.availableHours || 0),
        0
      ),
    };

    const response = {
      capacityOverview: filteredOverview,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("💥 Unexpected error in overview API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
