import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

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

    const userContext = validation.context!;

    // Check if user has admin/manager role or projects.manage permission for full access
    const hasFullAccess =
      userContext.membership.role.name === "admin" ||
      userContext.membership.role.name === "manager" ||
      userContext.membership.role.permissions.some(
        (p) => p.resource === "projects" && p.action === "manage"
      );

    // If user doesn't have full access, check if they're a member of this project
    if (!hasFullAccess) {
      const memberCheck = await prisma.projectMember.findFirst({
        where: {
          projectId,
          organizationMemberId: userContext.membership.id,
        },
      });

      if (!memberCheck) {
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 404 }
        );
      }
    }

    // Fetch the specific project with members
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      include: {
        projectMembers: {
          include: {
            organizationMember: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Helper function to convert DateTime to date string (YYYY-MM-DD)
    const formatDateForInput = (date: Date | null | undefined): string | undefined => {
      if (!date) return undefined;
      // If it's already a string, return it
      if (typeof date === 'string') {
        // Extract date part if it's an ISO string
        return date.split('T')[0];
      }
      // Convert Date object to YYYY-MM-DD format
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Transform project to match expected format
    const transformedProject = {
      id: project.id,
      name: project.name,
      code: project.code,
      description: project.description,
      project_type: project.projectType,
      billing_rate: project.billingRate,
      budget_hours: project.budgetHours,
      budget_amount: project.budgetAmount,
      start_date: formatDateForInput(project.startDate),
      end_date: formatDateForInput(project.endDate),
      status: project.status,
      task_categories: project.taskCategories,
      kanban_enabled: project.kanbanEnabled,
      timesheet_enabled: project.timesheetEnabled,
      team_availability_enabled: project.teamAvailabilityEnabled,
      capacity_planning_enabled: project.capacityPlanningEnabled,
      state: project.state,
      documents: project.documents,
      organization_id: project.organizationId,
      client_id: project.clientId,
      created_by: project.createdBy,
      created_at: project.createdAt,
      updated_at: project.updatedAt,
      project_members: project.projectMembers.map((pm) => ({
        id: pm.id,
        organization_member_id: pm.organizationMemberId,
        role: pm.role,
        joined_at: pm.joinedAt,
        organization_members: {
          id: pm.organizationMember.id,
          user_id: pm.organizationMember.userId,
          users: {
            id: pm.organizationMember.user.id,
            full_name: pm.organizationMember.user.fullName,
            email: pm.organizationMember.user.email,
            avatar_url: pm.organizationMember.user.avatarUrl,
          },
        },
      })),
    };

    const result = {
      project: transformedProject,
      user_access: hasFullAccess ? "full" : "member",
    };

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

    // Check if project exists and belongs to the organization
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Helper function to parse date strings to DateTime objects
    const parseDate = (dateString: string | null | undefined): Date | null => {
      if (!dateString) return null;
      // If it's already a Date object, return it
      if (dateString instanceof Date) return dateString;
      // If it's an ISO-8601 string with time, parse it directly
      if (dateString.includes('T') || dateString.includes(' ')) {
        return new Date(dateString);
      }
      // If it's a date-only string (YYYY-MM-DD), convert to DateTime at midnight UTC
      return new Date(dateString + 'T00:00:00.000Z');
    };

    // Transform update data to Prisma format
    const prismaUpdateData: any = {};
    if (updateData.project_type !== undefined)
      prismaUpdateData.projectType = updateData.project_type;
    if (updateData.billing_rate !== undefined)
      prismaUpdateData.billingRate = updateData.billing_rate
        ? parseFloat(updateData.billing_rate)
        : null;
    if (updateData.budget_hours !== undefined)
      prismaUpdateData.budgetHours = updateData.budget_hours;
    if (updateData.budget_amount !== undefined)
      prismaUpdateData.budgetAmount = updateData.budget_amount
        ? parseFloat(updateData.budget_amount)
        : null;
    if (updateData.start_date !== undefined)
      prismaUpdateData.startDate = parseDate(updateData.start_date);
    if (updateData.end_date !== undefined)
      prismaUpdateData.endDate = parseDate(updateData.end_date);
    if (updateData.status !== undefined)
      prismaUpdateData.status = updateData.status;
    if (updateData.task_categories !== undefined)
      prismaUpdateData.taskCategories = updateData.task_categories;
    if (updateData.kanban_enabled !== undefined)
      prismaUpdateData.kanbanEnabled = updateData.kanban_enabled;
    if (updateData.timesheet_enabled !== undefined)
      prismaUpdateData.timesheetEnabled = updateData.timesheet_enabled;
    if (updateData.team_availability_enabled !== undefined)
      prismaUpdateData.teamAvailabilityEnabled =
        updateData.team_availability_enabled;
    if (updateData.capacity_planning_enabled !== undefined)
      prismaUpdateData.capacityPlanningEnabled =
        updateData.capacity_planning_enabled;
    if (updateData.state !== undefined)
      prismaUpdateData.state = updateData.state;
    if (updateData.documents !== undefined)
      prismaUpdateData.documents = updateData.documents;
    if (updateData.name !== undefined) prismaUpdateData.name = updateData.name;
    if (updateData.code !== undefined) prismaUpdateData.code = updateData.code;
    if (updateData.description !== undefined)
      prismaUpdateData.description = updateData.description;
    if (updateData.client_id !== undefined)
      prismaUpdateData.clientId = updateData.client_id || null;

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: prismaUpdateData,
    });

    // Transform to match expected format
    const transformedProject = {
      id: updatedProject.id,
      name: updatedProject.name,
      code: updatedProject.code,
      description: updatedProject.description,
      project_type: updatedProject.projectType,
      billing_rate: updatedProject.billingRate,
      budget_hours: updatedProject.budgetHours,
      budget_amount: updatedProject.budgetAmount,
      start_date: updatedProject.startDate,
      end_date: updatedProject.endDate,
      status: updatedProject.status,
      task_categories: updatedProject.taskCategories,
      kanban_enabled: updatedProject.kanbanEnabled,
      timesheet_enabled: updatedProject.timesheetEnabled,
      team_availability_enabled: updatedProject.teamAvailabilityEnabled,
      capacity_planning_enabled: updatedProject.capacityPlanningEnabled,
      state: updatedProject.state,
      documents: updatedProject.documents,
      organization_id: updatedProject.organizationId,
      client_id: updatedProject.clientId,
      created_by: updatedProject.createdBy,
      created_at: updatedProject.createdAt,
      updated_at: updatedProject.updatedAt,
    };

    return NextResponse.json({
      success: true,
      project: transformedProject,
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

    // Check if project exists and belongs to the organization
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete project (cascading deletes should handle related records)
    await prisma.project.delete({
      where: { id: projectId },
    });

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
