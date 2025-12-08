import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const memberId = searchParams.get("member_id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const organizationId =
    searchParams.get("organizationId") || req.headers.get("x-organization-id");

  if (!organizationId) {
    return NextResponse.json(
      {
        error: "Organization ID is required",
      },
      { status: 400 }
    );
  }

  // Validate organization access and permissions
  const validation = await validateOrganizationAccessWithId(organizationId, {
    resource: "time_entries",
    action: "read",
  });

  if (!validation.success) {
    return NextResponse.json(
      {
        error: validation.error,
      },
      { status: validation.status }
    );
  }

  try {
    // Build where clause
    const where: any = {
      organizationId,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (memberId) {
      // Note: TimeEntry doesn't have projectMemberId directly, it has userId
      // This might need adjustment based on your schema
      where.userId = memberId;
    }

    if (startDate) {
      where.date = { ...where.date, gte: new Date(startDate) };
    }

    if (endDate) {
      where.date = { ...where.date, lte: new Date(endDate) };
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Transform to match expected format
    const transformedEntries = timeEntries.map((entry) => ({
      id: entry.id,
      organization_id: entry.organizationId,
      user_id: entry.userId,
      project_id: entry.projectId,
      task_id: entry.taskId,
      description: entry.description,
      start_time: entry.startTime,
      end_time: entry.endTime,
      duration_minutes: entry.durationMinutes,
      date: entry.date,
      is_billable: entry.isBillable,
      hourly_rate: entry.hourlyRate,
      status: entry.status,
      submitted_at: entry.submittedAt,
      approved_by: entry.approvedBy,
      approved_at: entry.approvedAt,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
      projects: {
        id: entry.project.id,
        name: entry.project.name,
        code: entry.project.code,
      },
      users: {
        id: entry.user.id,
        full_name: entry.user.fullName,
        email: entry.user.email,
        avatar_url: entry.user.avatarUrl,
      },
    }));

    return NextResponse.json({
      timeEntries: transformedEntries,
      success: true,
    });
  } catch (error) {
    console.error("Error in time entries GET:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { organizationId, ...timeEntryData } = body;

  if (!organizationId) {
    return NextResponse.json(
      {
        error: "Organization ID is required",
      },
      { status: 400 }
    );
  }

  // Validate organization access and permissions
  const validation = await validateOrganizationAccessWithId(organizationId, {
    resource: "time_entries",
    action: "create",
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

  const {
    project_id,
    user_id,
    date,
    duration_minutes,
    description,
    task_id,
    start_time,
    end_time,
    is_billable,
    hourly_rate,
  } = timeEntryData;

  // Validate required fields
  if (!project_id || !user_id || !date || !duration_minutes) {
    return NextResponse.json(
      {
        error: "Project ID, user ID, date, and duration_minutes are required",
      },
      { status: 400 }
    );
  }

  try {
    // Verify project exists and belongs to the organization
    const project = await prisma.project.findFirst({
      where: {
        id: project_id,
        organizationId,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if the user has permission to add time entries
    // Users can add for themselves, admins/managers can add for anyone
    const canAddForUser =
      userContext.membership.role.name === "admin" ||
      userContext.membership.role.name === "manager" ||
      user_id === userContext.userId;

    if (!canAddForUser) {
      return NextResponse.json(
        {
          error: "You can only add time entries for yourself",
        },
        { status: 403 }
      );
    }

    // Create the time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        organizationId,
        userId: user_id,
        projectId: project_id,
        taskId: task_id || null,
        date: new Date(date),
        durationMinutes: parseInt(duration_minutes),
        description: description || "",
        startTime: start_time ? new Date(start_time) : null,
        endTime: end_time ? new Date(end_time) : null,
        isBillable: is_billable !== undefined ? is_billable : true,
        hourlyRate: hourly_rate ? parseFloat(hourly_rate) : null,
        status: "draft",
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Transform to match expected format
    const transformedEntry = {
      id: timeEntry.id,
      organization_id: timeEntry.organizationId,
      user_id: timeEntry.userId,
      project_id: timeEntry.projectId,
      task_id: timeEntry.taskId,
      description: timeEntry.description,
      start_time: timeEntry.startTime,
      end_time: timeEntry.endTime,
      duration_minutes: timeEntry.durationMinutes,
      date: timeEntry.date,
      is_billable: timeEntry.isBillable,
      hourly_rate: timeEntry.hourlyRate,
      status: timeEntry.status,
      submitted_at: timeEntry.submittedAt,
      approved_by: timeEntry.approvedBy,
      approved_at: timeEntry.approvedAt,
      created_at: timeEntry.createdAt,
      updated_at: timeEntry.updatedAt,
      projects: {
        id: timeEntry.project.id,
        name: timeEntry.project.name,
        code: timeEntry.project.code,
      },
      users: {
        id: timeEntry.user.id,
        full_name: timeEntry.user.fullName,
        email: timeEntry.user.email,
        avatar_url: timeEntry.user.avatarUrl,
      },
    };

    return NextResponse.json({
      success: true,
      timeEntry: transformedEntry,
    });
  } catch (error) {
    console.error("Error in time entries POST:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
