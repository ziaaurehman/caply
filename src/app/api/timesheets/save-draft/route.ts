// src/app/api/timesheets/save-draft/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    organizationId,
    weekStart,
    entries = [],
    totalHours = 0,
    submissionId,
  } = body;

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
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 4);

    // Use a transaction to handle all operations atomically
    // Increase timeout to 10 seconds to handle large batches of entries
    const result = await prisma.$transaction(
      async (tx) => {
        let currentSubmission;

        // If submissionId is provided, use it directly
        if (submissionId) {
          const existingSubmission = await tx.timesheetSubmission.findFirst({
            where: {
              id: submissionId,
              userId,
              organizationId,
            },
            select: {
              id: true,
              status: true,
            },
          });

          if (!existingSubmission) {
            throw new Error("Submission not found");
          }

          // Only allow updates to draft submissions
          if (existingSubmission.status !== "draft") {
            throw new Error("Cannot update a submitted timesheet");
          }

          // Update existing submission
          currentSubmission = await tx.timesheetSubmission.update({
            where: { id: submissionId },
            data: {
              totalHours,
              weekStartDate: new Date(weekStart),
              weekEndDate,
              updatedAt: new Date(),
            },
          });
        } else {
          // Check for existing submission
          const prevSubmission = await tx.timesheetSubmission.findFirst({
            where: {
              organizationId,
              userId,
              weekStartDate: new Date(weekStart),
            },
            select: {
              id: true,
              status: true,
            },
          });

          if (prevSubmission) {
            // Only allow updates to draft submissions
            if (prevSubmission.status !== "draft") {
              throw new Error("Cannot update a submitted timesheet");
            }

            // Update existing submission
            currentSubmission = await tx.timesheetSubmission.update({
              where: { id: prevSubmission.id },
              data: {
                totalHours,
                weekEndDate,
                updatedAt: new Date(),
              },
            });
          } else {
            // Create new submission using the organizationMemberId we fetched earlier
            // Note: organizationMemberId is optional, so we can use the membership.id we found
            try {
              currentSubmission = await tx.timesheetSubmission.create({
                data: {
                  organizationId,
                  projectId: entries[0].project_id,

                  userId,
                  organizationMemberId: membership.id, // Use the actual OrganizationMember ID
                  weekStartDate: new Date(weekStart),
                  weekEndDate,
                  status: "draft",
                  totalHours,
                },
              });
            } catch (createError: any) {
              // If creation fails, check if it's due to unique constraint or foreign key
              console.error(
                "Error creating timesheet submission:",
                createError
              );

              // If it's a foreign key error, the membership might not exist
              if (createError.code === "P2003") {
                throw new Error(
                  "Invalid organization membership. Please refresh and try again."
                );
              }

              // If creation fails due to unique constraint, fetch and update
              if (createError.code === "P2002") {
                const existing = await tx.timesheetSubmission.findFirst({
                  where: {
                    organizationId,
                    userId,
                    weekStartDate: new Date(weekStart),
                  },
                });

                if (!existing) throw createError;

                if (existing.status !== "draft") {
                  throw new Error("Cannot update a submitted timesheet");
                }

                currentSubmission = await tx.timesheetSubmission.update({
                  where: { id: existing.id },
                  data: {
                    totalHours,
                    weekEndDate,
                    updatedAt: new Date(),
                  },
                });
              } else {
                // Re-throw other errors
                throw createError;
              }
            }
          }
        }

        // Update or create entries
        if (currentSubmission && entries.length > 0) {
          // Delete existing entries
          await tx.timesheetEntry.deleteMany({
            where: {
              timesheetSubmissionId: currentSubmission.id,
            },
          });

          // Insert new entries (only non-empty ones) and calculate total hours at the same time
          const entriesToInsert = entries
            .filter(
              (entry: any) =>
                entry.project_id &&
                ((entry.monday_hours || 0) > 0 ||
                  (entry.tuesday_hours || 0) > 0 ||
                  (entry.wednesday_hours || 0) > 0 ||
                  (entry.thursday_hours || 0) > 0 ||
                  (entry.friday_hours || 0) > 0 ||
                  (entry.task_description && entry.task_description.trim()))
            )
            .map((entry: any) => ({
              timesheetSubmissionId: currentSubmission.id,
              projectId: entry.project_id,
              taskDescription: entry.task_description || "",
              mondayHours: entry.monday_hours || 0,
              tuesdayHours: entry.tuesday_hours || 0,
              wednesdayHours: entry.wednesday_hours || 0,
              thursdayHours: entry.thursday_hours || 0,
              fridayHours: entry.friday_hours || 0,
              mondayNotes: entry.monday_notes || null,
              tuesdayNotes: entry.tuesday_notes || null,
              wednesdayNotes: entry.wednesday_notes || null,
              thursdayNotes: entry.thursday_notes || null,
              fridayNotes: entry.friday_notes || null,
              isBillable: entry.is_billable ?? false,
            }));

          // Calculate total hours from entries we're about to insert (avoid extra query)
          const calculatedTotalHours = entriesToInsert.reduce(
            (sum, e) =>
              sum +
              Number(e.mondayHours || 0) +
              Number(e.tuesdayHours || 0) +
              Number(e.wednesdayHours || 0) +
              Number(e.thursdayHours || 0) +
              Number(e.fridayHours || 0),
            0
          );

          if (entriesToInsert.length > 0) {
            await tx.timesheetEntry.createMany({
              data: entriesToInsert,
            });
          }

          // Update the submission with the calculated total
          await tx.timesheetSubmission.update({
            where: { id: currentSubmission.id },
            data: {
              totalHours: calculatedTotalHours,
              updatedAt: new Date(),
            },
          });
        }

        // Return the submission ID - we'll fetch the full data outside the transaction
        return currentSubmission.id;
      },
      {
        maxWait: 10000, // Maximum time to wait for a transaction slot
        timeout: 10000, // Maximum time the transaction can run (10 seconds)
      }
    );

    // Fetch the full submission data outside the transaction to avoid timeout
    const submission = await prisma.timesheetSubmission.findUnique({
      where: { id: result },
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

    if (!submission) {
      throw new Error("Failed to fetch submission after update");
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
      timesheet_entries: submission.entries.map((entry: any) => ({
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
  } catch (error: any) {
    console.error("Error saving timesheet draft:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
