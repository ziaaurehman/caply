import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { prisma } from "@/lib/prisma";

// Optimized: Simple queries with smart caching
export async function GET(req: NextRequest) {
  console.log("🔍 GET /api/capacity/resources - Starting request");

  try {
    const { searchParams } = new URL(req.url);
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");
    const userId = searchParams.get("userId");

    const onlyActive = (searchParams.get("only_active") ?? "true") === "true";
    const filterUserIds = searchParams.getAll("user_id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const userRoles = await prisma.organizationMember.findMany({
      where: {
        organizationId, // filter by organization if needed
        userId: userId || "", // optional: filter by specific user
      },
      select: {
        id: true, // organizationMemberId
        organizationId: true,
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });
    const currentMemberId = userRoles[0]?.id; // <-- this is the organizationMemberIdF
    const isAdmin =
      userRoles[0]?.role?.displayName === "Organization Administrator";

    console.log("use Rle", userRoles);

    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "capacity",
      action: "read",
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const supabase = await createClient();

    const isManager =
      userRoles[0]?.role?.displayName === "Manager" ||
      userRoles[0]?.role?.name === "manager";

    const resources = await prisma.resourceAllocation.findMany({
      where: {
        organizationId,
        ...(onlyActive ? { isActive: true } : {}),
        ...(!isAdmin && !isManager && currentMemberId
          ? { organizationMemberId: currentMemberId }
          : {}), // filter by member if not admin or manager
      },
      select: {
        id: true,
        organizationMemberId: true,
        weeklyCapacityHours: true,
        hourlyRate: true,
        isActive: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!resources || resources.length === 0) {
      const emptyResponse = { resources: [] };
      return NextResponse.json(emptyResponse);
    }

    // Step 2: Get organization members info
    const orgMembers = await prisma.organizationMember.findMany({
      where: {
        id: {
          in: resources.map((r) => r.organizationMemberId),
        },
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            position: true,
          },
        },
      },
    });

    // Step 3: Combine data (in memory - fast)
    const memberMap = new Map(orgMembers.map((m) => [m.id, m]));

    let enrichedResources = resources.map((resource) => {
      const member = memberMap.get(resource.organizationMemberId);
      return {
        ...resource,
        organization_id: organizationId, // Add back for compatibility
        organization_members: member
          ? {
            id: member.id,
            user_id: member.userId,
            status: member.status,
            roles: member.role
              ? {
                id: member.role.id,
                name: member.role.name,
              }
              : null,
            users: member.user
              ? {
                id: member.user.id,
                full_name: member.user.fullName,
                email: member.user.email,
                avatar_url: member.user.avatarUrl,
                position: member.user.position,
              }
              : null,
          }
          : null,
      };
    });

    // Filter by user IDs if specified
    if (filterUserIds.length > 0) {
      enrichedResources = enrichedResources.filter((resource) => {
        const userId = (resource.organization_members as any)?.users?.id;
        return userId && filterUserIds.includes(userId);
      });
    }

    const response = { resources: enrichedResources };

    return NextResponse.json(response);
  } catch (e) {
    console.error("💥 Unexpected error in resources API:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      organizationId,
      organization_member_id,
      weekly_capacity_hours,
      hourly_rate,
      is_active,
      // These fields are sent by the modal but not stored in resource_allocations
      start_date,
      end_date,
      notes,
    } = body || {};

    if (!organizationId || !organization_member_id) {
      return NextResponse.json(
        { error: "organizationId and organization_member_id are required" },
        { status: 400 }
      );
    }

    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "capacity",
      action: "create",
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Verify the org member belongs to this organization
    const om = await prisma.organizationMember.findFirst({
      where: {
        id: organization_member_id,
        organizationId,
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!om) {
      return NextResponse.json(
        { error: "Invalid organization member" },
        { status: 400 }
      );
    }

    const existing = await prisma.resourceAllocation.findFirst({
      where: {
        organizationId,
        organizationMemberId: organization_member_id,
      },
    });

    if (existing) {
      // Update existing resource allocation
      const data = await prisma.resourceAllocation.update({
        where: { id: existing.id },
        data: {
          weeklyCapacityHours: weekly_capacity_hours ?? 40,
          hourlyRate: hourly_rate ?? null,
          isActive: is_active ?? true,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          resource: data,
          message: "Resource allocation updated successfully",
        },
        { status: 200 }
      );
    } else {
      // Create new resource allocation
      const data = await prisma.resourceAllocation.create({
        data: {
          organizationId,
          organizationMemberId: organization_member_id,
          weeklyCapacityHours: weekly_capacity_hours ?? 40,
          hourlyRate: hourly_rate ?? null,
          isActive: is_active ?? true,
        },
      });

      return NextResponse.json(
        {
          resource: data,
          message: "Resource allocation created successfully",
        },
        { status: 201 }
      );
    }
  } catch (e) {
    console.error("Error upserting capacity resource:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add PUT method for updating resources
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      resourceId,
      organizationId,
      weeklyCapacityHours,
      hourlyRate,
      isActive,
    } = body;

    if (!resourceId || !organizationId) {
      return NextResponse.json(
        { error: "resourceId and organizationId are required" },
        { status: 400 }
      );
    }

    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "capacity",
      action: "update",
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Verify the resource belongs to this organization
    const existing = await prisma.resourceAllocation.findUnique({
      where: { id: resourceId },
      select: { organizationId: true },
    });

    if (!existing || existing.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Resource not found or access denied" },
        { status: 404 }
      );
    }

    // Update the resource
    const updated = await prisma.resourceAllocation.update({
      where: { id: resourceId },
      data: {
        weeklyCapacityHours: weeklyCapacityHours ?? 40,
        hourlyRate: hourlyRate ?? null,
        isActive: isActive ?? true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      resource: updated,
      message: "Resource updated successfully",
    });
  } catch (e) {
    console.error("Error updating resource:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add DELETE method for deleting resources
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resourceId = searchParams.get("resourceId");

    if (!resourceId) {
      return NextResponse.json(
        { error: "Resource ID is required" },
        { status: 400 }
      );
    }

    // Get the resource to verify it exists and get organization ID
    const resource = await prisma.resourceAllocation.findUnique({
      where: { id: resourceId },
      select: { organizationId: true },
    });

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    const validation = await validateOrganizationAccessWithId(
      resource.organizationId,
      {
        resource: "capacity",
        action: "delete",
      }
    );

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Delete the resource (this will cascade delete all project assignments and weekly plans)
    await prisma.resourceAllocation.delete({
      where: { id: resourceId },
    });

    return NextResponse.json({
      message: "Resource and all related data deleted successfully",
    });
  } catch (e) {
    console.error("Error deleting resource:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
