import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const isRead = searchParams.get("is_read");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Build where clause
  const where: any = {
    userId: session.user.id,
  };

  // Filter by read status if provided
  if (isRead !== null) {
    where.isRead = isRead === "true";
  }

  // Get notifications with pagination
  const [notifications, total] = await Promise.all([
    prisma.boardNotification.findMany({
      where,
      include: {
        card: {
          include: {
            list: {
              include: {
                board: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        board: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: limit,
    }),
    prisma.boardNotification.count({ where }),
  ]);

  // Transform to match expected format
  const transformedNotifications = notifications.map((notification) => ({
    id: notification.id,
    user_id: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    is_read: notification.isRead,
    related_card_id: notification.relatedCardId,
    related_board_id: notification.relatedBoardId,
    created_at: notification.createdAt,
    cards: notification.card
      ? {
          id: notification.card.id,
          title: notification.card.title,
          lists: {
            id: notification.card.list.id,
            name: notification.card.list.name,
            boards: {
              id: notification.card.list.board.id,
              name: notification.card.list.board.name,
            },
          },
        }
      : null,
    boards: notification.board
      ? {
          id: notification.board.id,
          name: notification.board.name,
        }
      : null,
  }));

  return NextResponse.json({
    notifications: transformedNotifications,
    pagination: {
      total,
      limit,
      offset,
      has_more: total > offset + limit,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { user_id, type, title, message, related_card_id, related_board_id } =
    body;

  if (!user_id || !type || !title || !message) {
    return NextResponse.json(
      { error: "User ID, type, title, and message are required" },
      { status: 400 }
    );
  }

  // Verify the target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: user_id },
    select: { id: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "Target user not found" },
      { status: 404 }
    );
  }

  // If related to a card, verify access
  if (related_card_id) {
    const card = await prisma.card.findFirst({
      where: {
        id: related_card_id,
        list: {
          board: {
            project: {
              projectMembers: {
                some: {
                  organizationMember: {
                    userId: user_id,
                    status: "active",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Card not found or user does not have access" },
        { status: 404 }
      );
    }
  }

  // If related to a board, verify access
  if (related_board_id) {
    const board = await prisma.board.findFirst({
      where: {
        id: related_board_id,
        project: {
          projectMembers: {
            some: {
              organizationMember: {
                userId: user_id,
                status: "active",
              },
            },
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found or user does not have access" },
        { status: 404 }
      );
    }
  }

  // Create notification
  const notification = await prisma.boardNotification.create({
    data: {
      userId: user_id,
      type,
      title,
      message,
      relatedCardId: related_card_id || null,
      relatedBoardId: related_board_id || null,
    },
  });

  return NextResponse.json({ notification });
}
