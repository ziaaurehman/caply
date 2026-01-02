import { NextRequest, NextResponse } from "next/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { prisma } from "@/lib/prisma";
import { startOfWeek, getWeek, getMonth, getYear } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");
    const resourceAllocationId = searchParams.get("resourceAllocationId");
    const weekStartDate = searchParams.get("weekStartDate");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "capacity",
      action: "read",
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Build where clause
    const where: any = {};
    if (resourceAllocationId) {
      where.resourceAllocationId = resourceAllocationId;
    }

    // Fetch project assignments
    const projectAssignments = await prisma.projectAssignment.findMany({
      where: {
        ...where,
        isActive: true,
        resourceAllocation: {
          organizationId,
        },
      },
      include: {
        resourceAllocation: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // If weekStartDate is provided, fetch weekly plans
    let weeklyPlans: any[] = [];
    if (weekStartDate) {
      const weekStart = new Date(weekStartDate);
      weeklyPlans = await prisma.projectWeeklyPlan.findMany({
        where: {
          weekStartDate: weekStart,
          organizationId,
          ...(resourceAllocationId ? { resourceAllocationId } : {}),
        },
        include: {
          dailyOverrides: {
            orderBy: {
              dayOfWeek: "asc",
            },
          },
        },
      });
    }

    // Fetch project names
    const projectIds = Array.from(
      new Set(projectAssignments.map((pa) => pa.projectId))
    );
    const projects = await prisma.project.findMany({
      where: {
        id: {
          in: projectIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    // Combine assignments with weekly plans and project names
    const enrichedAssignments = projectAssignments.map((assignment) => {
      const weeklyPlan = weeklyPlans.find(
        (wp) => wp.projectAssignmentId === assignment.id
      );

      // Calculate daily hours from daily overrides if they exist, otherwise use defaults
      const dailyHours = weeklyPlan
        ? (() => {
          const defaultHours = Number(weeklyPlan.defaultHoursPerDay || 0);
          const weekendHours = weeklyPlan.allowWeekends ? defaultHours : 0;

          // Start with default hours for all days
          const hours = [
            weekendHours, // Sunday (0)
            defaultHours, // Monday (1)
            defaultHours, // Tuesday (2)
            defaultHours, // Wednesday (3)
            defaultHours, // Thursday (4)
            defaultHours, // Friday (5)
            weekendHours, // Saturday (6)
          ];

          // Override with actual values from dailyOverrides if they exist
          if (weeklyPlan.dailyOverrides && weeklyPlan.dailyOverrides.length > 0) {
            weeklyPlan.dailyOverrides.forEach((override: any) => {
              hours[override.dayOfWeek] = Number(override.actualHours || 0);
            });
          }

          return hours;
        })()
        : null;

      return {
        id: assignment.id,
        projectId: assignment.projectId,
        projectName: projectMap.get(assignment.projectId) || "Unknown Project",
        resourceAllocationId: assignment.resourceAllocationId,
        hoursPerWeek: Number(assignment.hoursPerWeek),
        defaultHoursPerDay: Number(assignment.defaultHoursPerDay),
        allowWeekends: assignment.allowWeekends,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        notes: assignment.notes,
        weeklyPlan: weeklyPlan
          ? {
            id: weeklyPlan.id,
            weekStartDate: weeklyPlan.weekStartDate,
            dailyHours,
            isLinked: weeklyPlan.isLinked,
            allowWeekends: weeklyPlan.allowWeekends,
          }
          : null,
      };
    });

    return NextResponse.json({ assignments: enrichedAssignments });
  } catch (e) {
    console.error("Error fetching project assignments:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      organizationId,
      resourceAllocationId,
      projectId,
      hoursPerWeek,
      startDate,
      endDate,
      defaultHoursPerDay = 8.0,
      allowWeekends = false,
      notes,
      weekStartDate,
    } = body;

    if (!organizationId || !resourceAllocationId || !projectId) {
      return NextResponse.json(
        {
          error:
            "organizationId, resourceAllocationId, and projectId are required",
        },
        { status: 400 }
      );
    }

    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "capacity",
      action: "create",
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Verify the resource allocation belongs to this organization (using Prisma)
    const resourceAllocation = await prisma.resourceAllocation.findUnique({
      where: { id: resourceAllocationId },
      select: { organizationId: true },
    });

    console.log(
      "resourceAllocation",
      resourceAllocation,
      "resourceAllocationId",
      resourceAllocationId,
      "organizationId",
      organizationId
    );

    if (
      !resourceAllocation ||
      resourceAllocation.organizationId !== organizationId
    ) {
      return NextResponse.json(
        { error: "Invalid resource allocation" },
        { status: 400 }
      );
    }

    // Verify the project belongs to this organization (using Prisma)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });

    if (!project || project.organizationId !== organizationId) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }

    // Check for duplicate active assignment
    const existingAssignment = await prisma.projectAssignment.findFirst({
      where: {
        resourceAllocationId,
        projectId,
        isActive: true,
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Project is already assigned to this resource" },
        { status: 400 }
      );
    }

    // Create Project Assignment (using Prisma)
    const projectAssignment = await prisma.projectAssignment.create({
      data: {
        resourceAllocationId,
        projectId,
        hoursPerWeek: hoursPerWeek ?? 40,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        defaultHoursPerDay,
        allowWeekends,
        notes,
      },
    });

    // If weekStartDate is provided, create ProjectWeeklyPlan (using Prisma)
    let projectWeeklyPlan = null;
    if (weekStartDate) {
      const weekStart = new Date(weekStartDate);

      projectWeeklyPlan = await prisma.projectWeeklyPlan.create({
        data: {
          organizationId,
          resourceAllocationId,
          projectId,
          projectAssignmentId: projectAssignment.id,
          weekStartDate: weekStart,
          defaultHoursPerDay,
          allowWeekends,
          isLinked: true,
        },
      });
    }

    return NextResponse.json(
      {
        projectAssignment,
        projectWeeklyPlan,
        message: "Project assignment created successfully",
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("Error creating project assignment:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update or add DELETE method
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    // Get the project assignment to verify it exists and get organization ID
    const assignment = await prisma.projectAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        resourceAllocation: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Project assignment not found" },
        { status: 404 }
      );
    }

    const validation = await validateOrganizationAccessWithId(
      assignment.resourceAllocation.organizationId,
      {
        resource: "capacity",
        action: "delete",
      }
    );

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Delete the project assignment
    // This will cascade delete all related weekly plans due to onDelete: Cascade in schema
    await prisma.projectAssignment.delete({
      where: { id: assignmentId },
    });

    return NextResponse.json({
      message:
        "Project assignment and all related weekly plans deleted successfully",
    });
  } catch (e) {
    console.error("Error deleting project assignment:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
