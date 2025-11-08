import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { prisma } from "@/lib/prisma";
import { getWeek, getMonth, getYear } from "date-fns";

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

    if (hoursSunday !== undefined) updateData.hoursSunday = hoursSunday;
    if (hoursMonday !== undefined) updateData.hoursMonday = hoursMonday;
    if (hoursTuesday !== undefined) updateData.hoursTuesday = hoursTuesday;
    if (hoursWednesday !== undefined)
      updateData.hoursWednesday = hoursWednesday;
    if (hoursThursday !== undefined) updateData.hoursThursday = hoursThursday;
    if (hoursFriday !== undefined) updateData.hoursFriday = hoursFriday;
    if (hoursSaturday !== undefined) updateData.hoursSaturday = hoursSaturday;
    if (isLinked !== undefined) updateData.isLinked = isLinked;

    // Update the weekly plan
    const updatedPlan = await prisma.projectWeeklyPlan.update({
      where: { id: weeklyPlanId },
      data: updateData,
    });

    return NextResponse.json({
      weeklyPlan: updatedPlan,
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
    const year = getYear(weekStart);
    const month = getMonth(weekStart) + 1;
    const weekNumber = getWeek(weekStart);

    const dailyHours = allowWeekends ? defaultHoursPerDay : 0;
    const weekdayHours = defaultHoursPerDay;

    // Check if weekly plan already exists
    const existing = await prisma.projectWeeklyPlan.findUnique({
      where: {
        resourceAllocationId_projectId_weekStartDate: {
          resourceAllocationId,
          projectId,
          weekStartDate: weekStart,
        },
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
        year,
        month,
        weekNumber,
        defaultHoursPerDay,
        allowWeekends,
        isLinked: true,
        hoursSunday: allowWeekends ? dailyHours : 0,
        hoursMonday: weekdayHours,
        hoursTuesday: weekdayHours,
        hoursWednesday: weekdayHours,
        hoursThursday: weekdayHours,
        hoursFriday: weekdayHours,
        hoursSaturday: allowWeekends ? dailyHours : 0,
      },
    });

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
