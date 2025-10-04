import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { organizationId, submissionId, action, rejectionReason } = body;

  if (!organizationId || !submissionId || !action) {
    return NextResponse.json(
      {
        error: "organizationId, submissionId, and action are required",
      },
      { status: 400 }
    );
  }

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json(
      {
        error: "Action must be 'approve' or 'reject'",
      },
      { status: 400 }
    );
  }

  const validation = await validateOrganizationAccessWithId(organizationId, {
    resource: "timesheets",
    action: "approve",
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
    // Validate submission exists and is in submitted status
    const { data: submission, error: fetchError } = await supabase
      .from("timesheet_submissions")
      .select("*")
      .eq("id", submissionId)
      .eq("organization_id", organizationId)
      .eq("status", "submitted")
      .single();

    if (fetchError || !submission) {
      return NextResponse.json(
        {
          error: "Submission not found or not in submitted status",
        },
        { status: 404 }
      );
    }

    // Update submission status
    const updateData: any = {
      status: action,
      updated_at: new Date().toISOString(),
    };

    if (action === "approve") {
      updateData.approved_by = userContext.userId;
      updateData.approved_at = new Date().toISOString();
    } else {
      updateData.rejection_reason = rejectionReason || null;
    }

    const { data: updatedSubmission, error: updateError } = await supabase
      .from("timesheet_submissions")
      .update(updateData)
      .eq("id", submissionId)
      .eq("organization_id", organizationId)
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
    console.error("Error resolving submission:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
