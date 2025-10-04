// src/app/api/timesheets/update-entry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const {
    organizationId,
    entryId,
    project_id,
    task_description,
    monday_hours,
    tuesday_hours,
    wednesday_hours,
    thursday_hours,
    friday_hours,
    monday_notes,
    tuesday_notes,
    wednesday_notes,
    thursday_notes,
    friday_notes,
  } = body;

  if (!organizationId || !entryId) {
    return NextResponse.json(
      {
        error: "Organization ID and entry ID are required",
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
    // First, verify that the entry belongs to a draft submission owned by the user
    const { data: entry, error: fetchError } = await supabase
      .from("timesheet_entries")
      .select(
        `
        *,
        timesheet_submissions!inner (
          id,
          user_id,
          status,
          organization_id
        )
      `
      )
      .eq("id", entryId)
      .eq("timesheet_submissions.user_id", userContext.userId)
      .eq("timesheet_submissions.status", "draft")
      .eq("timesheet_submissions.organization_id", organizationId)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json(
        {
          error: "Entry not found or not accessible",
        },
        { status: 404 }
      );
    }

    // Update the entry
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (project_id !== undefined) updateData.project_id = project_id;
    if (task_description !== undefined)
      updateData.task_description = task_description;
    if (monday_hours !== undefined) updateData.monday_hours = monday_hours;
    if (tuesday_hours !== undefined) updateData.tuesday_hours = tuesday_hours;
    if (wednesday_hours !== undefined)
      updateData.wednesday_hours = wednesday_hours;
    if (thursday_hours !== undefined)
      updateData.thursday_hours = thursday_hours;
    if (friday_hours !== undefined) updateData.friday_hours = friday_hours;
    if (monday_notes !== undefined) updateData.monday_notes = monday_notes;
    if (tuesday_notes !== undefined) updateData.tuesday_notes = tuesday_notes;
    if (wednesday_notes !== undefined)
      updateData.wednesday_notes = wednesday_notes;
    if (thursday_notes !== undefined)
      updateData.thursday_notes = thursday_notes;
    if (friday_notes !== undefined) updateData.friday_notes = friday_notes;

    const { data: updatedEntry, error: updateError } = await supabase
      .from("timesheet_entries")
      .update(updateData)
      .eq("id", entryId)
      .select(
        `
        *,
        projects (
          id,
          name,
          code
        )
      `
      )
      .single();

    if (updateError) throw updateError;

    // Recalculate and update total hours for the submission
    const { data: allEntries, error: entriesError } = await supabase
      .from("timesheet_entries")
      .select(
        "monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours"
      )
      .eq("timesheet_submission_id", entry.timesheet_submissions.id);

    if (entriesError) throw entriesError;

    const totalHours = allEntries.reduce(
      (sum, e) =>
        sum +
        e.monday_hours +
        e.tuesday_hours +
        e.wednesday_hours +
        e.thursday_hours +
        e.friday_hours,
      0
    );

    // Update the submission's total hours
    await supabase
      .from("timesheet_submissions")
      .update({
        total_hours: totalHours,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entry.timesheet_submissions.id);

    return NextResponse.json({
      entry: updatedEntry,
      success: true,
    });
  } catch (error) {
    console.error("Error updating timesheet entry:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
