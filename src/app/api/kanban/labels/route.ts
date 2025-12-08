import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("board_id");
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

    // Check if user has access to the board
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        project: {
          organizationId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Get labels for the board
    const labels = await prisma.label.findMany({
      where: {
        boardId,
      },
      orderBy: {
        name: "asc",
      },
    });

    const result = { labels };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/kanban/labels:", error);
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
    const { board_id, name, color } = body;
    const organizationId =
      body.organizationId ||
      body.organization_id ||
      req.headers.get("x-organization-id");

    if (!board_id || !name || !color) {
      return NextResponse.json(
        { error: "Board ID, name, and color are required" },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate color format (hex color)
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json(
        { error: "Color must be a valid hex color (e.g., #FF0000)" },
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
    const board = await prisma.board.findFirst({
      where: {
        id: board_id,
        project: {
          organizationId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Create label and activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create label
      const label = await tx.label.create({
        data: {
          boardId: board_id,
          name,
          color,
        },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: userContext!.userId,
          boardId: board_id,
          actionType: "create",
          entityType: "label",
          entityId: label.id,
          details: { label_name: name, label_color: color },
        },
      });

      return label;
    });

    return NextResponse.json({ label: result });
  } catch (error) {
    console.error("Error in POST /api/kanban/labels:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
