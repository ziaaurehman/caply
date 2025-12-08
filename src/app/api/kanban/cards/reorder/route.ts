import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { list_id, card_positions, organizationId } = body;
    const orgId = organizationId || req.headers.get("x-organization-id");

    if (!list_id || !card_positions || !Array.isArray(card_positions)) {
      return NextResponse.json(
        { error: "List ID and card positions array are required" },
        { status: 400 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(orgId, {
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

    // Verify user has access to the list through organization
    const list = await prisma.list.findFirst({
      where: {
        id: list_id,
        board: {
          project: {
            organizationId: orgId,
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

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Verify all cards belong to the list and user has access
    const cardIds = card_positions.map((cp) => cp.card_id);
    const cards = await prisma.card.findMany({
      where: {
        listId: list_id,
        id: {
          in: cardIds,
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (cards.length !== cardIds.length) {
      return NextResponse.json(
        { error: "Some cards not found in the specified list" },
        { status: 404 }
      );
    }

    // Update positions and create activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const results: any[] = [];

      // Update position for each card
      for (const { card_id, position } of card_positions) {
        try {
          const updatedCard = await tx.card.update({
            where: { id: card_id },
            data: { position },
          });
          results.push({ card_id, success: true, card: updatedCard });
        } catch (error: any) {
          results.push({
            card_id,
            success: false,
            error: error.message || "Update failed",
          });
        }
      }

      // Create activity log for reordering
      await tx.activity.create({
        data: {
          userId: userContext!.userId,
          boardId: list.board.id,
          actionType: "update",
          entityType: "list",
          entityId: list_id,
          details: {
            action: "reorder_cards",
            card_count: card_positions.length,
            new_positions: card_positions,
          },
        },
      });

      return results;
    });

    const successCount = result.filter((r) => r.success).length;
    const errorCount = result.filter((r) => !r.success).length;

    return NextResponse.json({
      results: result,
      summary: {
        total: card_positions.length,
        successful: successCount,
        failed: errorCount,
      },
    });
  } catch (error: any) {
    console.error("Error in PATCH /api/kanban/cards/reorder:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
