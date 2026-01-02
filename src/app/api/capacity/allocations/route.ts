import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

// Optimized: Simple queries with smart caching
export async function GET(req: NextRequest) {
  console.log("🔍 GET /api/capacity/allocations - Starting request");

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
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

    // Simple cache key - main queries get longer cache, filtered get shorter
    const isMainQuery = !projectId && !startDate && !endDate;
    const cacheKey = isMainQuery
      ? `allocations:main:${organizationId}`
      : `allocations:${organizationId}:${projectId || "all"}:${startDate || ""}:${endDate || ""}`;

    // Step 1: Build where clause for project assignments
    const assignmentsWhere: any = {
      isActive: true,
      resourceAllocation: {
        organizationId,
      },
    };

    if (projectId) {
      assignmentsWhere.projectId = projectId;
    }

    // Date filtering - only include assignments that overlap with date range
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

    // Get project assignments
    const assignments = await prisma.projectAssignment.findMany({
      where: assignmentsWhere,
      select: {
        id: true,
        projectId: true,
        hoursPerWeek: true,
        startDate: true,
        endDate: true,
        isActive: true,
        resourceAllocationId: true,
      },
      orderBy: {
        startDate: "asc",
      },
    });

    if (assignments.length === 0) {
      const response = { allocations: [], total: 0 };
      return NextResponse.json(response);
    }

    // Step 2: Get resource allocations for organization filter
    const resourceIds = Array.from(
      new Set(assignments.map((a) => a.resourceAllocationId).filter(Boolean))
    );

    const resources = await prisma.resourceAllocation.findMany({
      where: {
        id: {
          in: resourceIds,
        },
        organizationId,
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

    // Step 3: Get projects info
    const projectIds = Array.from(
      new Set(assignments.map((a) => a.projectId).filter(Boolean))
    );
    const projects = await prisma.project.findMany({
      where: {
        id: {
          in: projectIds,
        },
        organizationId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
      },
    });

    // Step 4: Combine data (in memory - fast)
    const resourceMap = new Map(
      resources.map((r) => [
        r.id,
        {
          id: r.id,
          organization_member_id: r.organizationMemberId,
          organization_id: r.organizationId,
          organization_members: {
            id: r.organizationMember.id,
            user_id: r.organizationMember.userId,
            users: r.organizationMember.user
              ? {
                id: r.organizationMember.user.id,
                full_name: r.organizationMember.user.fullName,
                email: r.organizationMember.user.email,
                avatar_url: r.organizationMember.user.avatarUrl,
              }
              : null,
          },
        },
      ])
    );
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    const enrichedAllocations = assignments
      .map((assignment) => ({
        id: assignment.id,
        project_id: assignment.projectId,
        hours_per_week: Number(assignment.hoursPerWeek),
        start_date: assignment.startDate,
        end_date: assignment.endDate,
        is_active: assignment.isActive,
        resource_allocation_id: assignment.resourceAllocationId,
        projects: projectMap.get(assignment.projectId) || null,
        resource_allocations:
          resourceMap.get(assignment.resourceAllocationId) || null,
      }))
      .filter((a) => a.resource_allocations); // Only include those in this org

    const response = {
      allocations: enrichedAllocations,
      total: enrichedAllocations.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("💥 Unexpected error in allocations API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { organizationId, ...allocationData } = body;

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
    action: "create",
  });

  if (!validation.success) {
    return NextResponse.json(
      {
        error: validation.error,
      },
      { status: validation.status }
    );
  }

  const {
    project_id,
    organization_member_id,
    hours_per_week,
    start_date,
    end_date,
    notes,
    default_hours_per_day,
    allow_weekends,
  } = allocationData;

  // Validate required fields
  if (
    !project_id ||
    !organization_member_id ||
    !hours_per_week ||
    !start_date
  ) {
    return NextResponse.json(
      {
        error:
          "Project ID, organization member ID, hours per week, and start date are required",
      },
      { status: 400 }
    );
  }

  try {
    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Verify project exists and belongs to the organization
      const project = await tx.project.findFirst({
        where: {
          id: project_id,
          organizationId,
        },
        select: {
          id: true,
          organizationId: true,
          capacityPlanningEnabled: true,
        },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      if (!project.capacityPlanningEnabled) {
        throw new Error("Capacity planning is not enabled for this project");
      }

      // Get or create resource row for this org member
      let resource = await tx.resourceAllocation.findFirst({
        where: {
          organizationId,
          organizationMemberId: organization_member_id,
        },
      });

      if (!resource) {
        resource = await tx.resourceAllocation.create({
          data: {
            organizationId,
            organizationMemberId: organization_member_id,
          },
        });
      }

      // Check for duplicate active assignment
      const existingAssignment = await tx.projectAssignment.findFirst({
        where: {
          resourceAllocationId: resource.id,
          projectId: project_id,
          isActive: true,
        },
      });

      if (existingAssignment) {
        throw new Error("Project is already assigned to this resource");
      }

      // Create project assignment (with per-day defaults and weekend flag)
      const assignment = await tx.projectAssignment.create({
        data: {
          resourceAllocationId: resource.id,
          projectId: project_id,
          hoursPerWeek: hours_per_week,
          startDate: new Date(start_date),
          endDate: end_date ? new Date(end_date) : null,
          notes: notes || null,
          defaultHoursPerDay: default_hours_per_day ?? 8,
          allowWeekends: allow_weekends ?? false,
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
            },
          },
          resourceAllocation: {
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
          },
        },
      });

      // Transform to match expected format
      return {
        id: assignment.id,
        project_id: assignment.projectId,
        hours_per_week: Number(assignment.hoursPerWeek),
        start_date: assignment.startDate,
        end_date: assignment.endDate,
        notes: assignment.notes,
        default_hours_per_day: Number(assignment.defaultHoursPerDay),
        allow_weekends: assignment.allowWeekends,
        is_active: assignment.isActive,
        resource_allocation_id: assignment.resourceAllocationId,
        created_at: assignment.createdAt,
        updated_at: assignment.updatedAt,
        projects: assignment.project
          ? {
            id: assignment.project.id,
            name: assignment.project.name,
            code: assignment.project.code,
            status: assignment.project.status,
          }
          : null,
        resource_allocations: assignment.resourceAllocation
          ? {
            id: assignment.resourceAllocation.id,
            organization_member_id:
              assignment.resourceAllocation.organizationMemberId,
            organization_members: assignment.resourceAllocation
              .organizationMember
              ? {
                id: assignment.resourceAllocation.organizationMember.id,
                user_id:
                  assignment.resourceAllocation.organizationMember.userId,
                users: assignment.resourceAllocation.organizationMember.user
                  ? {
                    id: assignment.resourceAllocation.organizationMember
                      .user.id,
                    full_name:
                      assignment.resourceAllocation.organizationMember
                        .user.fullName,
                    email:
                      assignment.resourceAllocation.organizationMember
                        .user.email,
                    avatar_url:
                      assignment.resourceAllocation.organizationMember
                        .user.avatarUrl,
                  }
                  : null,
              }
              : null,
          }
          : null,
      };
    });

    return NextResponse.json({ success: true, allocation: result });
  } catch (error: any) {
    console.error("Error in capacity allocations POST:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
