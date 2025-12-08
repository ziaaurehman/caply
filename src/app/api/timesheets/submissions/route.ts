// src/app/api/timesheets/submissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const organizationId =
    searchParams.get("organizationId") || req.headers.get("x-organization-id");
  const status = searchParams.get("status");
  const filterUserId = searchParams.get("user_id");
  const weekStart = searchParams.get("week_start");
  const weekEnd = searchParams.get("week_end");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search");

  if (!organizationId) {
    return NextResponse.json(
      {
        error: "Organization ID is required",
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
    include: {
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Organization membership not found" },
      { status: 404 }
    );
  }

  const userId = session.user.id;
  const roleName = membership.role?.name || "member";

  try {
    // Build where clause
    const where: any = {
      organizationId,
    };

    if (status) {
      where.status = status;
    }

    if (filterUserId) {
      where.userId = filterUserId;
    }

    if (weekStart) {
      where.weekStartDate = {
        gte: new Date(weekStart),
      };
    }

    if (weekEnd) {
      where.weekEndDate = {
        lte: new Date(weekEnd),
      };
    }

    // For non-admin users, only show their own submissions
    if (roleName !== "admin" && roleName !== "manager") {
      where.userId = userId;
    }

    // Handle search - filter by user name or email
    if (search) {
      where.user = {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // Get submissions with pagination
    const [submissions, total] = await Promise.all([
      prisma.timesheetSubmission.findMany({
        where,
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
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
          projectMember: {
            include: {
              organizationMember: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ weekStartDate: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.timesheetSubmission.count({ where }),
    ]);

    // Transform the data
    const transformedSubmissions = submissions.map((submission) => ({
      id: submission.id,
      userId: submission.userId,
      userName: submission.user?.fullName || "Unknown User",
      userEmail: submission.user?.email || "No Email",
      userAvatar: submission.user?.avatarUrl,
      weekStart: submission.weekStartDate,
      weekEnd: submission.weekEndDate,
      totalHours: Number(submission.totalHours) || 0,
      status: submission.status,
      data: submission.entries.map((entry: any) => ({
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
      submittedAt: submission.submittedAt,
      approvedAt: submission.approvedAt,
      approvedBy: submission.approvedBy,
      rejectionReason: submission.rejectionReason,
      projectMember: submission.projectMember
        ? {
            id: submission.projectMember.id,
            organization_members: {
              id: submission.projectMember.organizationMember.id,
              user_id: submission.projectMember.organizationMember.userId,
              users: {
                id: submission.projectMember.organizationMember.user.id,
                full_name:
                  submission.projectMember.organizationMember.user.fullName,
                email: submission.projectMember.organizationMember.user.email,
                avatar_url:
                  submission.projectMember.organizationMember.user.avatarUrl,
              },
            },
          }
        : null,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      submissions: transformedSubmissions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error in submissions GET:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
