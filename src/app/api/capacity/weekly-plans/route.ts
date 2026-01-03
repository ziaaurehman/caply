import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { checkProjectBudget } from "@/utils/budgetUtils";

// PUT /api/capacity/weekly-plans
// Body: { organizationId, resource_allocation_id, project_id, week_start_date, default_hours_per_day?, allow_weekends?, is_linked? }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      weeklyPlanId,
      hoursSunday,
      hoursMonday,
      hoursTuesday,
      hoursWednesday,
      hoursThursday,
      hoursFriday,
      hoursSaturday,
      isLinked,
    } = body;

    if (!weeklyPlanId) {
      return NextResponse.json(
        { error: "Weekly plan ID is required" },
        { status: 400 }
      );
    }

    // Get the weekly plan to verify it exists
    const existingPlan = await prisma.projectWeeklyPlan.findUnique({
      where: { id: weeklyPlanId },
      include: {
        resourceAllocation: true,
      },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: "Weekly plan not found" },
        { status: 404 }
      );
    }

    const validation = await validateOrganizationAccessWithId(
      existingPlan.organizationId,
      {
        resource: "capacity",
        action: "manage",
      }
    );

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const updateData: any = {};

    // Update isLinked if provided
    if (isLinked !== undefined) updateData.isLinked = isLinked;

    // Update the weekly plan
    const updatedPlan = await prisma.projectWeeklyPlan.update({
      where: { id: weeklyPlanId },
      data: updateData,
    });

    // Handle individual day hours - store them in ProjectDailyOverride records
    // Day of week: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
    const dayHoursMap = [
      { day: 0, hours: hoursSunday },
      { day: 1, hours: hoursMonday },
      { day: 2, hours: hoursTuesday },
      { day: 3, hours: hoursWednesday },
      { day: 4, hours: hoursThursday },
      { day: 5, hours: hoursFriday },
      { day: 6, hours: hoursSaturday },
    ];

    // Filter out undefined values and process each day
    const daysToUpdate = dayHoursMap.filter((d) => d.hours !== undefined);

    console.log("Updating daily overrides:", {
      weeklyPlanId,
      daysToUpdate: daysToUpdate.map((d) => ({
        day: d.day,
        hours: d.hours,
      })),
    });

    // Upsert each day override (create or update)
    for (const { day, hours } of daysToUpdate) {
      await prisma.projectDailyOverride.upsert({
        where: {
          weeklyPlanId_dayOfWeek: {
            weeklyPlanId: weeklyPlanId,
            dayOfWeek: day,
          },
        },
        update: {
          actualHours: hours,
        },
        create: {
          organizationId: existingPlan.organizationId,
          weeklyPlanId: weeklyPlanId,
          dayOfWeek: day,
          actualHours: hours,
        },
      });
    }

    // Fetch the updated plan with daily overrides for the response
    const planWithOverrides = await prisma.projectWeeklyPlan.findUnique({
      where: { id: weeklyPlanId },
      include: {
        dailyOverrides: {
          orderBy: {
            dayOfWeek: "asc",
          },
        },
      },
    });



    // Check project budget
    if (existingPlan && existingPlan.projectId) {
      try {
        await checkProjectBudget(existingPlan.projectId);
      } catch (err) {
        console.error("Failed to check project budget:", err);
      }
    }

    return NextResponse.json({
      weeklyPlan: planWithOverrides,
      message: "Weekly plan updated successfully",
    });
  } catch (e) {
    console.error("Error updating weekly plan:", e);
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
      projectAssignmentId,
      weekStartDate,
      defaultHoursPerDay,
      allowWeekends,
      // Optional: override specific day hours
      hoursSunday,
      hoursMonday,
      hoursTuesday,
      hoursWednesday,
      hoursThursday,
      hoursFriday,
      hoursSaturday,
    } = body;

    if (
      !organizationId ||
      !resourceAllocationId ||
      !projectId ||
      !projectAssignmentId ||
      !weekStartDate
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "capacity",
      action: "manage",
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const weekStart = new Date(weekStartDate);

    // Check if weekly plan already exists
    const existing = await prisma.projectWeeklyPlan.findFirst({
      where: {
        resourceAllocationId,
        projectId,
        weekStartDate: weekStart,
      },
    });

    if (existing) {
      return NextResponse.json({
        weeklyPlan: existing,
        message: "Weekly plan already exists",
      });
    }

    // Create new weekly plan
    const weeklyPlan = await prisma.projectWeeklyPlan.create({
      data: {
        organizationId,
        resourceAllocationId,
        projectId,
        projectAssignmentId,
        weekStartDate: weekStart,
        defaultHoursPerDay: defaultHoursPerDay || 8,
        allowWeekends: allowWeekends || false,
        isLinked: true,
      },
    });

    // If individual day hours are provided, create ProjectDailyOverride records
    // Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    if (
      hoursSunday !== undefined ||
      hoursMonday !== undefined ||
      hoursTuesday !== undefined ||
      hoursWednesday !== undefined ||
      hoursThursday !== undefined ||
      hoursFriday !== undefined ||
      hoursSaturday !== undefined
    ) {
      const dayOverrides = [
        { day: 0, hours: hoursSunday },
        { day: 1, hours: hoursMonday },
        { day: 2, hours: hoursTuesday },
        { day: 3, hours: hoursWednesday },
        { day: 4, hours: hoursThursday },
        { day: 5, hours: hoursFriday },
        { day: 6, hours: hoursSaturday },
      ].filter((d) => d.hours !== undefined);

      if (dayOverrides.length > 0) {
        await prisma.projectDailyOverride.createMany({
          data: dayOverrides.map(({ day, hours }) => ({
            organizationId,
            weeklyPlanId: weeklyPlan.id,
            dayOfWeek: day,
            actualHours: hours,
          })),
          skipDuplicates: true,
        });
      }
    }



    // Check project budget
    try {
      await checkProjectBudget(projectId);
    } catch (err) {
      console.error("Failed to check project budget:", err);
    }

    return NextResponse.json({
      weeklyPlan,
      message: "Weekly plan created successfully",
    });
  } catch (e) {
    console.error("Error creating weekly plan:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add DELETE method
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weeklyPlanId = searchParams.get("weeklyPlanId");

    if (!weeklyPlanId) {
      return NextResponse.json(
        { error: "Weekly plan ID is required" },
        { status: 400 }
      );
    }

    // Get the weekly plan to verify it exists and get organization ID
    const existingPlan = await prisma.projectWeeklyPlan.findUnique({
      where: { id: weeklyPlanId },
      include: {
        resourceAllocation: true,
      },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: "Weekly plan not found" },
        { status: 404 }
      );
    }

    const validation = await validateOrganizationAccessWithId(
      existingPlan.organizationId,
      {
        resource: "capacity",
        action: "manage",
      }
    );

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Delete the weekly plan
    await prisma.projectWeeklyPlan.delete({
      where: { id: weeklyPlanId },
    });

    return NextResponse.json({
      message: "Weekly plan deleted successfully",
    });
  } catch (e) {
    console.error("Error deleting weekly plan:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add GET method to fetch weekly plans for a month
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

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

    const where: any = {
      organizationId,
    };

    // Filter by weekStartDate instead of month/year since those fields don't exist
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      // Create date range for the month
      const startOfMonth = new Date(yearNum, monthNum - 1, 1);
      const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

      where.weekStartDate = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const weeklyPlans = await prisma.projectWeeklyPlan.findMany({
      where,
      include: {
        dailyOverrides: {
          orderBy: {
            dayOfWeek: "asc",
          },
        },
      },
      orderBy: {
        weekStartDate: "asc",
      },
    });

    return NextResponse.json({ weeklyPlans });
  } catch (e) {
    console.error("Error fetching weekly plans:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
