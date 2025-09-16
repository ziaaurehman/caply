import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get("card_id");
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    if (!cardId) {
      return NextResponse.json(
        { error: "Card ID is required" },
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

    // Verify card exists and user has access through project organization
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select(
        `
        id,
        title,
        list_id,
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

    if (cardError || !card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Get comments for the card
    const { data: comments, error } = await supabase
      .from("comments")
      .select(
        `
        *,
        users (
          id,
          full_name,
          email,
          avatar_url
        )
      `
      )
      .eq("card_id", cardId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = { comments: comments || [] };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get session first (like other APIs)
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const body = await req.json();
    const { card_id, content, organizationId } = body;
    const orgId = organizationId || req.headers.get("x-organization-id");

    if (!card_id || !content) {
      return NextResponse.json(
        { error: "Card ID and content are required" },
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
    console.log("Validating organization access for:", orgId);
    const validation = await validateOrganizationAccessWithId(orgId, {
      resource: "projects",
      action: "update",
    });

    console.log("Validation result:", validation);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    // Verify card exists and user has access through project organization
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select(
        `
        id,
        title,
        list_id,
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
      .eq("id", card_id)
      .eq("lists.boards.projects.organization_id", orgId)
      .single();

    if (cardError || !card) {
      console.log("Card error:", cardError);
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const { data: comment, error } = await supabase
      .from("comments")
      .insert([
        {
          card_id,
          user_id: session.user.id,
          content,
        },
      ])
      .select(
        `
        *,
        users (
          id,
          full_name,
          email,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.log("Comment creation error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create activity log
    await supabase.from("activities").insert([
      {
        user_id: session.user.id,
        board_id: (card.lists as any).board_id,
        card_id: card_id,
        action_type: "create",
        entity_type: "comment",
        entity_id: comment.id,
        details: {
          comment_content: content,
          card_title: card.title,
        },
      },
    ]);

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
