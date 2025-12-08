import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("board_id");
    const cardId = searchParams.get("card_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    if (!boardId && !cardId) {
      return NextResponse.json(
        { error: "Board ID or Card ID is required" },
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

    // Build where clause based on parameters
    const where: any = {};

    if (boardId) {
      // Verify board exists and user has access through project organization
      const board = await prisma.board.findFirst({
        where: {
          id: boardId,
          project: {
            organizationId,
          },
        },
      });

      if (!board) {
        return NextResponse.json({ error: "Board not found" }, { status: 404 });
      }

      where.boardId = boardId;
    }

    if (cardId) {
      // Verify card exists and user has access through project organization
      const card = await prisma.card.findFirst({
        where: {
          id: cardId,
          list: {
            board: {
              project: {
                organizationId,
              },
            },
          },
        },
      });

      if (!card) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
      }

      where.cardId = cardId;
    }

    // Execute query with pagination
    const activities = await prisma.activity.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: limit,
    });

    // Transform to match expected format
    const transformedActivities = activities.map((activity) => ({
      id: activity.id,
      user_id: activity.userId,
      board_id: activity.boardId,
      card_id: activity.cardId,
      action_type: activity.actionType,
      entity_type: activity.entityType,
      entity_id: activity.entityId,
      details: activity.details,
      created_at: activity.createdAt,
      users: {
        id: activity.user.id,
        full_name: activity.user.fullName,
        email: activity.user.email,
        avatar_url: activity.user.avatarUrl,
      },
    }));

    const result = { activities: transformedActivities };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/kanban/activities:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
