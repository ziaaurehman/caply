import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId =
      searchParams.get("organizationId") ||
      request.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "leave_requests",
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

    const { context: userContext } = validation;
    const supabase = await createClient();

    const userId = searchParams.get("user_id");

    let query = supabase
      .from("leave_requests")
      .select("status, days_requested, start_date")
      .eq("organization_id", organizationId);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error("Error fetching leave stats:", error);
      return NextResponse.json(
        { error: "Failed to fetch leave stats" },
        { status: 500 }
      );
    }

    const stats = {
      total_requests: requests?.length || 0,
      pending_requests:
        requests?.filter((r) => r.status === "pending").length || 0,
      approved_requests:
        requests?.filter((r) => r.status === "approved").length || 0,
      rejected_requests:
        requests?.filter((r) => r.status === "rejected").length || 0,
      total_days_requested:
        requests?.reduce((sum, r) => sum + (r.days_requested || 0), 0) || 0,
      total_days_approved:
        requests
          ?.filter((r) => r.status === "approved")
          .reduce((sum, r) => sum + (r.days_requested || 0), 0) || 0,
      upcoming_requests:
        requests?.filter((r) => {
          if (r.status !== "approved") return false;
          const startDate = new Date(r.start_date);
          const today = new Date();
          const thirtyDaysFromNow = new Date(
            today.getTime() + 30 * 24 * 60 * 60 * 1000
          );
          return startDate >= today && startDate <= thirtyDaysFromNow;
        }).length || 0,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Leave stats GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
