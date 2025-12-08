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

    const userId = searchParams.get("user_id");

    const where: any = {
      organizationId,
    };

    if (userId) {
      where.userId = userId;
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      select: {
        status: true,
        daysRequested: true,
        startDate: true,
      },
    });

    const stats = {
      total_requests: requests.length,
      pending_requests: requests.filter((r) => r.status === "pending").length,
      approved_requests: requests.filter((r) => r.status === "approved").length,
      rejected_requests: requests.filter((r) => r.status === "rejected").length,
      total_days_requested:
        requests.reduce((sum, r) => sum + (r.daysRequested || 0), 0),
      total_days_approved: requests
        .filter((r) => r.status === "approved")
        .reduce((sum, r) => sum + (r.daysRequested || 0), 0),
      upcoming_requests: requests.filter((r) => {
        if (r.status !== "approved") return false;
        const startDate = new Date(r.startDate);
        const today = new Date();
        const thirtyDaysFromNow = new Date(
          today.getTime() + 30 * 24 * 60 * 60 * 1000
        );
        return startDate >= today && startDate <= thirtyDaysFromNow;
      }).length,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Leave stats GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
