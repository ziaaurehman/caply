import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

// Get ALL projects with capacity planning enabled (no pagination limits)
export async function GET(req: NextRequest) {
  console.log("🔍 GET /api/capacity/projects/all - Starting request");

  try {
    const { searchParams } = new URL(req.url);
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

    const supabase = await createClient();
    const userContext = validation.context!;

    // Check if user has admin/manager role or capacity.manage permission for full access
    const hasFullAccess =
      userContext.membership.role.name === "admin" ||
      userContext.membership.role.name === "manager" ||
      userContext.membership.role.permissions.some(
        (p) => p.resource === "capacity" && p.action === "manage"
      );

    let projectIds: string[] = [];

    if (hasFullAccess) {
      console.log(
        "Admin gets all capacity-enabled projects - get ALL IDs (no limit)"
      );
      // Admin gets all capacity-enabled projects - get ALL IDs (no limit)
      const { data: allProjects, error: allProjectsError } = await supabase
        .from("projects")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("capacity_planning_enabled", true);

      if (allProjectsError) {
        console.error("Error fetching all projects:", allProjectsError);
        return NextResponse.json(
          { error: allProjectsError.message },
          { status: 500 }
        );
      }

      projectIds = allProjects?.map((p) => p.id) || [];
    } else {
      // Regular users can only see capacity projects they are members of
      const { data: memberProjectIds, error: memberError } = await supabase
        .from("project_members")
        .select(
          `
          project_id,
          projects!inner (
            capacity_planning_enabled
          )
        `
        )
        .eq("organization_member_id", userContext.membership.id)
        .eq("projects.capacity_planning_enabled", true);

      if (memberError) {
        console.error("Error fetching member projects:", memberError);
        return NextResponse.json(
          { error: memberError.message },
          { status: 500 }
        );
      }

      projectIds = memberProjectIds?.map((p) => p.project_id) || [];
    }

    if (projectIds.length === 0) {
      const emptyResponse = {
        projects: [],
        user_access: hasFullAccess ? "full" : "member",
        total_projects: 0,
        access_level: hasFullAccess
          ? "all_organization_projects"
          : "member_projects_only",
      };

      return NextResponse.json(emptyResponse);
    }

    // Get ALL project details (no pagination limits)
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select(
        `
        id,
        name,
        code,
        status,
        capacity_planning_enabled,
        created_at
      `
      )
      .in("id", projectIds)
      .order("created_at", { ascending: false });

    if (projectsError) {
      console.error("Error fetching project details:", projectsError);
      return NextResponse.json(
        { error: projectsError.message },
        { status: 500 }
      );
    }

    // Optionally get member count for each project (separate query for better performance)
    const { data: memberCounts, error: memberCountsError } = await supabase
      .from("project_members")
      .select("project_id")
      .in("project_id", projectIds);

    if (memberCountsError) {
      console.error("Error fetching member counts:", memberCountsError);
      // Continue without member counts - not critical
    }

    // Count members per project
    const memberCountMap = new Map();
    memberCounts?.forEach((member) => {
      const count = memberCountMap.get(member.project_id) || 0;
      memberCountMap.set(member.project_id, count + 1);
    });

    // Enrich projects with member count
    const enrichedProjects =
      projects?.map((project) => ({
        ...project,
        member_count: memberCountMap.get(project.id) || 0,
      })) || [];

    const response = {
      projects: enrichedProjects,
      user_access: hasFullAccess ? "full" : "member",
      total_projects: enrichedProjects.length,
      access_level: hasFullAccess
        ? "all_organization_projects"
        : "member_projects_only",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("💥 Unexpected error in capacity projects all API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
