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
    const onlyActive = (searchParams.get("only_active") ?? "true") === "true";
    const filterUserIds = searchParams.getAll("user_id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

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

    const resources = await prisma.resourceAllocation.findMany({
      where: {
        organizationId,
        ...(onlyActive ? { isActive: true } : {}),
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
    const { data: orgMembers, error: membersError } = await supabase
      .from("organization_members")
      .select(
        `
        id,
        user_id,
        status,
        roles:role_id (
          id,
          name
        ),
        users!user_id (
          id,
          full_name,
          email,
          avatar_url,
          position
        )
      `
      )
      .in(
        "id",
        resources.map((r) => r.organizationMemberId)
      );

    if (membersError) {
      console.error("Error fetching organization members:", membersError);
      return NextResponse.json(
        { error: membersError.message },
        { status: 500 }
      );
    }

    // Step 3: Combine data (in memory - fast)
    const memberMap = new Map((orgMembers || []).map((m) => [m.id, m]));

    let enrichedResources = resources.map((resource) => ({
      ...resource,
      organization_id: organizationId, // Add back for compatibility
      organization_members:
        memberMap.get(resource.organizationMemberId) || null,
    }));

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
      action: "manage",
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const supabase = await createClient();

    // Verify the org member belongs to this organization
    const { data: om, error: omErr } = await supabase
      .from("organization_members")
      .select("id, organization_id")
      .eq("id", organization_member_id)
      .single();

    if (omErr || !om || (om as any).organization_id !== organizationId) {
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
