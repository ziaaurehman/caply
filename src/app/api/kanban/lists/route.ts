import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("board_id");
    const includeArchived = searchParams.get("include_archived") === "true";
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    if (!boardId) {
      return NextResponse.json(
        { error: "Board ID is required" },
        { status: 400 }
      );
    }

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

    // Verify board exists and belongs to the organization
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        project: {
          organizationId,
        },
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Build where clause
    const where: any = {
      boardId,
    };

    // Only filter out archived lists if includeArchived is false
    if (!includeArchived) {
      where.isArchived = false;
    }

    // Get ONLY basic list information (no nested cards data for better performance)
    const lists = await prisma.list.findMany({
      where,
      orderBy: {
        position: "asc",
      },
      select: {
        id: true,
        boardId: true,
        name: true,
        position: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Transform to match expected format
    const transformedLists = lists.map((list) => ({
      id: list.id,
      board_id: list.boardId,
      name: list.name,
      position: list.position,
      is_archived: list.isArchived,
      created_at: list.createdAt,
      updated_at: list.updatedAt,
    }));

    // Return basic list information only (cards will be loaded separately)
    const result = { lists: transformedLists };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /api/kanban/lists:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { board_id, name } = body;
    const organizationId =
      body.organizationId ||
      body.organization_id ||
      req.headers.get("x-organization-id");

    if (!board_id || !name) {
      return NextResponse.json(
        { error: "Board ID and name are required" },
        { status: 400 }
      );
    }

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

    // Verify board exists and belongs to the organization
    const board = await prisma.board.findFirst({
      where: {
        id: board_id,
        project: {
          organizationId,
        },
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Get next position
    const lastList = await prisma.list.findFirst({
      where: {
        boardId: board_id,
      },
      orderBy: {
        position: "desc",
      },
      select: {
        position: true,
      },
    });

    const position = lastList ? lastList.position + 1 : 0;

    // Create list and activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create list
      const list = await tx.list.create({
        data: {
          boardId: board_id,
          name,
          position,
        },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: userContext!.userId,
          boardId: board_id,
          actionType: "create",
          entityType: "list",
          entityId: list.id,
          details: { list_name: name },
        },
      });

      return list;
    });

    // Transform to match expected format
    const transformedList = {
      id: result.id,
      board_id: result.boardId,
      name: result.name,
      position: result.position,
      is_archived: result.isArchived,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
    };

    return NextResponse.json({ list: transformedList });
  } catch (error: any) {
    console.error("Error in POST /api/kanban/lists:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
