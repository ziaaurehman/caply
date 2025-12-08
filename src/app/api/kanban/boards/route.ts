import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const organizationId =
    searchParams.get("organizationId") || req.headers.get("x-organization-id");

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

  // Verify project exists and belongs to the organization
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId,
    },
    select: {
      id: true,
      kanbanEnabled: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.kanbanEnabled) {
    return NextResponse.json(
      { error: "Kanban is not enabled for this project" },
      { status: 403 }
    );
  }

  // Get ONLY basic board information (no nested data)
  const boards = await prisma.board.findMany({
    where: {
      projectId,
      isClosed: false,
    },
    orderBy: {
      position: "asc",
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      description: true,
      backgroundColor: true,
      backgroundImage: true,
      isClosed: true,
      visibility: true,
      position: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Transform to match expected format
  const transformedBoards = boards.map((board) => ({
    id: board.id,
    project_id: board.projectId,
    name: board.name,
    description: board.description,
    background_color: board.backgroundColor,
    background_image: board.backgroundImage,
    is_closed: board.isClosed,
    visibility: board.visibility,
    position: board.position,
    created_by: board.createdBy,
    created_at: board.createdAt,
    updated_at: board.updatedAt,
  }));

  const result = { boards: transformedBoards };
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    project_id,
    organizationId,
    name,
    description,
    background_color,
    background_image,
    visibility,
  } = body;

  if (!project_id || !name) {
    return NextResponse.json(
      { error: "Project ID and name are required" },
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

  // Verify project exists and belongs to the organization
  const project = await prisma.project.findFirst({
    where: {
      id: project_id,
      organizationId,
    },
    select: {
      id: true,
      kanbanEnabled: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.kanbanEnabled) {
    return NextResponse.json(
      { error: "Kanban is not enabled for this project" },
      { status: 403 }
    );
  }

  // Get next position
  const lastBoard = await prisma.board.findFirst({
    where: {
      projectId: project_id,
    },
    orderBy: {
      position: "desc",
    },
    select: {
      position: true,
    },
  });

  const position = lastBoard ? lastBoard.position + 1 : 0;

  // Create board and activity log in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create board
    const board = await tx.board.create({
      data: {
        projectId: project_id,
        name,
        description: description || null,
        backgroundColor: background_color || "#0079bf",
        backgroundImage: background_image || null,
        visibility: visibility || "project",
        position,
        createdBy: userContext.userId,
      },
    });

    // Create activity log
    await tx.activity.create({
      data: {
        userId: userContext.userId,
        boardId: board.id,
        actionType: "create",
        entityType: "board",
        entityId: board.id,
        details: { board_name: name },
      },
    });

    return board;
  });

  // Transform to match expected format
  const transformedBoard = {
    id: result.id,
    project_id: result.projectId,
    name: result.name,
    description: result.description,
    background_color: result.backgroundColor,
    background_image: result.backgroundImage,
    is_closed: result.isClosed,
    visibility: result.visibility,
    position: result.position,
    created_by: result.createdBy,
    created_at: result.createdAt,
    updated_at: result.updatedAt,
  };

  return NextResponse.json({ board: transformedBoard });
}
