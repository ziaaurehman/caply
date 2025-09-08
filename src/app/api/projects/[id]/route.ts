import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { redisGetJSON, redisSetJSON, redisDel } from "@/utils/redis";

// Cache TTL - 7 days for page 1 only (most frequently accessed)
const PAGE_ONE_CACHE_TTL = 604800; // 7 days in seconds

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Get organization ID from query params or headers
    const url = new URL(req.url);
    const organizationId =
      url.searchParams.get("organizationId") ||
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
      resource: "projects",
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

    const supabase = await createClient();
    const userContext = validation.context!;

    // Check if user has admin/manager role or projects.manage permission for full access
    const hasFullAccess =
      userContext.membership.role.name === "admin" ||
      userContext.membership.role.name === "manager" ||
      userContext.membership.role.permissions.some(
        (p) => p.resource === "projects" && p.action === "manage"
      );

    // Try cache first (15 days TTL)
    const cacheKey = `project:${projectId}:${organizationId}:${hasFullAccess ? "all" : userContext.userId}`;
    const cached = await redisGetJSON<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch the specific project
    let query = supabase
      .from("projects")
      .select(
        `
        *,
        project_members (
          id,
          organization_member_id,
          role,
          joined_at,
          organization_members!organization_member_id (
            id,
            user_id,
            users!user_id (
              id,
              full_name,
              email,
              avatar_url
            )
          )
        )
      `
      )
      .eq("id", projectId)
      .eq("organization_id", organizationId);

    // If user doesn't have full access, check if they're a member of this project
    if (!hasFullAccess) {
      const { data: memberCheck } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("organization_member_id", userContext.membership.id)
        .single();

      if (!memberCheck) {
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 404 }
        );
      }
    }

    const { data: project, error } = await query.single();

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const result = {
      project,
      user_access: hasFullAccess ? "full" : "member",
    };

    // Cache the result (15 days)
    try {
      await redisSetJSON(cacheKey, result, 1296000);
    } catch (e) {
      console.warn("Failed to cache project:", e);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const { organizationId, ...updateData } = body;

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
      resource: "projects",
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

    const supabase = await createClient();
    const userContext = validation.context!;

    // Check if project exists and belongs to the organization
    const { data: existingProject, error: projectError } = await supabase
      .from("projects")
      .select("id, organization_id")
      .eq("id", projectId)
      .eq("organization_id", organizationId)
      .single();

    if (projectError || !existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", projectId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating project:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Clear individual project cache and refresh projects list cache
    try {
      // Clear individual project cache for all access levels
      const projectCacheKeys = [
        `project:${projectId}:${organizationId}:all`, // Admin/Manager access
        `project:${projectId}:${organizationId}:${userContext.userId}`, // User-specific access
      ];

      for (const key of projectCacheKeys) {
        try {
          await redisDel(key);
          console.log("🗑️ Cleared project cache:", key);
        } catch (cacheError) {
          console.warn("Failed to clear project cache:", key, cacheError);
        }
      }

      // Refresh projects list cache for all possible combinations
      const cacheKeysToInvalidate = [
        `projects:page1:${organizationId}:::all`, // Admin/Manager empty search, no status
        `projects:page1:${organizationId}::active:all`, // Admin/Manager empty search, active status
        `projects:page1:${organizationId}::on_hold:all`, // Admin/Manager empty search, on_hold status
        `projects:page1:${organizationId}::completed:all`, // Admin/Manager empty search, completed status
        `projects:page1:${organizationId}::cancelled:all`, // Admin/Manager empty search, cancelled status
        // Add user-specific caches if needed
        `projects:page1:${organizationId}:::${userContext.userId}`, // User empty search, no status
        `projects:page1:${organizationId}::active:${userContext.userId}`, // User empty search, active status
        `projects:page1:${organizationId}::on_hold:${userContext.userId}`, // User empty search, on_hold status
        `projects:page1:${organizationId}::completed:${userContext.userId}`, // User empty search, completed status
        `projects:page1:${organizationId}::cancelled:${userContext.userId}`, // User empty search, cancelled status
      ];

      // for (const key of cacheKeysToInvalidate) {
      //   try {
      //     // Refresh cache with new data for admins/managers only
      //     const { data: projects } = await supabase
      //       .from('projects')
      //       .select(`
      //         id,
      //         name,
      //         code,
      //         description,
      //         project_type,
      //         billing_rate,
      //         budget_hours,
      //         budget_amount,
      //         start_date,
      //         end_date,
      //         status,
      //         created_at,
      //         updated_at,
      //         kanban_enabled,
      //         timesheet_enabled,
      //         team_availability_enabled,
      //         capacity_planning_enabled,
      //         state,
      //         organization_id,
      //         client_id,
      //         created_by
      //       `)
      //       .eq('organization_id', organizationId)
      //       .order('created_at', { ascending: false })
      //       .range(0, 9) // First 10 items for page 1

      //     // Get total count
      //     const { count: totalCount } = await supabase
      //       .from('projects')
      //       .select('id', { count: 'exact', head: true })
      //       .eq('organization_id', organizationId)

      //     const totalPages = Math.ceil((totalCount || 0) / 10)

      //     const refreshedResult = {
      //       projects: projects || [],
      //       user_role: 'admin',
      //       total_projects: totalCount || 0,
      //       access_level: 'all_organization_projects',
      //       pagination: {
      //         page: 1,
      //         limit: 10,
      //         total: totalCount || 0,
      //         totalPages,
      //         hasNext: 1 < totalPages,
      //         hasPrev: false
      //       }
      //     }

      //     await redisSetJSON(key, refreshedResult, PAGE_ONE_CACHE_TTL)
      //     console.log('🔄 Refreshed projects page 1 cache after project update')
      //   } catch (cacheError) {
      //     console.warn('Failed to refresh specific cache key:', key, cacheError)
      //   }
      // }

      // Single database query to get all projects

      const { data: projects } = await supabase
        .from("projects")
        .select(
          `
        id,
        name,
        code,
        description,
        project_type,
        billing_rate,
        budget_hours,
        budget_amount,
        start_date,
        end_date,
        status,
        created_at,
        updated_at,
        kanban_enabled,
        timesheet_enabled,
        team_availability_enabled,
        capacity_planning_enabled,
        state,
        organization_id,
        client_id,
        created_by
      `
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .range(0, 9); // First 10 items for page 1

      // Get total count once
      const { count: totalCount } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);

      const totalPages = Math.ceil((totalCount || 0) / 10);

      // Create the base result object once
      const baseResult = {
        projects: projects || [],
        user_role: "admin",
        total_projects: totalCount || 0,
        access_level: "all_organization_projects",
        pagination: {
          page: 1,
          limit: 10,
          total: totalCount || 0,
          totalPages,
          hasNext: 1 < totalPages,
          hasPrev: false,
        },
      };

      // Update all cache keys with the same data
      const cachePromises = cacheKeysToInvalidate.map(async (key) => {
        try {
          await redisSetJSON(key, baseResult, PAGE_ONE_CACHE_TTL);
        } catch (cacheError) {
          console.warn(
            "Failed to refresh specific cache key:",
            key,
            cacheError
          );
        }
      });

      // Execute all cache updates in parallel
      await Promise.all(cachePromises);
      console.log(
        `🔄 Refreshed ${cacheKeysToInvalidate.length} projects page 1 cache entries after project update`
      );
    } catch (e) {
      console.warn("Failed to refresh projects page 1 cache after update:", e);
    }

    return NextResponse.json({
      success: true,
      project: updatedProject,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Get organization ID from query params or headers
    const url = new URL(req.url);
    const organizationId =
      url.searchParams.get("organizationId") ||
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
      resource: "projects",
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

    const supabase = await createClient();

    // Check if project exists and belongs to the organization
    const { data: existingProject, error: projectError } = await supabase
      .from("projects")
      .select("id, organization_id")
      .eq("id", projectId)
      .eq("organization_id", organizationId)
      .single();

    if (projectError || !existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete project (cascading deletes should handle related records)
    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (deleteError) {
      console.error("Error deleting project:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Refresh page 1 cache after deleting project
    try {
      const cacheKeysToInvalidate = [
        `projects:page1:${organizationId}:::all`, // Admin/Manager empty search, no status
        // Note: For projects, we'll only refresh the admin cache for simplicity
        // Individual user caches can be added if needed
      ];

      for (const key of cacheKeysToInvalidate) {
        try {
          // Refresh cache with new data for admins/managers only
          const { data: projects } = await supabase
            .from("projects")
            .select(
              `
              id,
              name,
              code,
              description,
              project_type,
              billing_rate,
              budget_hours,
              budget_amount,
              start_date,
              end_date,
              status,
              created_at,
              updated_at,
              kanban_enabled,
              timesheet_enabled,
              team_availability_enabled,
              capacity_planning_enabled,
              state,
              organization_id,
              client_id,
              created_by
            `
            )
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false })
            .range(0, 9); // First 10 items for page 1

          // Get total count
          const { count: totalCount } = await supabase
            .from("projects")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId);

          const totalPages = Math.ceil((totalCount || 0) / 10);

          const refreshedResult = {
            projects: projects || [],
            user_role: "admin",
            total_projects: totalCount || 0,
            access_level: "all_organization_projects",
            pagination: {
              page: 1,
              limit: 10,
              total: totalCount || 0,
              totalPages,
              hasNext: 1 < totalPages,
              hasPrev: false,
            },
          };

          await redisSetJSON(key, refreshedResult, PAGE_ONE_CACHE_TTL);
          console.log(
            "🔄 Refreshed projects page 1 cache after project deletion"
          );
        } catch (cacheError) {
          console.warn(
            "Failed to refresh specific cache key:",
            key,
            cacheError
          );
        }
      }
    } catch (e) {
      console.warn("Failed to refresh projects page 1 cache after delete:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
