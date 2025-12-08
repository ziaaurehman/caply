import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listId = params.id;

  // Check if user has access to the list
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      board: {
        project: {
          projectMembers: {
            some: {
              organizationMember: {
                userId: session.user.id,
                status: "active",
              },
            },
          },
        },
      },
    },
    include: {
      board: {
        include: {
          project: {
            select: {
              id: true,
              organizationId: true,
            },
          },
        },
      },
    },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Transform to match expected format
  const transformedList = {
    id: list.id,
    board_id: list.boardId,
    name: list.name,
    position: list.position,
    is_archived: list.isArchived,
    created_at: list.createdAt,
    updated_at: list.updatedAt,
  };

  return NextResponse.json({ list: transformedList });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id;
    const body = await req.json();
    const { name, position, is_archived, organizationId } = body;

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

    // Get the existing list and verify it belongs to this organization
    const existingList = await prisma.list.findFirst({
      where: {
        id: listId,
        board: {
          project: {
            organizationId,
          },
        },
      },
      include: {
        board: {
          select: {
            id: true,
            projectId: true,
          },
        },
      },
    });

    if (!existingList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Update list and handle card archiving in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update list
      const list = await tx.list.update({
        where: { id: listId },
        data: {
          name: name !== undefined ? name : undefined,
          position: position !== undefined ? position : undefined,
          isArchived: is_archived !== undefined ? is_archived : undefined,
        },
      });

      // *** CRITICAL: When archiving/unarchiving a list, also archive/unarchive all its cards ***
      if (
        typeof is_archived === "boolean" &&
        is_archived !== existingList.isArchived
      ) {
        try {
          // Update all cards in this list to match the list's archive status
          const updatedCards = await tx.card.updateMany({
            where: { listId },
            data: { isArchived: is_archived },
          });

          console.log(
            `🔄 ${is_archived ? "Archived" : "Unarchived"} ${updatedCards.count} cards in list: ${list.name}`
          );

          // Get card details for activity logs
          const cards = await tx.card.findMany({
            where: { listId },
            select: { id: true, title: true },
          });

          // Create activity logs for card updates
          if (cards.length > 0) {
            await tx.activity.createMany({
              data: cards.map((card) => ({
                userId: userContext!.userId,
                boardId: existingList.board.id,
                cardId: card.id,
                actionType: is_archived ? "archive" : "unarchive",
                entityType: "card",
                entityId: card.id,
                details: {
                  card_title: card.title,
                  reason: `List ${is_archived ? "archived" : "unarchived"}`,
                  list_name: list.name,
                },
              })),
            });
          }
        } catch (cardsUpdateError) {
          console.error(
            "Error updating cards when archiving/unarchiving list:",
            cardsUpdateError
          );
        }
      }

      // Create activity log for list update
      await tx.activity.create({
        data: {
          userId: userContext!.userId,
          boardId: existingList.board.id,
          actionType: is_archived
            ? "archive"
            : is_archived === false
              ? "unarchive"
              : "update",
          entityType: "list",
          entityId: listId,
          details: {
            changes: body,
            cards_affected:
              is_archived !== undefined
                ? "Cards " +
                  (is_archived ? "archived" : "unarchived") +
                  " with list"
                : undefined,
          },
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
    console.error("Error in PATCH /api/kanban/lists/[id]:", error);
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
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id;
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

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

    // Get the existing list and verify it belongs to this organization
    const existingList = await prisma.list.findFirst({
      where: {
        id: listId,
        board: {
          project: {
            organizationId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        boardId: true,
      },
    });

    if (!existingList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Delete list and create activity log in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete list (CASCADE will handle related cards)
      await tx.list.delete({
        where: { id: listId },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: userContext!.userId,
          boardId: existingList.boardId,
          actionType: "delete",
          entityType: "list",
          entityId: listId,
          details: { list_name: existingList.name },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/kanban/lists/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
