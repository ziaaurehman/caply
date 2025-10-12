// Create: src/app/api/timesheets/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { organizationId, submissionId } = body;

  if (!organizationId || !submissionId) {
    return NextResponse.json(
      {
        error: "Organization ID and submissionId are required",
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
    // Validate submission exists and belongs to user
    const { data: submission, error: fetchError } = await supabase
      .from("timesheet_submissions")
      .select("*, timesheet_entries(*)")
      .eq("id", submissionId)
      .eq("user_id", userContext.userId)
      .eq("status", "draft")
      .single();

    if (fetchError || !submission) {
      return NextResponse.json(
        {
          error: "Timesheet not found or not in draft status",
        },
        { status: 404 }
      );
    }

    // Validate entries
    const hasTimeEntries =
      submission.timesheet_entries?.some(
        (entry: any) =>
          entry.monday_hours > 0 ||
          entry.tuesday_hours > 0 ||
          entry.wednesday_hours > 0 ||
          entry.thursday_hours > 0 ||
          entry.friday_hours > 0
      ) &&
      submission.timesheet_entries?.every(
        (entry: any) => entry.task_description.trim().length > 0
      );

    if (!hasTimeEntries) {
      return NextResponse.json(
        {
          error: "Cannot submit timesheet without valid time entries",
        },
        { status: 400 }
      );
    }

    // Calculate total hours from entries before updating
    const totalHours =
      submission.timesheet_entries?.reduce(
        (sum: number, entry: any) =>
          sum +
          (entry.monday_hours || 0) +
          (entry.tuesday_hours || 0) +
          (entry.wednesday_hours || 0) +
          (entry.thursday_hours || 0) +
          (entry.friday_hours || 0),
        0
      ) || 0;

    // Update submission status to submitted
    const { data: updatedSubmission, error: updateError } = await supabase
      .from("timesheet_submissions")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_hours: totalHours,
      })
      .eq("id", submissionId)
      .eq("user_id", userContext.userId)
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

    if (updateError) throw updateError;

    return NextResponse.json({
      submission: updatedSubmission,
      success: true,
    });
  } catch (error) {
    console.error("Error submitting timesheet:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
