// src/app/api/timesheets/delete-entry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const userContext = validation.context!;

  try {
    // Use a transaction to handle all operations atomically
    await prisma.$transaction(async (tx) => {
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

      const submissionId = entry.timesheetSubmission.id;

      // Delete the entry
      await tx.timesheetEntry.delete({
        where: { id: entryId },
      });

      // Recalculate and update total hours for the submission
      const remainingEntries = await tx.timesheetEntry.findMany({
        where: {
          timesheetSubmissionId: submissionId,
        },
        select: {
          mondayHours: true,
          tuesdayHours: true,
          wednesdayHours: true,
          thursdayHours: true,
          fridayHours: true,
        },
      });

      const totalHours = remainingEntries.reduce(
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
        where: { id: submissionId },
        data: {
          totalHours,
          updatedAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Entry deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting timesheet entry:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
