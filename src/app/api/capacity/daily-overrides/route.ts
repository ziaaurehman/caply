import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

// PUT /api/capacity/daily-overrides
// Body: { organizationId, weekly_plan_id, overrides: [{ day_of_week, actual_hours }], unlink_week?: boolean }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, weekly_plan_id, overrides, unlink_week } =
      body || {};

    if (!organizationId || !weekly_plan_id || !Array.isArray(overrides)) {
      return NextResponse.json(
        {
          error: "organizationId, weekly_plan_id and overrides[] are required",
        },
        { status: 400 }
      );
    }

    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "capacity",
      action: "update",
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Optional: unlink the weekly plan so days are not linked to default
      if (unlink_week) {
        await tx.projectWeeklyPlan.update({
          where: {
            id: weekly_plan_id,
            organizationId,
          },
          data: {
            isLinked: false,
            updatedAt: new Date(),
          },
        });
      }

      // Upsert overrides
      for (const o of overrides) {
        if (!o || typeof o.day_of_week !== "number") continue;
        const day = o.day_of_week;
        const hrs = o.actual_hours;

        await tx.projectDailyOverride.upsert({
          where: {
            weeklyPlanId_dayOfWeek: {
              weeklyPlanId: weekly_plan_id,
              dayOfWeek: day,
            },
          },
          create: {
            organizationId,
            weeklyPlanId: weekly_plan_id,
            dayOfWeek: day,
            actualHours: hrs,
          },
          update: {
            actualHours: hrs,
            updatedAt: new Date(),
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in daily overrides PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
