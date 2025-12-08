import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(request: NextRequest) {
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

    // Get all users in the organization
    const users = await prisma.organizationMember.findMany({
      where: {
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Get leave requests for all users
    const requests = await prisma.leaveRequest.findMany({
      where: {
        organizationId,
      },
      select: {
        userId: true,
        status: true,
        daysRequested: true,
        startDate: true,
      },
    });

    // Calculate summary for each user
    const summary = users.map((member) => {
      const userRequests = requests.filter((r) => r.userId === member.userId);
      const totalLeaveDays = userRequests.reduce(
        (sum, r) => sum + (r.daysRequested || 0),
        0
      );
      const usedLeaveDays = userRequests
        .filter((r) => r.status === "approved")
        .reduce((sum, r) => sum + (r.daysRequested || 0), 0);
      const remainingLeaveDays = Math.max(0, totalLeaveDays - usedLeaveDays);

      const pendingRequests = userRequests.filter(
        (r) => r.status === "pending"
      ).length;
      const upcomingRequests = userRequests.filter((r) => {
        if (r.status !== "approved") return false;
        const startDate = new Date(r.startDate);
        const today = new Date();
        const thirtyDaysFromNow = new Date(
          today.getTime() + 30 * 24 * 60 * 60 * 1000
        );
        return startDate >= today && startDate <= thirtyDaysFromNow;
      }).length;

      return {
        user_id: member.userId,
        user_name: member.user?.fullName || "Unknown",
        user_email: member.user?.email || "",
        total_leave_days: totalLeaveDays,
        used_leave_days: usedLeaveDays,
        remaining_leave_days: remainingLeaveDays,
        pending_requests: pendingRequests,
        upcoming_requests: upcomingRequests,
      };
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Leave summary GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
