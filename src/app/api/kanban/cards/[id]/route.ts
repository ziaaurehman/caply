import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const { searchParams } = new URL(req.url);
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

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

    // Check if user has access to the card
    const { data: card, error } = await supabase
      .from("cards")
      .select(
        `
        *,
        lists!inner (
          id,
          name,
          board_id,
          boards!inner (
            id,
            name,
            project_id,
            projects!inner (
              id,
              name,
              organization_id
            )
          )
        ),
              card_members (
        id,
        project_member_id,
        assigned_at,
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
          id,
          label_id,
          labels (
            id,
            name,
            color
          )
        ),
        checklists (
          id,
          name,
          position,
          checklist_items (
            id,
            content,
            is_completed,
            position,
            due_date,
            assigned_to_project_member_id,
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
          )
        ),
        comments (
          id,
          content,
          created_at,
          updated_at,
          user_id,
          users (
            id,
            full_name,
            email,
            avatar_url
          )
        ),
        attachments (
          id,
          filename,
          original_filename,
          file_path,
          file_size,
          mime_type,
          uploaded_by,
          uploaded_at,
          users (
            id,
            full_name,
            email,
            avatar_url
          )
        )
      `
      )
      .eq("id", cardId)
      .eq("lists.boards.projects.organization_id", organizationId)
      .single();

    if (error || !card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Transform card_labels to labels for frontend compatibility
    const transformedCard = {
      ...card,
      labels:
        card.card_labels?.map((cl: any) => cl.labels).filter(Boolean) || [],
      card_labels: undefined, // Remove the original card_labels to avoid confusion
    };

    const result = { card: transformedCard };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/kanban/cards/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const body = await req.json();
    const {
      title,
      description,
      list_id,
      position,
      due_date,
      is_completed,
      is_archived,
      cover_color,
      cover_image,
    } = body;
    const organizationId =
      body.organizationId ||
      body.organization_id ||
      req.headers.get("x-organization-id");

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

    // Verify card exists and user has access through project organization
    const { data: existingCard, error: cardError } = await supabase
      .from("cards")
      .select(
        `
        *,
        lists!inner (
          id,
          board_id,
          boards!inner (
            id,
            project_id,
            projects!inner (
              id,
              organization_id
            )
          )
        )
      `
      )
      .eq("id", cardId)
      .eq("lists.boards.projects.organization_id", organizationId)
      .single();

    if (cardError || !existingCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // If moving to a different list, verify access to target list
    if (list_id && list_id !== existingCard.list_id) {
      const { data: targetList, error: listError } = await supabase
        .from("lists")
        .select(
          `
          id,
          board_id,
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
        .eq("boards.projects.organization_id", organizationId)
        .single();

      if (listError || !targetList) {
        return NextResponse.json(
          { error: "Target list not found" },
          { status: 404 }
        );
      }
    }

    // Update card
    const { data: card, error } = await supabase
      .from("cards")
      .update({
        title,
        description,
        list_id,
        position,
        due_date,
        is_completed,
        is_archived,
        cover_color,
        cover_image,
      })
      .eq("id", cardId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create activity log
    let actionType = "update";
    let details: any = { changes: body };

    if (list_id && list_id !== existingCard.list_id) {
      actionType = "move";

      // Get list names for better activity description
      const { data: fromList } = await supabase
        .from("lists")
        .select("name")
        .eq("id", existingCard.list_id)
        .single();

      const { data: toList } = await supabase
        .from("lists")
        .select("name")
        .eq("id", list_id)
        .single();

      details = {
        from_list_id: existingCard.list_id,
        from_list_name: fromList?.name || "Unknown List",
        to_list_id: list_id,
        to_list_name: toList?.name || "Unknown List",
        card_title: title || existingCard.title,
      };
    }

    await supabase.from("activities").insert([
      {
        user_id: userContext!.userId,
        board_id: (existingCard.lists as any).board_id,
        card_id: cardId,
        action_type: actionType,
        entity_type: "card",
        entity_id: cardId,
        details,
      },
    ]);

    return NextResponse.json({ card });
  } catch (error) {
    console.error("Error in PATCH /api/kanban/cards/[id]:", error);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const { searchParams } = new URL(req.url);
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

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

    // Check if user has access to the card
    const { data: existingCard, error: cardError } = await supabase
      .from("cards")
      .select(
        `
        *,
        lists!inner (
          id,
          board_id,
          boards!inner (
            id,
            project_id,
            projects!inner (
              id,
              organization_id
            )
          )
        )
      `
      )
      .eq("id", cardId)
      .eq("lists.boards.projects.organization_id", organizationId)
      .single();

    if (cardError || !existingCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Delete card (CASCADE will handle related data)
    const { error } = await supabase.from("cards").delete().eq("id", cardId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create activity log
    await supabase.from("activities").insert([
      {
        user_id: userContext!.userId,
        board_id: (existingCard.lists as any).board_id,
        card_id: cardId,
        action_type: "delete",
        entity_type: "card",
        entity_id: cardId,
        details: { card_title: existingCard.title },
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/kanban/cards/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
