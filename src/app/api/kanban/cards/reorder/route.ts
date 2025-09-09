import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { redisSetJSON } from "@/utils/redis";

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
    const supabase = await createClient();

    // Verify user has access to the list through organization
    const { data: list, error: listError } = await supabase
      .from("lists")
      .select(
        `
        id,
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
      .eq("id", list_id)
      .eq("boards.projects.organization_id", orgId)
      .single();

    if (listError || !list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Verify all cards belong to the list and user has access
    const cardIds = card_positions.map((cp) => cp.card_id);
    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("id, title")
      .eq("list_id", list_id)
      .in("id", cardIds);

    if (cardsError || !cards || cards.length !== cardIds.length) {
      return NextResponse.json(
        { error: "Some cards not found in the specified list" },
        { status: 404 }
      );
    }

    const results: any[] = [];

    // Update position for each card
    for (const { card_id, position } of card_positions) {
      const { data: updatedCard, error: updateError } = await supabase
        .from("cards")
        .update({ position })
        .eq("id", card_id)
        .eq("list_id", list_id)
        .select()
        .single();

      if (updateError) {
        results.push({ card_id, success: false, error: updateError.message });
      } else {
        results.push({ card_id, success: true, card: updatedCard });
      }
    }

    // Create activity log for reordering
    await supabase.from("activities").insert([
      {
        user_id: userContext!.userId,
        board_id: (list.boards as any).id,
        action_type: "update",
        entity_type: "list",
        entity_id: list_id,
        details: {
          action: "reorder_cards",
          card_count: card_positions.length,
          new_positions: card_positions,
        },
      },
    ]);

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    // Refresh cache for the affected list
    try {
      const { data: freshCards } = await supabase
        .from("cards")
        .select(
          `
          *,
          lists!inner (
            id,
            name,
            boards!inner (
              id,
              project_id,
              projects!inner (
                id,
                organization_id
              )
            )
          ),
          card_members (
            project_member_id,
            project_members!inner (
              id,
              organization_member_id,
              role,
              joined_at,
              organization_members!inner (
                id,
                user_id,
                users!organization_members_user_id_fkey!inner (
                  id,
                  full_name,
                  email,
                  avatar_url
                )
              )
            )
          ),
          card_labels (
            label_id,
            labels (
              id,
              name,
              color
            )
          )
        `
        )
        .eq("list_id", list_id)
        .eq("is_archived", false)
        .order("position", { ascending: true });

      const transformed = (freshCards || []).map((c) => ({
        ...c,
        labels:
          (c as any).card_labels?.map((cl: any) => cl.labels).filter(Boolean) ||
          [],
        cover: {
          color: (c as any).cover_color,
          image: (c as any).cover_image,
          size:
            (c as any).cover_color || (c as any).cover_image
              ? "small"
              : undefined,
        },
        card_labels: undefined,
      }));

      const listCacheKey = `kanban:cards:list:${list_id}:${orgId}`;
      await redisSetJSON(listCacheKey, { cards: transformed }, 300); // 5 minutes cache
    } catch (e) {
      console.warn("Failed to refresh kanban cards cache after reorder:", e);
    }

    return NextResponse.json({
      results,
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
