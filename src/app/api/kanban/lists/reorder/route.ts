import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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
    const supabase = await createClient();

    // Verify board exists and belongs to this organization
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .select(
        `
        id,
        project_id,
        projects!inner (
          id,
          organization_id
        )
      `
      )
      .eq("id", board_id)
      .eq("projects.organization_id", organizationId)
      .single();

    if (boardError || !board) {
      console.error("Board not found error:", boardError);
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Verify all lists belong to the board
    const listIds = list_positions.map((lp) => lp.list_id);
    const { data: lists, error: listsError } = await supabase
      .from("lists")
      .select("id, name")
      .eq("board_id", board_id)
      .in("id", listIds);

    if (listsError || !lists || lists.length !== listIds.length) {
      return NextResponse.json(
        { error: "Some lists not found in the specified board" },
        { status: 404 }
      );
    }

    const results: any[] = [];

    // Update position for each list
    for (const { list_id, position } of list_positions) {
      const { data: updatedList, error: updateError } = await supabase
        .from("lists")
        .update({ position })
        .eq("id", list_id)
        .eq("board_id", board_id)
        .select()
        .single();

      if (updateError) {
        results.push({ list_id, success: false, error: updateError.message });
      } else {
        results.push({ list_id, success: true, list: updatedList });
      }
    }

    // Create activity log for reordering
    await supabase.from("activities").insert([
      {
        user_id: userContext!.userId,
        board_id: board_id,
        action_type: "update",
        entity_type: "board",
        entity_id: board_id,
        details: {
          action: "reorder_lists",
          list_count: list_positions.length,
          new_positions: list_positions,
        },
      },
    ]);

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      results,
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
