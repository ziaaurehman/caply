import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectMemberId = searchParams.get("project_member_id");
  const projectId = searchParams.get("project_id");
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
    resource: "capacity",
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
    // Note: member_capacity table was removed in capacity rework migration
    // This route now returns empty results as the functionality has been replaced
    // with resource_allocations and weekly_capacity_overrides

    // If you need capacity data, use:
    // - /api/capacity/resources for resource allocations
    // - /api/capacity/overview for capacity overview
    // - /api/capacity/weekly-plans for weekly plans

    const response = {
      member_capacities: [],
      total: 0,
      message:
        "This endpoint has been deprecated. Use /api/capacity/resources or /api/capacity/overview instead.",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in capacity members GET:", error);
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
  const { organizationId, ...capacityData } = body;

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
    resource: "capacity",
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

  // Note: member_capacity table was removed in capacity rework migration
  // This functionality has been replaced with resource_allocations and weekly_capacity_overrides
  return NextResponse.json(
    {
      error:
        "This endpoint has been deprecated. Use resource allocations and weekly capacity overrides instead.",
    },
    { status: 410 } // 410 Gone - indicates the resource is no longer available
  );
}
