import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

// Optimized: Simple queries with smart caching
export async function GET(req: NextRequest) {
  console.log("🔍 GET /api/capacity/allocations - Starting request");

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

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

    // Simple cache key - main queries get longer cache, filtered get shorter
    const isMainQuery = !projectId && !startDate && !endDate;
    const cacheKey = isMainQuery
      ? `allocations:main:${organizationId}`
      : `allocations:${organizationId}:${projectId || "all"}:${startDate || ""}:${endDate || ""}`;

    const supabase = await createClient();

    // Step 1: Get basic project assignments (simple query)
    let assignmentsQuery = supabase
      .from("project_assignments")
      .select(
        `
        id,
        project_id,
        hours_per_week,
        start_date,
        end_date,
        is_active,
        resource_allocation_id
      `
      )
      .eq("is_active", true)
      .order("start_date", { ascending: true });

    // Apply filters
    if (projectId)
      assignmentsQuery = assignmentsQuery.eq("project_id", projectId);

    // Date filtering - only include assignments that overlap with date range
    if (startDate && endDate) {
      assignmentsQuery = assignmentsQuery
        .lte("start_date", endDate)
        .or(`end_date.is.null,end_date.gte.${startDate}`);
    } else if (endDate) {
      assignmentsQuery = assignmentsQuery.lte("start_date", endDate);
    } else if (startDate) {
      assignmentsQuery = assignmentsQuery.or(
        `end_date.is.null,end_date.gte.${startDate}`
      );
    }

    const { data: assignments, error: assignmentsError } =
      await assignmentsQuery;

    if (assignmentsError) {
      console.error("Error fetching project assignments:", assignmentsError);
      return NextResponse.json(
        { error: assignmentsError.message },
        { status: 500 }
      );
    }

    // Step 2: Get resource allocations for organization filter
    const resourceIds = Array.from(
      new Set(assignments?.map((a) => a.resource_allocation_id).filter(Boolean))
    );

    if (resourceIds.length === 0) {
      const response = { allocations: [], total: 0 };

      return NextResponse.json(response);
    }

    const { data: resources, error: resourcesError } = await supabase
      .from("resource_allocations")
      .select(
        `
        id,
        organization_member_id,
        organization_id,
        organization_members:organization_member_id (
          id,
          user_id,
          users!user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        )
      `
      )
      .in("id", resourceIds)
      .eq("organization_id", organizationId);

    if (resourcesError) {
      console.error("Error fetching resources:", resourcesError);
      return NextResponse.json(
        { error: resourcesError.message },
        { status: 500 }
      );
    }

    // Step 3: Get projects info
    const projectIds = Array.from(
      new Set(assignments?.map((a) => a.project_id).filter(Boolean))
    );
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, code, status")
      .in("id", projectIds)
      .eq("organization_id", organizationId);

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
      return NextResponse.json(
        { error: projectsError.message },
        { status: 500 }
      );
    }

    // Step 4: Combine data (in memory - fast)
    const resourceMap = new Map(resources?.map((r) => [r.id, r]) || []);
    const projectMap = new Map(projects?.map((p) => [p.id, p]) || []);

    const enrichedAllocations =
      assignments
        ?.map((assignment) => ({
          ...assignment,
          projects: projectMap.get(assignment.project_id) || null,
          resource_allocations:
            resourceMap.get(assignment.resource_allocation_id) || null,
        }))
        .filter((a) => a.resource_allocations) || []; // Only include those in this org

    const response = {
      allocations: enrichedAllocations,
      total: enrichedAllocations.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("💥 Unexpected error in allocations API:", error);
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
  const { organizationId, ...allocationData } = body;

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

  const supabase = await createClient();

  const {
    project_id,
    organization_member_id,
    hours_per_week,
    start_date,
    end_date,
    notes,
  } = allocationData;

  // Validate required fields
  if (
    !project_id ||
    !organization_member_id ||
    !hours_per_week ||
    !start_date
  ) {
    return NextResponse.json(
      {
        error:
          "Project ID, organization member ID, hours per week, and start date are required",
      },
      { status: 400 }
    );
  }

  try {
    // Verify project exists and belongs to the organization
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, organization_id, capacity_planning_enabled")
      .eq("id", project_id)
      .eq("organization_id", organizationId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.capacity_planning_enabled) {
      return NextResponse.json(
        {
          error: "Capacity planning is not enabled for this project",
        },
        { status: 403 }
      );
    }

    // Get or create resource row for this org member
    const { data: resource, error: resErr } = await supabase
      .from("resource_allocations")
      .upsert(
        {
          organization_id: organizationId,
          organization_member_id,
        },
        { onConflict: "organization_id,organization_member_id" }
      )
      .select("id")
      .single();
    if (resErr || !resource) {
      console.error("Failed to upsert resource for assignment:", resErr);
      return NextResponse.json(
        { error: "Failed to prepare resource" },
        { status: 500 }
      );
    }

    // Create project assignment
    const { data: assignment, error: createError } = await supabase
      .from("project_assignments")
      .insert([
        {
          resource_allocation_id: resource.id,
          project_id,
          hours_per_week,
          start_date,
          end_date: end_date || null,
          notes: notes || null,
        },
      ])
      .select(
        `
        *,
        projects (
          id, name, code, status
        ),
        resource_allocations (
          id,
          organization_member_id,
          organization_members:organization_member_id (
            id,
            user_id,
            users!user_id(id, full_name, email, avatar_url)
          )
        )
      `
      )
      .single();

    if (createError) {
      console.error("Error creating project assignment:", createError, {
        payload: allocationData,
        organizationId,
      });
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, allocation: assignment });
  } catch (error) {
    console.error("Error in capacity allocations POST:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
