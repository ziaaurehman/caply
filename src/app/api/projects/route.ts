import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  console.log("🔍 GET /api/projects - Starting request");

  try {
    // Get organization ID from query params or headers
    const url = new URL(req.url);
    const organizationId =
      url.searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    // Get pagination parameters
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";

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

    // Check if user has admin/manager role or projects.manage permission for full access
    const userContext = validation.context!;
    const hasFullAccess =
      userContext.membership.role.name === "admin" ||
      userContext.membership.role.name === "manager" ||
      userContext.membership.role.permissions.some(
        (p) => p.resource === "projects" && p.action === "manage"
      );

    console.log("✅ Organization access validated for:", organizationId);

    // Calculate offset for pagination
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      organizationId,
    };

    // Add search filter if search term provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    // Add status filter if status provided
    if (status) {
      where.status = status;
    }

    let totalCount = 0;
    let projects: any[] = [];

    if (hasFullAccess) {
      // User with full access can see all projects in organization
      totalCount = await prisma.project.count({ where });

      projects = await prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Regular users can only see projects they are members of
      // First get the project IDs where user is a member
      const memberProjects = await prisma.projectMember.findMany({
        where: {
          organizationMemberId: userContext.membership.id,
        },
        select: {
          projectId: true,
        },
      });

      if (memberProjects.length === 0) {
        totalCount = 0;
        projects = [];
      } else {
        const projectIds = memberProjects.map((p) => p.projectId);
        where.id = { in: projectIds };

        totalCount = await prisma.project.count({ where });

        projects = await prisma.project.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        });
      }
    }

    // Transform projects to match expected format
    const transformedProjects = projects.map((project) => ({
      id: project.id,
      name: project.name,
      code: project.code,
      description: project.description,
      project_type: project.projectType,
      billing_rate: project.billingRate,
      budget_hours: project.budgetHours,
      budget_amount: project.budgetAmount,
      start_date: project.startDate,
      end_date: project.endDate,
      status: project.status,
      created_at: project.createdAt,
      updated_at: project.updatedAt,
      kanban_enabled: project.kanbanEnabled,
      timesheet_enabled: project.timesheetEnabled,
      team_availability_enabled: project.teamAvailabilityEnabled,
      capacity_planning_enabled: project.capacityPlanningEnabled,
      state: project.state,
      organization_id: project.organizationId,
      client_id: project.clientId,
      created_by: project.createdBy,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    const result = {
      projects: transformedProjects,
      user_role: hasFullAccess ? "admin" : "member",
      total_projects: totalCount,
      access_level: hasFullAccess
        ? "all_organization_projects"
        : "member_projects_only",
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("💥 Unexpected error in projects API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const organizationId =
    body.organizationId ||
    body.organization_id ||
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

  const userContext = validation.context!;

  // Accept all fields from migration, set org/user context
  const {
    client_id,
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
    team_member_ids,
    task_categories,
    kanban_enabled,
    timesheet_enabled,
    team_availability_enabled,
    capacity_planning_enabled,
    state,
    documents,
  } = body;

  // Set default status if not provided
  const projectStatus = status || "active";

  // Convert date strings to DateTime objects
  // Prisma expects ISO-8601 DateTime, so we need to convert date-only strings
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

  try {
    // Create the project with members and kanban board in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the project
      const project = await tx.project.create({
        data: {
          organizationId,
          clientId: client_id || null,
          name,
          code: code || null,
          description: description || null,
          projectType: project_type || "time_materials",
          billingRate: billing_rate ? parseFloat(billing_rate) : null,
          budgetHours: budget_hours || null,
          budgetAmount: budget_amount ? parseFloat(budget_amount) : null,
          startDate: parseDate(start_date),
          endDate: parseDate(end_date),
          status: projectStatus,
          taskCategories: task_categories || [],
          kanbanEnabled: kanban_enabled !== undefined ? kanban_enabled : true,
          timesheetEnabled:
            timesheet_enabled !== undefined ? timesheet_enabled : true,
          teamAvailabilityEnabled:
            team_availability_enabled !== undefined
              ? team_availability_enabled
              : true,
          capacityPlanningEnabled:
            capacity_planning_enabled !== undefined
              ? capacity_planning_enabled
              : true,
          state: state || "draft",
          documents: documents || [],
          createdBy: userContext.userId,
        },
      });

      // Add team members if provided
      if (
        team_member_ids &&
        Array.isArray(team_member_ids) &&
        team_member_ids.length > 0
      ) {
        // Validate that all team_member_ids are valid organization members
        const validMembers = await tx.organizationMember.findMany({
          where: {
            id: { in: team_member_ids },
            organizationId,
            status: "active",
          },
          select: {
            id: true,
          },
        });

        if (validMembers.length > 0) {
          // Create project_members entries
          await tx.projectMember.createMany({
            data: validMembers.map((member) => ({
              projectId: project.id,
              organizationMemberId: member.id,
              addedBy: userContext.userId,
            })),
          });

          console.log(
            `Project ${project.name} created successfully by user ${userContext.userId}`
          );
        } else {
          console.log(
            "No valid team members found or no team members provided"
          );
        }
      }

      // Create default Kanban board if kanban is enabled
      if (kanban_enabled) {
        console.log("Creating default Kanban board for project:", project.id);

        const board = await tx.board.create({
          data: {
            projectId: project.id,
            name: `${name} Board`,
            description: `Default Kanban board for ${name}`,
            createdBy: userContext.userId,
          },
        });

        console.log("Successfully created Kanban board:", board.id);

        // Create default lists (To Do, In Progress, Done)
        const defaultLists = [
          { name: "To Do", position: 0 },
          { name: "In Progress", position: 1 },
          { name: "Done", position: 2 },
        ];

        await tx.list.createMany({
          data: defaultLists.map((list) => ({
            boardId: board.id,
            name: list.name,
            position: list.position,
          })),
        });

        console.log("Successfully created default lists for board");
      }

      return project;
    });

    return NextResponse.json({
      success: true,
      project: {
        id: result.id,
        name: result.name,
        code: result.code,
        description: result.description,
        project_type: result.projectType,
        billing_rate: result.billingRate,
        budget_hours: result.budgetHours,
        budget_amount: result.budgetAmount,
        start_date: result.startDate,
        end_date: result.endDate,
        status: result.status,
        task_categories: result.taskCategories,
        kanban_enabled: result.kanbanEnabled,
        timesheet_enabled: result.timesheetEnabled,
        team_availability_enabled: result.teamAvailabilityEnabled,
        capacity_planning_enabled: result.capacityPlanningEnabled,
        state: result.state,
        documents: result.documents,
        organization_id: result.organizationId,
        client_id: result.clientId,
        created_by: result.createdBy,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
        team_members: team_member_ids || [],
      },
    });
  } catch (error) {
    console.error("Error in project creation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const {
    id: projectId,
    organizationId,
    team_member_ids,
    ...updateData
  } = body;

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 }
    );
  }

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

  const userContext = validation.context!;

  // Check if project exists and belongs to the organization
  const existingProject = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId,
    },
    select: {
      id: true,
      kanbanEnabled: true,
      name: true,
    },
  });

  if (!existingProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    // Validate status if provided
    if (updateData.status) {
      const validStatuses = ["active", "on_hold", "completed", "cancelled"];
      if (!validStatuses.includes(updateData.status)) {
        return NextResponse.json(
          {
            error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

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
      prismaUpdateData.startDate = updateData.start_date;
    if (updateData.end_date !== undefined)
      prismaUpdateData.endDate = updateData.end_date;
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

    // Update project and handle team members/kanban in a transaction
    const updatedProject = await prisma.$transaction(async (tx) => {
      // Update project data
      const project = await tx.project.update({
        where: { id: projectId },
        data: prismaUpdateData,
      });

      // Handle team member updates if provided
      if (team_member_ids !== undefined && Array.isArray(team_member_ids)) {
        // Remove existing team members
        await tx.projectMember.deleteMany({
          where: { projectId },
        });

        // Add new team members if any provided
        if (team_member_ids.length > 0) {
          // Validate that all team_member_ids are valid organization members
          const validMembers = await tx.organizationMember.findMany({
            where: {
              id: { in: team_member_ids },
              organizationId,
              status: "active",
            },
            select: {
              id: true,
            },
          });

          if (validMembers.length > 0) {
            // Create project_members entries
            await tx.projectMember.createMany({
              data: validMembers.map((member) => ({
                projectId,
                organizationMemberId: member.id,
                addedBy: userContext.userId,
              })),
            });

            console.log(`Team members updated for project ${project.name}`);
          }
        }
      }

      // Handle Kanban board creation based on kanban_enabled changes
      if (updateData.kanban_enabled !== undefined) {
        if (updateData.kanban_enabled && !existingProject.kanbanEnabled) {
          // Kanban was enabled, create default board
          console.log("Creating default Kanban board for project:", projectId);

          const kanbanBoard = await tx.board.create({
            data: {
              projectId,
              name: `${project.name} Board`,
              createdBy: userContext.userId,
            },
          });

          // Create default lists
          const defaultLists = [
            { name: "To Do", position: 0 },
            { name: "In Progress", position: 1 },
            { name: "Review", position: 2 },
            { name: "Done", position: 3 },
          ];

          await tx.list.createMany({
            data: defaultLists.map((list) => ({
              boardId: kanbanBoard.id,
              name: list.name,
              position: list.position,
            })),
          });
        } else if (
          !updateData.kanban_enabled &&
          existingProject.kanbanEnabled
        ) {
          // Kanban was disabled, optionally clean up boards
          console.log("Kanban disabled for project:", projectId);
          // Note: We might want to soft-delete or archive boards instead of hard delete
        }
      }

      return project;
    });

    return NextResponse.json({
      success: true,
      project: {
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
      },
    });
  } catch (error) {
    console.error("Error in project update:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
