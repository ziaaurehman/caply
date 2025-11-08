import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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

    const supabase = await createClient();

    // Optional: unlink the weekly plan so days are not linked to default
    if (unlink_week) {
      await supabase
        .from("project_weekly_plans")
        .update({ is_linked: false, updated_at: new Date().toISOString() })
        .eq("id", weekly_plan_id)
        .eq("organization_id", organizationId);
    }

    // Upsert overrides
    for (const o of overrides) {
      if (!o || typeof o.day_of_week !== "number") continue;
      const day = o.day_of_week;
      const hrs = o.actual_hours;
      const { error: upErr } = await supabase
        .from("project_daily_overrides")
        .upsert(
          {
            organization_id: organizationId,
            weekly_plan_id,
            day_of_week: day,
            actual_hours: hrs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "weekly_plan_id,day_of_week" }
        );
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in daily overrides PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
