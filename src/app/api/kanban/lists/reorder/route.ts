import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { board_id, list_positions, organizationId } = body;

    if (!board_id || !list_positions || !Array.isArray(list_positions)) {
      return NextResponse.json(
        { error: "Board ID and list positions array are required" },
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

    // Verify board exists and belongs to this organization
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

    // Verify all lists belong to the board
    const listIds = list_positions.map((lp) => lp.list_id);
    const lists = await prisma.list.findMany({
      where: {
        boardId: board_id,
        id: {
          in: listIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (lists.length !== listIds.length) {
      return NextResponse.json(
        { error: "Some lists not found in the specified board" },
        { status: 404 }
      );
    }

    // Update positions and create activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const results: any[] = [];

      // Update position for each list
      for (const { list_id, position } of list_positions) {
        try {
          const updatedList = await tx.list.update({
            where: { id: list_id },
            data: { position },
          });
          results.push({ list_id, success: true, list: updatedList });
        } catch (error: any) {
          results.push({
            list_id,
            success: false,
            error: error.message || "Update failed",
          });
        }
      }

      // Create activity log for reordering
      await tx.activity.create({
        data: {
          userId: userContext!.userId,
          boardId: board_id,
          actionType: "update",
          entityType: "board",
          entityId: board_id,
          details: {
            action: "reorder_lists",
            list_count: list_positions.length,
            new_positions: list_positions,
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
        total: list_positions.length,
        successful: successCount,
        failed: errorCount,
      },
    });
  } catch (error: any) {
    console.error("Error in PATCH /api/kanban/lists/reorder:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
