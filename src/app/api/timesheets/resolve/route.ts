import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const userContext = validation.context!;

  try {
    // Validate submission exists and is in submitted status
    const submission = await prisma.timesheetSubmission.findFirst({
      where: {
        id: submissionId,
        organizationId,
        status: "submitted",
      },
    });

    if (!submission) {
      return NextResponse.json(
        {
          error: "Submission not found or not in submitted status",
        },
        { status: 404 }
      );
    }

    // Update submission status
    const updateData: any = {
      status: action === "approve" ? "approved" : "rejected",
      updatedAt: new Date(),
    };

    if (action === "approve") {
      updateData.approvedBy = userContext.userId;
      updateData.approvedAt = new Date();
    } else {
      updateData.rejectionReason = rejectionReason || null;
    }

    const updatedSubmission = await prisma.timesheetSubmission.update({
      where: { id: submissionId },
      data: updateData,
      include: {
        entries: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    // Transform to match expected format
    const transformedSubmission = {
      id: updatedSubmission.id,
      organization_id: updatedSubmission.organizationId,
      user_id: updatedSubmission.userId,
      organization_member_id: updatedSubmission.organizationMemberId,
      week_start_date: updatedSubmission.weekStartDate,
      week_end_date: updatedSubmission.weekEndDate,
      status: updatedSubmission.status,
      total_hours: updatedSubmission.totalHours,
      submitted_at: updatedSubmission.submittedAt,
      approved_by: updatedSubmission.approvedBy,
      approved_at: updatedSubmission.approvedAt,
      rejection_reason: updatedSubmission.rejectionReason,
      created_at: updatedSubmission.createdAt,
      updated_at: updatedSubmission.updatedAt,
      timesheet_entries: updatedSubmission.entries.map((entry: any) => ({
        id: entry.id,
        timesheet_submission_id: entry.timesheetSubmissionId,
        project_id: entry.projectId,
        task_description: entry.taskDescription,
        monday_hours: entry.mondayHours,
        tuesday_hours: entry.tuesdayHours,
        wednesday_hours: entry.wednesdayHours,
        thursday_hours: entry.thursdayHours,
        friday_hours: entry.fridayHours,
        created_at: entry.createdAt,
        updated_at: entry.updatedAt,
        projects: entry.project
          ? {
              id: entry.project.id,
              name: entry.project.name,
              code: entry.project.code,
            }
          : null,
      })),
    };

    return NextResponse.json({
      submission: transformedSubmission,
      success: true,
    });
  } catch (error: any) {
    console.error("Error resolving submission:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
