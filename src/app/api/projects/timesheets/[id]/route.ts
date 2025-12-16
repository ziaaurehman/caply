import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: projectId } = await params;
  console.log("Comes Here");

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 }
    );
  }

  // Validate session
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get only Approved Timesheets for this project
    const timesheets = await prisma.timesheetSubmission.findMany({
      where: {
        entries: {
          some: {
            projectId,
          },
        },
        status: "approved",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        entries: {
          where: { projectId },
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
      orderBy: {
        weekStartDate: "desc",
      },
    });
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        budgetHours: true,
        startDate: true,
        endDate: true,
        billingRate: true,
        status: true,
      },
    });

    const formatted = timesheets.map((ts) => ({
      id: ts.id,
      week_start_date: ts.weekStartDate,
      week_end_date: ts.weekEndDate,
      total_hours: ts.totalHours,
      status: ts.status,
      approved_at: ts.submittedAt,
      user: ts.user,
      entries: ts.entries.map((e) => ({
        id: e.id,
        task_description: e.taskDescription,
        monday_hours: e.mondayHours,
        tuesday_hours: e.tuesdayHours,
        wednesday_hours: e.wednesdayHours,
        thursday_hours: e.thursdayHours,
        friday_hours: e.fridayHours,
        notes: {
          monday: e.mondayNotes,
          tuesday: e.tuesdayNotes,
          wednesday: e.wednesdayNotes,
          thursday: e.thursdayNotes,
          friday: e.fridayNotes,
        },
        project: e.project,
      })),
    }));

    return NextResponse.json({
      success: true,
      project_id: projectId,
      project,
      approved_timesheets: formatted,
    });
  } catch (error: any) {
    console.error("Error fetching project timesheets:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
