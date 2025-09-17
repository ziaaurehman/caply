import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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

    const supabase = await createClient();

    // Step 1: Get active resources for this organization (simple query)
    let resourcesQuery = supabase
      .from("resource_allocations")
      .select(
        `
        id,
        organization_member_id,
        weekly_capacity_hours,
        is_active
      `
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    const { data: resources, error: resourcesError } = await resourcesQuery;
    if (resourcesError) {
      console.error("Error fetching resources:", resourcesError);
      return NextResponse.json(
        { error: resourcesError.message },
        { status: 500 }
      );
    }

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
    const { data: orgMembers, error: membersError } = await supabase
      .from("organization_members")
      .select(
        `
        id,
        user_id,
        department,
        users!user_id (
          id,
          full_name,
          email,
          avatar_url,
          position
        )
      `
      )
      .in(
        "id",
        resources.map((r) => r.organization_member_id)
      );

    if (membersError) {
      console.error("Error fetching organization members:", membersError);
      return NextResponse.json(
        { error: membersError.message },
        { status: 500 }
      );
    }

    // Filter by user IDs if specified
    let filteredMembers = orgMembers || [];
    if (filterUserIds.length > 0) {
      filteredMembers = filteredMembers.filter((member) =>
        filterUserIds.includes((member as any).users?.id)
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
        filteredMembers.some((m) => m.id === r.organization_member_id)
      )
      .map((r) => r.id);

    let assignmentsQuery = supabase
      .from("project_assignments")
      .select(
        `
        id,
        project_id,
        hours_per_week,
        start_date,
        end_date,
        resource_allocation_id
      `
      )
      .in("resource_allocation_id", resourceIds)
      .eq("is_active", true);

    // Apply date filtering
    if (startDate && endDate) {
      assignmentsQuery = assignmentsQuery
        .lte("start_date", endDate)
        .or(`end_date.is.null,end_date.gte.${startDate}`);
    } else if (endDate) {
      assignmentsQuery = assignmentsQuery.lte("start_date", endDate);
    } else if (startDate) {
      assignmentsQuery = assignmentsQuery.or(
        `end_date.is.null,end_date.gte.${startDate}`
      );
    }

    if (projectId)
      assignmentsQuery = assignmentsQuery.eq("project_id", projectId);

    const { data: assignments, error: assignmentsError } =
      await assignmentsQuery;
    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError);
      return NextResponse.json(
        { error: assignmentsError.message },
        { status: 500 }
      );
    }

    // Step 4: Build overview (in memory calculations - fast)
    const resourceMap = new Map(resources.map((r) => [r.id, r]));
    const memberMap = new Map(filteredMembers.map((m) => [m.id, m]));

    // Group assignments by resource
    const assignmentsByResource = new Map();
    assignments?.forEach((assignment) => {
      const resourceId = assignment.resource_allocation_id;
      if (!assignmentsByResource.has(resourceId)) {
        assignmentsByResource.set(resourceId, []);
      }
      assignmentsByResource.get(resourceId).push(assignment);
    });

    const capacityOverview = Array.from(memberMap.values())
      .map((member) => {
        // Find corresponding resource
        const resource = resources.find(
          (r) => r.organization_member_id === member.id
        );
        if (!resource) return null;

        const memberAssignments = assignmentsByResource.get(resource.id) || [];
        const totalAllocatedHours = memberAssignments.reduce(
          (sum: number, a: any) => sum + Number(a.hours_per_week || 0),
          0
        );
        const capacity = Number(resource.weekly_capacity_hours || 40);
        const utilizationPercent =
          capacity > 0 ? (totalAllocatedHours / capacity) * 100 : 0;

        return {
          member: {
            id: (member as any).users?.id,
            user: (member as any).users,
            role:
              (member as any).department ||
              (member as any).users?.position ||
              "",
            organization_member_id: member.id,
          },
          allocations: memberAssignments, // Simplified - just the assignment data
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
      .filter(Boolean);

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
