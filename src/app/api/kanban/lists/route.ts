import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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

    const supabase = await createClient();

    // Verify board exists and belongs to the organization
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
      .eq("id", boardId)
      .eq("projects.organization_id", organizationId)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Get ONLY basic list information (no nested cards data for better performance)
    let query = supabase
      .from("lists")
      .select(
        `
        id,
        board_id,
        name,
        position,
        is_archived,
        created_at,
        updated_at
      `
      )
      .eq("board_id", boardId);

    // Only filter out archived lists if includeArchived is false
    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }

    const { data: lists, error } = await query.order("position", {
      ascending: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return basic list information only (cards will be loaded separately)
    const result = { lists: lists || [] };

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
    const supabase = await createClient();

    // Verify board exists and belongs to the organization
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
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Get next position
    const { data: lastList } = await supabase
      .from("lists")
      .select("position")
      .eq("board_id", board_id)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const position = lastList ? lastList.position + 1 : 0;

    // Create list
    const { data: list, error } = await supabase
      .from("lists")
      .insert([
        {
          board_id,
          name,
          position,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create activity log
    await supabase.from("activities").insert([
      {
        user_id: userContext!.userId,
        board_id: board_id,
        action_type: "create",
        entity_type: "list",
        entity_id: list.id,
        details: { list_name: name },
      },
    ]);

    return NextResponse.json({ list });
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
