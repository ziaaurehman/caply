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

    // Get all users in the organization
    const { data: users, error: usersError } = await supabase
      .from("organization_members")
      .select(
        `
        user_id,
        users:user_id (
          id,
          full_name,
          email
        )
      `
      )
      .eq("organization_id", organizationId);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Get leave requests for all users
    const { data: requests, error: requestsError } = await supabase
      .from("leave_requests")
      .select("user_id, status, days_requested, start_date")
      .eq("organization_id", organizationId);

    if (requestsError) {
      console.error("Error fetching leave requests:", requestsError);
      return NextResponse.json(
        { error: "Failed to fetch leave requests" },
        { status: 500 }
      );
    }

    // Get leave balances for all users
    // No balances table at the moment; compute simple sums from requests

    // Calculate summary for each user
    const summary =
      users?.map((member: any) => {
        const userRequests =
          requests?.filter((r) => r.user_id === member.user_id) || [];
        const totalLeaveDays = userRequests.reduce(
          (sum, r) => sum + (r.days_requested || 0),
          0
        );
        const usedLeaveDays = userRequests
          .filter((r) => r.status === "approved")
          .reduce((sum, r) => sum + (r.days_requested || 0), 0);
        const remainingLeaveDays = Math.max(0, totalLeaveDays - usedLeaveDays);

        const pendingRequests = userRequests.filter(
          (r) => r.status === "pending"
        ).length;
        const upcomingRequests = userRequests.filter((r) => {
          if (r.status !== "approved") return false;
          const startDate = new Date(r.start_date);
          const today = new Date();
          const thirtyDaysFromNow = new Date(
            today.getTime() + 30 * 24 * 60 * 60 * 1000
          );
          return startDate >= today && startDate <= thirtyDaysFromNow;
        }).length;

        return {
          user_id: member.user_id,
          user_name: member.users?.full_name || "Unknown",
          user_email: member.users?.email || "",
          total_leave_days: totalLeaveDays,
          used_leave_days: usedLeaveDays,
          remaining_leave_days: remainingLeaveDays,
          pending_requests: pendingRequests,
          upcoming_requests: upcomingRequests,
        };
      }) || [];

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Leave summary GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
