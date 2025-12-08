// Create: src/app/api/timesheets/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const userContext = validation.context!;

  try {
    // Validate submission exists and belongs to user
    const submission = await prisma.timesheetSubmission.findFirst({
      where: {
        id: submissionId,
        userId: userContext.userId,
        status: "draft",
      },
      include: {
        entries: true,
      },
    });

    if (!submission) {
      return NextResponse.json(
        {
          error: "Timesheet not found or not in draft status",
        },
        { status: 404 }
      );
    }

    // Validate entries
    const hasTimeEntries =
      submission.entries?.some(
        (entry) =>
          Number(entry.mondayHours || 0) > 0 ||
          Number(entry.tuesdayHours || 0) > 0 ||
          Number(entry.wednesdayHours || 0) > 0 ||
          Number(entry.thursdayHours || 0) > 0 ||
          Number(entry.fridayHours || 0) > 0
      ) &&
      submission.entries?.every(
        (entry) => (entry.taskDescription || "").trim().length > 0
      );

    if (!hasTimeEntries) {
      return NextResponse.json(
        {
          error: "Cannot submit timesheet without valid time entries",
        },
        { status: 400 }
      );
    }

    // Calculate total hours from entries before updating (convert to Number first)
    const totalHours =
      submission.entries?.reduce(
        (sum: number, entry) =>
          sum +
          Number(entry.mondayHours || 0) +
          Number(entry.tuesdayHours || 0) +
          Number(entry.wednesdayHours || 0) +
          Number(entry.thursdayHours || 0) +
          Number(entry.fridayHours || 0),
        0
      ) || 0;

    // Update submission status to submitted
    const updatedSubmission = await prisma.timesheetSubmission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
        totalHours,
      },
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
      week_start_date: updatedSubmission.weekStartDate,
      week_end_date: updatedSubmission.weekEndDate,
      status: updatedSubmission.status,
      total_hours: updatedSubmission.totalHours,
      submitted_at: updatedSubmission.submittedAt,
      created_at: updatedSubmission.createdAt,
      updated_at: updatedSubmission.updatedAt,
      timesheet_entries: updatedSubmission.entries.map((entry) => ({
        id: entry.id,
        submission_id: entry.timesheetSubmissionId,
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
