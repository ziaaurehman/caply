// src/app/api/timesheets/save-draft/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { organizationId, weekStart, entries = [], totalHours = 0 } = body;

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
    action: "update",
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
    let currentSubmission;

    const { data: prevSubmission, error: prevSubmissionError } = await supabase
      .from("timesheet_submissions")
      .select("id")
      .eq("user_id", userContext.userId)
      .eq("week_start_date", weekStart)
      .single();

    if (prevSubmission) {
      // Update existing submission
      const { data: submission, error: fetchError } = await supabase
        .from("timesheet_submissions")
        .update({
          total_hours: totalHours,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prevSubmission.id)
        .eq("user_id", userContext.userId)
        .eq("status", "draft")
        .select()
        .single();

      if (fetchError) throw fetchError;
      currentSubmission = submission;
    } else {
      // Create new submission
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 4);

      const { data: projectMember } = await supabase
        .from("project_members")
        .select("id")
        .eq("organization_members.user_id", userContext.userId)
        .eq("project_members.organization_id", organizationId)
        .single();

      const { data: submission, error: createError } = await supabase
        .from("timesheet_submissions")
        .insert({
          organization_id: organizationId,
          user_id: userContext.userId,
          project_member_id: projectMember?.id,
          week_start_date: weekStart,
          week_end_date: weekEndDate.toISOString().split("T")[0],
          status: "draft",
          total_hours: totalHours,
        })
        .select()
        .single();

      if (createError) throw createError;
      currentSubmission = submission;
    }

    // Update or create entries
    if (currentSubmission && entries.length > 0) {
      // Delete existing entries
      await supabase
        .from("timesheet_entries")
        .delete()
        .eq("timesheet_submission_id", currentSubmission.id);

      // Insert new entries (only non-empty ones)
      const entriesToInsert = entries
        .filter(
          (entry: any) =>
            entry.monday_hours > 0 ||
            entry.tuesday_hours > 0 ||
            entry.wednesday_hours > 0 ||
            entry.thursday_hours > 0 ||
            entry.friday_hours > 0 ||
            entry.task_description.trim()
        )
        .map((entry: any) => ({
          timesheet_submission_id: currentSubmission.id,
          project_id: entry.project_id,
          task_description: entry.task_description,
          monday_hours: entry.monday_hours || 0,
          tuesday_hours: entry.tuesday_hours || 0,
          wednesday_hours: entry.wednesday_hours || 0,
          thursday_hours: entry.thursday_hours || 0,
          friday_hours: entry.friday_hours || 0,
          monday_notes: entry.monday_notes || null,
          tuesday_notes: entry.tuesday_notes || null,
          wednesday_notes: entry.wednesday_notes || null,
          thursday_notes: entry.thursday_notes || null,
          friday_notes: entry.friday_notes || null,
        }));

      if (entriesToInsert.length > 0) {
        const { error: entriesError } = await supabase
          .from("timesheet_entries")
          .insert(entriesToInsert);

        if (entriesError) throw entriesError;
      }
    }

    // Fetch updated submission with entries
    const { data: updatedSubmission, error: fetchError } = await supabase
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
      .eq("id", currentSubmission.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({
      submission: updatedSubmission,
      success: true,
    });
  } catch (error) {
    console.error("Error saving timesheet draft:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
