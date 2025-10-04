// src/app/api/timesheets/delete-entry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const organizationId =
    searchParams.get("organizationId") || req.headers.get("x-organization-id");
  const entryId = searchParams.get("entryId");

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
        timesheet_submission_id,
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

    // Delete the entry
    const { error: deleteError } = await supabase
      .from("timesheet_entries")
      .delete()
      .eq("id", entryId);

    if (deleteError) throw deleteError;

    // Recalculate and update total hours for the submission
    const { data: remainingEntries, error: entriesError } = await supabase
      .from("timesheet_entries")
      .select(
        "monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours"
      )
      .eq("timesheet_submission_id", entry.timesheet_submissions.id);

    if (entriesError) throw entriesError;

    const totalHours = remainingEntries.reduce(
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
      success: true,
      message: "Entry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting timesheet entry:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
