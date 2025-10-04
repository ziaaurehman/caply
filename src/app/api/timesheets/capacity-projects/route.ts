import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
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

  const validation = await validateOrganizationAccessWithId(organizationId, {
    resource: "timesheets",
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

  try {
    // Get projects where the current user has capacity assignments
    const { data: projects, error } = await supabase
      .from("projects")
      .select(
        `
        id,
        name,
        code,
        description,
        status,
        created_at,
        updated_at,
        project_assignments!inner (
          id,
          hours_per_week,
          start_date,
          end_date,
          is_active,
          resource_allocation_id,
          resource_allocations!inner (
            id,
            organization_member_id,
            organization_members!inner (
              id,
              user_id
            )
          )
        )
      `
      )
      .eq("organization_id", organizationId)
      .eq(
        "project_assignments.resource_allocations.organization_members.user_id",
        userContext.userId
      )
      .eq("project_assignments.is_active", true)
      .eq("project_assignments.resource_allocations.is_active", true);

    if (error) {
      console.error("Error fetching capacity projects:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to remove duplicates and format properly
    const uniqueProjects =
      projects?.reduce((acc: any[], project: any) => {
        const existingProject = acc.find((p) => p.id === project.id);

        if (!existingProject) {
          acc.push({
            id: project.id,
            name: project.name,
            code: project.code,
            description: project.description,
            status: project.status,
            created_at: project.created_at,
            updated_at: project.updated_at,
            isPlanned: true, // All projects returned have capacity planning enabled
            totalHoursPerWeek: project.project_assignments.reduce(
              (sum: number, assignment: any) =>
                sum + (assignment.hours_per_week || 0),
              0
            ),
            assignments: project.project_assignments.map((assignment: any) => ({
              id: assignment.id,
              hoursPerWeek: assignment.hours_per_week,
              startDate: assignment.start_date,
              endDate: assignment.end_date,
              isActive: assignment.is_active,
            })),
          });
        } else {
          // Add hours from additional assignments
          existingProject.totalHoursPerWeek +=
            project.project_assignments.reduce(
              (sum: number, assignment: any) =>
                sum + (assignment.hours_per_week || 0),
              0
            );
          existingProject.assignments.push(
            ...project.project_assignments.map((assignment: any) => ({
              id: assignment.id,
              hoursPerWeek: assignment.hours_per_week,
              startDate: assignment.start_date,
              endDate: assignment.end_date,
              isActive: assignment.is_active,
            }))
          );
        }

        return acc;
      }, []) || [];

    // Sort projects: active first, then by name
    const sortedProjects = uniqueProjects.sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (a.status !== "active" && b.status === "active") return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      projects: sortedProjects,
      success: true,
    });
  } catch (error) {
    console.error("Error in capacity projects GET:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
