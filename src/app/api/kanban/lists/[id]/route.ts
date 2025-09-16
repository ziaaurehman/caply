import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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

  const supabase = await createClient();
  const listId = params.id;

  // Check if user has access to the list
  const { data: list, error } = await supabase
    .from("lists")
    .select(
      `
      *,
      boards!inner (
        id,
        projects!inner (
          organization_members!inner (
            user_id
          )
        )
      )
    `
    )
    .eq("id", listId)
    .eq("boards.projects.organization_members.user_id", session.user.id)
    .eq("boards.projects.organization_members.status", "active")
    .single();

  if (error || !list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  return NextResponse.json({ list });
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
    const supabase = await createClient();

    // Get the existing list and verify it belongs to this organization
    const { data: existingList, error: listError } = await supabase
      .from("lists")
      .select(
        `
        *,
        boards!inner (
          id,
          project_id,
          projects!inner (
            id,
            organization_id
          )
        )
      `
      )
      .eq("id", listId)
      .eq("boards.projects.organization_id", organizationId)
      .single();

    if (listError || !existingList) {
      console.error("List not found error:", listError);
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Update list
    const { data: list, error } = await supabase
      .from("lists")
      .update({
        name,
        position,
        is_archived,
      })
      .eq("id", listId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // *** CRITICAL: When archiving/unarchiving a list, also archive/unarchive all its cards ***
    if (
      typeof is_archived === "boolean" &&
      is_archived !== existingList.is_archived
    ) {
      try {
        // Update all cards in this list to match the list's archive status
        const { data: updatedCards, error: cardsError } = await supabase
          .from("cards")
          .update({ is_archived })
          .eq("list_id", listId)
          .select("id, title");

        if (cardsError) {
          console.error("Error updating cards archive status:", cardsError);
        } else {
          console.log(
            `🔄 ${is_archived ? "Archived" : "Unarchived"} ${updatedCards?.length || 0} cards in list: ${list.name}`
          );

          // Create activity logs for card updates
          if (updatedCards && updatedCards.length > 0) {
            const cardActivities = updatedCards.map((card) => ({
              user_id: userContext!.userId,
              board_id: existingList.board_id,
              action_type: is_archived ? "archive" : "unarchive",
              entity_type: "card",
              entity_id: card.id,
              details: {
                card_title: card.title,
                reason: `List ${is_archived ? "archived" : "unarchived"}`,
                list_name: list.name,
              },
            }));

            await supabase.from("activities").insert(cardActivities);
          }
        }
      } catch (cardsUpdateError) {
        console.error(
          "Error updating cards when archiving/unarchiving list:",
          cardsUpdateError
        );
      }
    }

    // Create activity log for list update
    await supabase.from("activities").insert([
      {
        user_id: userContext!.userId,
        board_id: existingList.board_id,
        action_type: is_archived
          ? "archive"
          : is_archived === false
            ? "unarchive"
            : "update",
        entity_type: "list",
        entity_id: listId,
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
    ]);

    return NextResponse.json({ list });
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
    const supabase = await createClient();

    // Get the existing list and verify it belongs to this organization
    const { data: existingList, error: listError } = await supabase
      .from("lists")
      .select(
        `
        *,
        boards!inner (
          id,
          project_id,
          projects!inner (
            id,
            organization_id
          )
        )
      `
      )
      .eq("id", listId)
      .eq("boards.projects.organization_id", organizationId)
      .single();

    if (listError || !existingList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Delete list (CASCADE will handle related cards)
    const { error } = await supabase.from("lists").delete().eq("id", listId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create activity log
    await supabase.from("activities").insert([
      {
        user_id: userContext!.userId,
        board_id: existingList.board_id,
        action_type: "delete",
        entity_type: "list",
        entity_id: listId,
        details: { list_name: existingList.name },
      },
    ]);

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
