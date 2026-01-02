// src/app/api/timesheets/update-entry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    is_billable,
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

  const userContext = validation.context!;

  try {
    // Use a transaction to handle all operations atomically
    const result = await prisma.$transaction(async (tx) => {
      // First, verify that the entry belongs to a draft submission owned by the user
      const entry = await tx.timesheetEntry.findFirst({
        where: {
          id: entryId,
          timesheetSubmission: {
            userId: userContext.userId,
            status: "draft",
            organizationId,
          },
        },
        include: {
          timesheetSubmission: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!entry) {
        throw new Error("Entry not found or not accessible");
      }

      // Update the entry
      const updateData: any = {};

      if (project_id !== undefined) updateData.projectId = project_id;
      if (task_description !== undefined)
        updateData.taskDescription = task_description;
      if (monday_hours !== undefined) updateData.mondayHours = monday_hours;
      if (tuesday_hours !== undefined) updateData.tuesdayHours = tuesday_hours;
      if (wednesday_hours !== undefined)
        updateData.wednesdayHours = wednesday_hours;
      if (thursday_hours !== undefined)
        updateData.thursdayHours = thursday_hours;
      if (friday_hours !== undefined) updateData.fridayHours = friday_hours;
      if (monday_notes !== undefined) updateData.mondayNotes = monday_notes;
      if (tuesday_notes !== undefined) updateData.tuesdayNotes = tuesday_notes;
      if (wednesday_notes !== undefined)
        updateData.wednesdayNotes = wednesday_notes;
      if (thursday_notes !== undefined)
        updateData.thursdayNotes = thursday_notes;
      if (friday_notes !== undefined) updateData.fridayNotes = friday_notes;
      if (is_billable !== undefined) updateData.isBillable = is_billable;

      const updatedEntry = await tx.timesheetEntry.update({
        where: { id: entryId },
        data: updateData,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      // Recalculate and update total hours for the submission
      const allEntries = await tx.timesheetEntry.findMany({
        where: {
          timesheetSubmissionId: entry.timesheetSubmission.id,
        },
        select: {
          mondayHours: true,
          tuesdayHours: true,
          wednesdayHours: true,
          thursdayHours: true,
          fridayHours: true,
        },
      });

      const totalHours = allEntries.reduce(
        (sum, e) =>
          sum +
          Number(e.mondayHours || 0) +
          Number(e.tuesdayHours || 0) +
          Number(e.wednesdayHours || 0) +
          Number(e.thursdayHours || 0) +
          Number(e.fridayHours || 0),
        0
      );

      // Update the submission's total hours
      await tx.timesheetSubmission.update({
        where: { id: entry.timesheetSubmission.id },
        data: {
          totalHours,
          updatedAt: new Date(),
        },
      });

      return updatedEntry;
    });

    // Transform to match expected format
    const transformedEntry = {
      id: result.id,
      timesheet_submission_id: result.timesheetSubmissionId,
      project_id: result.projectId,
      task_description: result.taskDescription,
      monday_hours: result.mondayHours,
      tuesday_hours: result.tuesdayHours,
      wednesday_hours: result.wednesdayHours,
      thursday_hours: result.thursdayHours,
      friday_hours: result.fridayHours,
      monday_notes: result.mondayNotes,
      tuesday_notes: result.tuesdayNotes,
      wednesday_notes: result.wednesdayNotes,
      thursday_notes: result.thursdayNotes,
      friday_notes: result.fridayNotes,
      is_billable: result.isBillable,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
      projects: result.project
        ? {
          id: result.project.id,
          name: result.project.name,
          code: result.project.code,
        }
        : null,
    };

    return NextResponse.json({
      entry: transformedEntry,
      success: true,
    });
  } catch (error: any) {
    console.error("Error updating timesheet entry:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
