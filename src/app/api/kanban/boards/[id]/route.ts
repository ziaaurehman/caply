import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    const { searchParams } = new URL(req.url);
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
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

    // Check if user has access to the board
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        project: {
          organizationId,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            organizationId: true,
            kanbanEnabled: true,
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (!board.project.kanbanEnabled) {
      return NextResponse.json(
        { error: "Kanban is not enabled for this project" },
        { status: 403 }
      );
    }

    // Transform to match expected format
    const transformedBoard = {
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
      projects: {
        id: board.project.id,
        organization_id: board.project.organizationId,
        kanban_enabled: board.project.kanbanEnabled,
      },
    };

    return NextResponse.json({ board: transformedBoard });
  } catch (error) {
    console.error("Error fetching board:", error);
    return NextResponse.json(
      { error: "Failed to fetch board" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    const body = await req.json();
    const {
      name,
      description,
      background_color,
      background_image,
      visibility,
      is_closed,
    } = body;
    const organizationId =
      body.organizationId ||
      body.organization_id ||
      req.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
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

    const { context: userContext } = validation;

    // Check if user has access to the board
    const existingBoard = await prisma.board.findFirst({
      where: {
        id: boardId,
        project: {
          organizationId,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            organizationId: true,
            kanbanEnabled: true,
          },
        },
      },
    });

    if (!existingBoard) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Update board and create activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update board
      const board = await tx.board.update({
        where: { id: boardId },
        data: {
          name: name !== undefined ? name : undefined,
          description: description !== undefined ? description : undefined,
          backgroundColor:
            background_color !== undefined ? background_color : undefined,
          backgroundImage:
            background_image !== undefined ? background_image : undefined,
          visibility: visibility !== undefined ? visibility : undefined,
          isClosed: is_closed !== undefined ? is_closed : undefined,
        },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: userContext!.userId,
          boardId: boardId,
          actionType: "update",
          entityType: "board",
          entityId: boardId,
          details: { changes: body },
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
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    const { searchParams } = new URL(req.url);
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
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

    const { context: userContext } = validation;

    // Check if user has access to the board
    const existingBoard = await prisma.board.findFirst({
      where: {
        id: boardId,
        project: {
          organizationId,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!existingBoard) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Delete board and create activity log in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete board (CASCADE will handle related data)
      await tx.board.delete({
        where: { id: boardId },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: userContext!.userId,
          actionType: "delete",
          entityType: "board",
          entityId: boardId,
          details: { board_name: existingBoard.name },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json(
      { error: "Failed to delete board" },
      { status: 500 }
    );
  }
}
