// Create: src/app/api/timesheets/submissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const organizationId =
    searchParams.get("organizationId") || req.headers.get("x-organization-id");
  const status = searchParams.get("status");

  if (!organizationId) {
    return NextResponse.json(
      {
        error: "Organization ID is required",
      },
      { status: 400 }
    );
  }

  const validation = await validateOrganizationAccessWithId(organizationId, {
    resource: "timesheets",
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

  const supabase = await createClient();
  const userContext = validation.context!;

  try {
    let query = supabase
      .from("timesheet_submissions")
      .select(
        `
        *,
        timesheet_entries (
          *,
          projects (
            id,
            name,
            code
          )
        ),
        project_member:project_members!project_member_id (
          id,
          organization_members!inner (
            id,
            user_id,
            users!organization_members_user_id_fkey (
              id,
              full_name,
              email,
              avatar_url
            )
          )
        )
      `
      )
      .eq("organization_id", organizationId)
      .order("week_start_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    // For non-admin users, only show their own submissions
    if (
      userContext.membership.role.name !== "admin" &&
      userContext.membership.role.name !== "manager"
    ) {
      query = query.eq("user_id", userContext.userId);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error("Error fetching submissions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data
    const transformedSubmissions =
      submissions?.map((submission) => ({
        id: submission.id,
        userId: (submission.project_member as any)?.organization_members
          ?.user_id,
        userName: (submission.project_member as any)?.organization_members
          ?.users?.full_name,
        userEmail: (submission.project_member as any)?.organization_members
          ?.users?.email,
        weekStart: submission.week_start_date,
        weekEnd: submission.week_end_date,
        totalHours: parseInt(submission.total_hours),
        status: submission.status,
        data: submission.timesheet_entries || [],
        submittedAt: submission.submitted_at,
        approvedAt: submission.approved_at,
        approvedBy: submission.approved_by,
        rejectionReason: submission.rejection_reason,
      })) || [];

    return NextResponse.json({
      submissions: transformedSubmissions,
      success: true,
    });
  } catch (error) {
    console.error("Error in submissions GET:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
