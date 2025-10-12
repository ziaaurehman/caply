// src/app/api/timesheets/submissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const organizationId =
    searchParams.get("organizationId") || req.headers.get("x-organization-id");
  const status = searchParams.get("status");
  const userId = searchParams.get("user_id");
  const weekStart = searchParams.get("week_start");
  const weekEnd = searchParams.get("week_end");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search");

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
        users!timesheet_submissions_user_id_fkey (
          id,
          full_name,
          email,
          avatar_url
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
      `,
        { count: "exact" }
      )
      .eq("organization_id", organizationId)
      .order("week_start_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (weekStart) {
      query = query.gte("week_start_date", weekStart);
    }

    if (weekEnd) {
      query = query.lte("week_end_date", weekEnd);
    }

    if (search) {
      query = query.or(
        `users.full_name.ilike.%${search}%,users.email.ilike.%${search}%`
      );
    }

    // For non-admin users, only show their own submissions
    if (
      userContext.membership.role.name !== "admin" &&
      userContext.membership.role.name !== "manager"
    ) {
      query = query.eq("user_id", userContext.userId);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: submissions, error, count } = await query;

    if (error) {
      console.error("Error fetching submissions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data
    const transformedSubmissions =
      submissions?.map((submission) => ({
        id: submission.id,
        userId: submission.user_id,
        userName: submission.users?.full_name || "Unknown User",
        userEmail: submission.users?.email || "No Email",
        userAvatar: submission.users?.avatar_url,
        weekStart: submission.week_start_date,
        weekEnd: submission.week_end_date,
        totalHours: parseFloat(submission.total_hours) || 0,
        status: submission.status,
        data: submission.timesheet_entries || [],
        submittedAt: submission.submitted_at,
        approvedAt: submission.approved_at,
        approvedBy: submission.approved_by,
        rejectionReason: submission.rejection_reason,
        // Keep project_member data if available
        projectMember: submission.project_member,
        // Add created/updated timestamps
        createdAt: submission.created_at,
        updatedAt: submission.updated_at,
      })) || [];

    return NextResponse.json({
      submissions: transformedSubmissions,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: page < Math.ceil((count || 0) / limit),
        hasPrev: page > 1,
      },
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
