import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

// GET /api/capacity/monthly?organizationId=...&month=YYYY-MM
// Returns monthly view per resource: resource info + per-week totals and project breakdown
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");
    const month = searchParams.get("month"); // format: YYYY-MM
    const onlyActive = (searchParams.get("only_active") ?? "true") === "true";

    if (!organizationId || !month) {
      return NextResponse.json(
        { error: "organizationId and month (YYYY-MM) are required" },
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

    const supabase = await createClient();

    // Compute the first day of month and ISO week starts within that month (Mon dates)
    const monthStart = new Date(`${month}-01T00:00:00Z`);
    if (Number.isNaN(monthStart.getTime())) {
      return NextResponse.json(
        { error: "Invalid month format. Expected YYYY-MM" },
        { status: 400 }
      );
    }
    const nextMonth = new Date(monthStart);
    nextMonth.setUTCMonth(monthStart.getUTCMonth() + 1);
    const monthEnd = new Date(nextMonth.getTime() - 24 * 3600 * 1000);

    // Helper to get all Mondays within [monthStart, monthEnd]
    const weekStarts: string[] = [];
    const cursor = new Date(monthStart);
    // Move cursor back to Monday of its week, then advance Mondays within month
    const day = cursor.getUTCDay(); // 0..6, 1=Mon
    const diffToMonday = (day + 6) % 7; // days to go back to Monday
    cursor.setUTCDate(cursor.getUTCDate() - diffToMonday);
    while (cursor <= monthEnd) {
      if (cursor >= monthStart && cursor <= monthEnd) {
        weekStarts.push(cursor.toISOString().slice(0, 10));
      }
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
    if (weekStarts.length === 0) {
      return NextResponse.json({ resources: [], weeks: [] });
    }

    // 1) Get resources (resource_allocations) and member/user info
    let resourcesQuery = supabase
      .from("resource_allocations")
      .select(
        `
        id,
        organization_member_id,
        weekly_capacity_hours,
        is_active,
        organization_members:organization_member_id (
          id,
          users:user_id (
            id,
            full_name,
            email,
            avatar_url,
            position
          )
        )
      `
      )
      .eq("organization_id", organizationId);
    if (onlyActive) resourcesQuery = resourcesQuery.eq("is_active", true);
    const { data: resources, error: resourcesError } = await resourcesQuery;
    if (resourcesError) {
      return NextResponse.json(
        { error: resourcesError.message },
        { status: 500 }
      );
    }
    if (!resources || resources.length === 0) {
      return NextResponse.json({ resources: [], weeks: weekStarts });
    }

    const resourceIds = resources.map((r) => r.id);

    // 2) Fetch weekly plans for all resources for the target weeks
    const { data: weeklyPlans, error: plansError } = await supabase
      .from("project_weekly_plans")
      .select(
        `
        id,
        organization_id,
        resource_allocation_id,
        project_id,
        week_start_date,
        default_hours_per_day,
        allow_weekends,
        is_linked,
        projects:project_id ( id, name, code, status )
      `
      )
      .in("resource_allocation_id", resourceIds)
      .in("week_start_date", weekStarts);
    if (plansError) {
      return NextResponse.json({ error: plansError.message }, { status: 500 });
    }

    const planIds = (weeklyPlans || []).map((p) => p.id);

    // 3) Fetch daily overrides for these weekly plans
    let overridesByPlan = new Map<string, any[]>();
    if (planIds.length > 0) {
      const { data: overrides, error: overridesError } = await supabase
        .from("project_daily_overrides")
        .select(`id, weekly_plan_id, day_of_week, actual_hours`)
        .in("weekly_plan_id", planIds);
      if (overridesError) {
        return NextResponse.json(
          { error: overridesError.message },
          { status: 500 }
        );
      }
      (overrides || []).forEach((o) => {
        const arr = overridesByPlan.get(o.weekly_plan_id) || [];
        arr.push(o);
        overridesByPlan.set(o.weekly_plan_id, arr);
      });
    }

    // 4) Build response per resource with weekly totals and per-project breakdown
    const weeksMeta = weekStarts.map((ws) => ({ week_start_date: ws }));
    const byResource: any[] = resources.map((res: any) => {
      const memberUser = (res.organization_members as any)?.users;
      const resPlans = (weeklyPlans || []).filter(
        (p) => p.resource_allocation_id === res.id
      );

      // Aggregate weekly totals and per-project breakdown
      const weekTotals: Record<string, number> = {};
      const projectsByWeek: Record<string, any[]> = {};

      weekStarts.forEach((ws) => {
        weekTotals[ws] = 0;
        projectsByWeek[ws] = [];
      });

      resPlans.forEach((plan: any) => {
        const ws = plan.week_start_date;
        const allowWeekends = !!plan.allow_weekends;
        const defaultPerDay = Number(plan.default_hours_per_day || 0);
        const dayMax = allowWeekends ? 7 : 5;
        const ovrs = overridesByPlan.get(plan.id) || [];
        // Build day map 1..7
        const dayHours: Record<number, number> = {} as any;
        for (let d = 1; d <= dayMax; d++) dayHours[d] = defaultPerDay;
        // Apply overrides
        ovrs.forEach((o) => {
          if (o.day_of_week >= 1 && o.day_of_week <= 7) {
            // respect weekends flag: if weekend not allowed and override is 6/7, still count it explicitly
            dayHours[o.day_of_week] = Number(o.actual_hours || 0);
          }
        });
        // Sum allowed days (1..dayMax). If overrides exist on weekend beyond dayMax, ignore unless allowWeekends true
        let total = 0;
        for (let d = 1; d <= (allowWeekends ? 7 : 5); d++) {
          total += Number(dayHours[d] ?? defaultPerDay);
        }
        weekTotals[ws] = (weekTotals[ws] || 0) + total;
        projectsByWeek[ws].push({
          project: plan.projects,
          weekly_hours: total,
          default_hours_per_day: defaultPerDay,
          allow_weekends: allowWeekends,
        });
      });

      // Compute status per week relative to resource weekly capacity
      const weeklyCapacity = Number(res.weekly_capacity_hours || 40);
      const weeks = weekStarts.map((ws) => {
        const used = Number(weekTotals[ws] || 0);
        const total = weeklyCapacity;
        const utilization = total > 0 ? (used / total) * 100 : 0;
        let status: "underutilized" | "optimal" | "overallocated" =
          "underutilized";
        if (utilization > 100) status = "overallocated";
        else if (utilization >= 80) status = "optimal";
        return {
          week_start_date: ws,
          used,
          total,
          utilizationPercent: utilization,
          status,
          projects: projectsByWeek[ws],
        };
      });

      return {
        resource_allocation_id: res.id,
        organization_member_id: res.organization_member_id,
        user: memberUser,
        weekly_capacity_hours: weeklyCapacity,
        weeks,
      };
    });

    return NextResponse.json({ resources: byResource, weeks: weeksMeta });
  } catch (error) {
    console.error("Error in monthly capacity API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
