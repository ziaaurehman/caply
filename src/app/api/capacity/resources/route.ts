import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

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

    // Simple cache key - main queries get longer cache
    const isMainQuery = onlyActive && filterUserIds.length === 0;
    const cacheKey = isMainQuery
      ? `resources:main:${organizationId}`
      : `resources:${organizationId}:${onlyActive}:${filterUserIds.join(",") || "all"}`;

    const supabase = await createClient();

    // Step 1: Get basic resource allocations (simple query)
    let resourcesQuery = supabase
      .from("resource_allocations")
      .select(
        `
        id,
        organization_member_id,
        weekly_capacity_hours,
        hourly_rate,
        is_active,
        is_archived,
        created_at,
        updated_at
      `
      )
      .eq("organization_id", organizationId);

    if (onlyActive) resourcesQuery = resourcesQuery.eq("is_active", true);

    const { data: resources, error: resourcesError } =
      await resourcesQuery.order("created_at", { ascending: true });

    if (resourcesError) {
      console.error("Error fetching resources:", resourcesError);
      return NextResponse.json(
        { error: resourcesError.message },
        { status: 500 }
      );
    }

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
        resources.map((r) => r.organization_member_id)
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
        memberMap.get(resource.organization_member_id) || null,
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

// POST: upsert resource (create or update by organization_member_id)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    organizationId,
    organization_member_id,
    weekly_capacity_hours,
    hourly_rate,
    is_active,
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

  try {
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

    const { data, error } = await supabase
      .from("resource_allocations")
      .upsert(
        {
          organization_id: organizationId,
          organization_member_id,
          weekly_capacity_hours: weekly_capacity_hours ?? 40,
          hourly_rate: hourly_rate ?? null,
          is_active: is_active ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,organization_member_id" }
      )
      .select("*")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ resource: data });
  } catch (e) {
    console.error("Error upserting capacity resource:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
