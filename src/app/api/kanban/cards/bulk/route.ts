import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { operation, card_ids, target_list_id, positions } = body;

  if (!operation || !card_ids || !Array.isArray(card_ids)) {
    return NextResponse.json(
      { error: "Operation and card IDs array are required" },
      { status: 400 }
    );
  }

  // Verify user has access to all cards
  const cards = await prisma.card.findMany({
    where: {
      id: {
        in: card_ids,
      },
      list: {
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
    },
    include: {
      list: {
        include: {
          board: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (cards.length !== card_ids.length) {
    return NextResponse.json(
      { error: "Some cards not found or access denied" },
      { status: 404 }
    );
  }

  const results: any[] = [];

  switch (operation) {
    case "move":
      if (!target_list_id) {
        return NextResponse.json(
          { error: "Target list ID is required for move operation" },
          { status: 400 }
        );
      }

      // Verify access to target list
      const targetList = await prisma.list.findFirst({
        where: {
          id: target_list_id,
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
            select: {
              id: true,
            },
          },
        },
      });

      if (!targetList) {
        return NextResponse.json(
          { error: "Target list not found" },
          { status: 404 }
        );
      }

      // Move cards to target list in a transaction
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < card_ids.length; i++) {
          const cardId = card_ids[i];
          const newPosition =
            positions && positions[i] !== undefined ? positions[i] : i;
          const originalCard = cards.find((c) => c.id === cardId);

          try {
            const updatedCard = await tx.card.update({
              where: { id: cardId },
              data: {
                listId: target_list_id,
                position: newPosition,
              },
            });
            results.push({ card_id: cardId, success: true, card: updatedCard });

            // Get list names for better activity description
            const fromList = originalCard
              ? await tx.list.findUnique({
                  where: { id: originalCard.listId },
                  select: { name: true },
                })
              : null;

            const toList = await tx.list.findUnique({
              where: { id: target_list_id },
              select: { name: true },
            });

            // Create activity log for each moved card
            await tx.activity.create({
              data: {
                userId: session.user.id,
                boardId: originalCard?.list.board.id || targetList.board.id,
                cardId: cardId,
                actionType: "move",
                entityType: "card",
                entityId: cardId,
                details: {
                  from_list_id: originalCard?.listId,
                  from_list_name: fromList?.name || "Unknown List",
                  to_list_id: target_list_id,
                  to_list_name: toList?.name || "Unknown List",
                  card_title: originalCard?.title,
                  bulk_operation: true,
                },
              },
            });
          } catch (error: any) {
            results.push({
              card_id: cardId,
              success: false,
              error: error.message || "Update failed",
            });
          }
        }
      });
      break;

    case "archive":
      // Archive multiple cards in a transaction
      await prisma.$transaction(async (tx) => {
        for (const cardId of card_ids) {
          const originalCard = cards.find((c) => c.id === cardId);
          try {
            const updatedCard = await tx.card.update({
              where: { id: cardId },
              data: { isArchived: true },
            });
            results.push({ card_id: cardId, success: true, card: updatedCard });

            // Create activity log
            await tx.activity.create({
              data: {
                userId: session.user.id,
                boardId: originalCard?.list.board.id || "",
                cardId: cardId,
                actionType: "archive",
                entityType: "card",
                entityId: cardId,
                details: {
                  card_title: originalCard?.title,
                  bulk_operation: true,
                },
              },
            });
          } catch (error: any) {
            results.push({
              card_id: cardId,
              success: false,
              error: error.message || "Update failed",
            });
          }
        }
      });
      break;

    case "delete":
      // Delete multiple cards in a transaction
      await prisma.$transaction(async (tx) => {
        for (const cardId of card_ids) {
          const originalCard = cards.find((c) => c.id === cardId);
          try {
            await tx.card.delete({
              where: { id: cardId },
            });
            results.push({ card_id: cardId, success: true });

            // Create activity log
            await tx.activity.create({
              data: {
                userId: session.user.id,
                boardId: originalCard?.list.board.id || "",
                cardId: cardId,
                actionType: "delete",
                entityType: "card",
                entityId: cardId,
                details: {
                  card_title: originalCard?.title,
                  bulk_operation: true,
                },
              },
            });
          } catch (error: any) {
            results.push({
              card_id: cardId,
              success: false,
              error: error.message || "Delete failed",
            });
          }
        }
      });
      break;

    default:
      return NextResponse.json(
        {
          error:
            "Invalid operation. Supported operations: move, archive, delete",
        },
        { status: 400 }
      );
  }

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  return NextResponse.json({
    results,
    summary: {
      total: card_ids.length,
      successful: successCount,
      failed: errorCount,
    },
  });
}
