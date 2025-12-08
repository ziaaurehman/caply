import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [LEAVE API] GET /api/leave/requests - Starting request");

    const { searchParams } = new URL(request.url);
    const organizationId =
      searchParams.get("organizationId") ||
      request.headers.get("x-organization-id");
    console.log("🔍 [LEAVE API] Organization ID:", organizationId);

    if (!organizationId) {
      console.log("❌ [LEAVE API] No organization ID provided");
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    console.log("🔍 [LEAVE API] Validating organization access...");
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "leave_requests",
      action: "read",
    });

    if (!validation.success) {
      console.log("❌ [LEAVE API] Validation failed:", validation.error);
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const userId = searchParams.get("user_id");
    const status = searchParams.get("status");
    const leaveType = searchParams.get("leave_type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build where clause
    const where: any = {
      organizationId,
    };

    if (userId) {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }
    if (leaveType) {
      where.type = leaveType;
    }
    if (startDate) {
      where.startDate = {
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      where.endDate = {
        lte: new Date(endDate),
      };
    }

    console.log("🔍 [LEAVE API] Executing database query...");
    const [leaveRequests, count] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
          approver: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    const totalPages = Math.ceil(count / limit);

    // Transform to match expected format
    const transformedRequests = leaveRequests.map((request) => ({
      id: request.id,
      organization_id: request.organizationId,
      user_id: request.userId,
      type: request.type,
      start_date: request.startDate,
      end_date: request.endDate,
      days_requested: request.daysRequested,
      reason: request.reason,
      status: request.status,
      approved_by: request.approvedBy,
      approved_at: request.approvedAt,
      rejection_reason: request.rejectionReason,
      created_at: request.createdAt,
      updated_at: request.updatedAt,
      users: request.user
        ? {
            id: request.user.id,
            full_name: request.user.fullName,
            email: request.user.email,
            avatar_url: request.user.avatarUrl,
          }
        : null,
      approver: request.approver
        ? {
            id: request.approver.id,
            full_name: request.approver.fullName,
            email: request.approver.email,
          }
        : null,
    }));

    return NextResponse.json({
      leave_requests: transformedRequests,
      pagination: {
        page,
        limit,
        total: count,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    });
  } catch (error) {
    console.error("Leave requests GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [LEAVE API] POST /api/leave/requests - Starting request");

    const { searchParams } = new URL(request.url);
    const organizationId =
      searchParams.get("organizationId") ||
      request.headers.get("x-organization-id");

    if (!organizationId) {
      console.log("❌ [LEAVE API] No organization ID provided");
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    console.log("🔍 [LEAVE API] Validating organization access...");
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "leave_requests",
      action: "read",
    });

    if (!validation.success) {
      console.log("❌ [LEAVE API] Validation failed:", validation.error);
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const { context: userContext } = validation;

    const body = await request.json();

    const { leave_type, start_date, end_date, reason } = body;

    // Validate required fields
    if (!leave_type || !start_date || !end_date) {
      console.log("❌ [LEAVE API] Missing required fields:", {
        leave_type,
        start_date,
        end_date,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate total days (days_requested)
    const start = new Date(start_date);
    const end = new Date(end_date);
    const timeDiff = end.getTime() - start.getTime();
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    console.log("🔍 [LEAVE API] Calculated total days:", totalDays);

    // Check for overlapping requests
    console.log("🔍 [LEAVE API] Checking for overlapping requests...");
    const overlappingRequests = await prisma.leaveRequest.findMany({
      where: {
        userId: userContext!.userId,
        organizationId,
        status: {
          in: ["pending", "approved"],
        },
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(end_date) } },
              { endDate: { gte: new Date(start_date) } },
            ],
          },
        ],
      },
      select: {
        id: true,
      },
    });

    console.log("🔍 [LEAVE API] Overlap check result:", {
      overlappingCount: overlappingRequests.length,
    });

    if (overlappingRequests.length > 0) {
      console.log(
        "❌ [LEAVE API] Overlapping requests found:",
        overlappingRequests
      );
      return NextResponse.json(
        { error: "You have overlapping leave requests" },
        { status: 400 }
      );
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        organizationId,
        userId: userContext!.userId,
        type: leave_type,
        startDate: new Date(start_date),
        endDate: new Date(end_date),
        daysRequested: totalDays,
        status: "pending",
        reason: reason || null,
      },
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
    });

    console.log(
      "✅ [LEAVE API] Successfully created leave request:",
      leaveRequest.id
    );

    // Transform to match expected format
    const transformedRequest = {
      id: leaveRequest.id,
      organization_id: leaveRequest.organizationId,
      user_id: leaveRequest.userId,
      type: leaveRequest.type,
      start_date: leaveRequest.startDate,
      end_date: leaveRequest.endDate,
      days_requested: leaveRequest.daysRequested,
      reason: leaveRequest.reason,
      status: leaveRequest.status,
      approved_by: leaveRequest.approvedBy,
      approved_at: leaveRequest.approvedAt,
      rejection_reason: leaveRequest.rejectionReason,
      created_at: leaveRequest.createdAt,
      updated_at: leaveRequest.updatedAt,
      users: leaveRequest.user
        ? {
            id: leaveRequest.user.id,
            full_name: leaveRequest.user.fullName,
            email: leaveRequest.user.email,
            avatar_url: leaveRequest.user.avatarUrl,
          }
        : null,
    };

    return NextResponse.json({ leave_request: transformedRequest });
  } catch (error) {
    console.error("Leave request POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
