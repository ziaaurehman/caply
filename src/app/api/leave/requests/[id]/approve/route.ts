import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function POST(
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
      action: "approve",
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
    const { status, comment, rejected_reason } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (status === "rejected" && !rejected_reason) {
      return NextResponse.json(
        { error: "Rejection reason required" },
        { status: 400 }
      );
    }

    // Get the existing request
    const existingRequest = await prisma.leaveRequest.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    if (existingRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Request has already been processed" },
        { status: 400 }
      );
    }

    // Update the request
    const updateData: any = {
      status,
      approvedBy: userContext!.userId,
      approvedAt: new Date(),
    };

    if (comment) {
      updateData.approverComment = comment;
    }

    if (status === "rejected" && rejected_reason) {
      updateData.rejectionReason = rejected_reason;
    }

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

    // Note: leave balances table not used; skipping balance updates

    return NextResponse.json({ leave_request: transformedRequest });
  } catch (error) {
    console.error("Leave request approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
