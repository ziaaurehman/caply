import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId =
      searchParams.get("organizationId") ||
      request.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "leave_requests",
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

    const { id } = await params;

    const leaveRequest = await prisma.leaveRequest.findFirst({
      where: {
        id,
        organizationId,
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
        approver: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

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
      approver: leaveRequest.approver
        ? {
            id: leaveRequest.approver.id,
            full_name: leaveRequest.approver.fullName,
            email: leaveRequest.approver.email,
          }
        : null,
    };

    return NextResponse.json({ leave_request: transformedRequest });
  } catch (error) {
    console.error("Leave request GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId =
      searchParams.get("organizationId") ||
      request.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "leave_requests",
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

    const { context: userContext } = validation;
    const { id } = await params;

    const body = await request.json();
    const { leave_type, start_date, end_date, reason } = body;

    // Check if user owns this request or has permission to edit
    const existingRequest = await prisma.leaveRequest.findFirst({
      where: {
        id,
        organizationId,
      },
      select: {
        userId: true,
        status: true,
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    // Check permissions - users can only edit their own requests
    if (!userContext || existingRequest.userId !== userContext.userId) {
      return NextResponse.json(
        { error: "You can only edit your own leave requests" },
        { status: 403 }
      );
    }

    // Only allow editing if status is pending
    if (existingRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Cannot edit non-pending requests" },
        { status: 400 }
      );
    }

    // Calculate total days if dates are provided
    let totalDays: number | undefined = undefined;
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      const timeDiff = end.getTime() - start.getTime();
      totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    }

    const updateData: any = {};
    if (leave_type) updateData.type = leave_type;
    if (start_date) updateData.startDate = new Date(start_date);
    if (end_date) updateData.endDate = new Date(end_date);
    if (reason !== undefined) updateData.reason = reason;
    if (totalDays !== undefined) updateData.daysRequested = totalDays;

    const leaveRequest = await prisma.leaveRequest.update({
      where: { id },
      data: updateData,
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
    });

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
      approver: leaveRequest.approver
        ? {
            id: leaveRequest.approver.id,
            full_name: leaveRequest.approver.fullName,
            email: leaveRequest.approver.email,
          }
        : null,
    };

    return NextResponse.json({ leave_request: transformedRequest });
  } catch (error) {
    console.error("Leave request PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId =
      searchParams.get("organizationId") ||
      request.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "leave_requests",
      action: "delete",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const { context: userContext } = validation;
    const { id } = await params;

    // Check if user owns this request or has permission to delete
    const existingRequest = await prisma.leaveRequest.findFirst({
      where: {
        id,
        organizationId,
      },
      select: {
        userId: true,
        status: true,
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    // Check permissions - users can only delete their own requests
    if (!userContext || existingRequest.userId !== userContext.userId) {
      return NextResponse.json(
        { error: "You can only delete your own leave requests" },
        { status: 403 }
      );
    }

    // Only allow deleting if status is pending
    if (existingRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Cannot delete non-pending requests" },
        { status: 400 }
      );
    }

    await prisma.leaveRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave request DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
