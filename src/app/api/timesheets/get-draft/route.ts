// src/app/api/timesheets/get-draft/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

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

  // Get user ID from session
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get organization membership
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
      status: "active",
    },
    select: {
      id: true,
      userId: true,
      organizationId: true,
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Organization membership not found" },
      { status: 404 }
    );
  }

  const userId = session.user.id;

  try {
    // Get or create draft submission for the week
    let submission = await prisma.timesheetSubmission.findFirst({
      where: {
        organizationId,
        userId,
        weekStartDate: new Date(weekStart),
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

    // If no submission exists, create a draft one
    if (!submission) {
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 4);

      submission = await prisma.timesheetSubmission.create({
        data: {
          organizationId,
          userId,
          organizationMemberId: membership.id, // Use the actual OrganizationMember ID
          weekStartDate: new Date(weekStart),
          weekEndDate,
          status: "draft",
          totalHours: 0,
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
    }

    // Transform to match expected format
    const transformedSubmission = {
      id: submission.id,
      organization_id: submission.organizationId,
      user_id: submission.userId,
      organization_member_id: submission.organizationMemberId,
      week_start_date: submission.weekStartDate,
      week_end_date: submission.weekEndDate,
      status: submission.status,
      total_hours: submission.totalHours,
      submitted_at: submission.submittedAt,
      created_at: submission.createdAt,
      updated_at: submission.updatedAt,
      timesheet_entries: submission.entries.map((entry) => ({
        id: entry.id,
        submission_id: entry.timesheetSubmissionId,
        project_id: entry.projectId,
        task_description: entry.taskDescription,
        monday_hours: entry.mondayHours,
        tuesday_hours: entry.tuesdayHours,
        wednesday_hours: entry.wednesdayHours,
        thursday_hours: entry.thursdayHours,
        friday_hours: entry.fridayHours,
        monday_notes: entry.mondayNotes,
        tuesday_notes: entry.tuesdayNotes,
        wednesday_notes: entry.wednesdayNotes,
        thursday_notes: entry.thursdayNotes,
        friday_notes: entry.fridayNotes,
        is_billable: entry.isBillable,
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
    console.error("Error fetching timesheet draft:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
