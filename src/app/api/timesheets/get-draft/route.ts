// src/app/api/timesheets/get-draft/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const organizationId =
    searchParams.get("organizationId") || req.headers.get("x-organization-id");
  const weekStart = searchParams.get("weekStart");

  if (!organizationId || !weekStart) {
    return NextResponse.json(
      {
        error: "Organization ID and weekStart are required",
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
    // Get or create draft submission for the week
    let { data: submission, error: submissionError } = await supabase
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
        )
      `
      )
      .eq("organization_id", organizationId)
      .eq("user_id", userContext.userId)
      .eq("week_start_date", weekStart)
      .maybeSingle();

    // If no submission exists, create a draft one
    if (!submission) {
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 4);

      const { data: projectMember } = await supabase
        .from("project_members")
        .select("id")
        .eq("organization_members.user_id", userContext.userId)
        .eq("project_members.organization_id", organizationId)
        .single();

      const { data: newSubmission, error: createError } = await supabase
        .from("timesheet_submissions")
        .insert({
          organization_id: organizationId,
          user_id: userContext.userId,
          project_member_id: projectMember?.id,
          week_start_date: weekStart,
          week_end_date: weekEndDate.toISOString().split("T")[0],
          status: "draft",
          total_hours: 0,
        })
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
          )
        `
        )
        .single();

      if (createError) {
        throw createError;
      }
      submission = newSubmission;
    }

    return NextResponse.json({
      submission: submission || null,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching timesheet draft:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
