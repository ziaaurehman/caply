import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { redisGetJSON, redisSetJSON, redisDel } from "@/utils/redis";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("list_id");
    const boardId = searchParams.get("board_id");
    const search = searchParams.get("search");
    const includeArchived = searchParams.get("include_archived") === "true";
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    if (!listId && !boardId) {
      return NextResponse.json(
        { error: "List ID or Board ID is required" },
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

    const { context: userContext } = validation;
    const supabase = await createClient();

    // Try cache first for list or board aggregation (include search and archive status in cache key)
    const scope = listId ? `list:${listId}` : `board:${boardId}`;
    const searchKey = search ? `:search:${search}` : "";
    const archiveKey = includeArchived ? ":archived" : "";
    const cacheKey = `kanban:cards:${scope}:${organizationId}${searchKey}${archiveKey}`;
    const cached = await redisGetJSON<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let query = supabase
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
            project_members (
              id,
              organization_member_id,
              role,
              joined_at,
              organization_members (
                id,
                user_id,
                users!organization_members_user_id_fkey (
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
      .eq("lists.boards.projects.organization_id", organizationId);

    // Only filter out archived items if includeArchived is false
    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }

    if (listId) {
      query = query.eq("list_id", listId);
    } else if (boardId) {
      query = query.eq("lists.board_id", boardId);
    }

    // Add search functionality if search term is provided
    if (search && search.trim()) {
      query = query.or(
        `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`
      );
    }

    const { data: cards, error } = await query.order("position", {
      ascending: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform card_labels to labels and cover data for frontend compatibility
    const transformedCards = (cards || []).map((card) => ({
      ...card,
      labels:
        card.card_labels?.map((cl: any) => cl.labels).filter(Boolean) || [],
      cover: {
        color: card.cover_color,
        image: card.cover_image,
        size: card.cover_color || card.cover_image ? "small" : undefined,
      },
      card_labels: undefined, // Remove the original card_labels to avoid confusion
    }));

    const result = { cards: transformedCards };
    try {
      // Cache for 5 minutes (300 seconds) since cards change frequently
      const cacheTime = search ? 60 : 300; // Shorter cache for search results
      await redisSetJSON(cacheKey, result, cacheTime);
    } catch (e) {
      console.warn("Failed to cache kanban cards:", e);
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /api/kanban/cards:", error);
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
    const { list_id, title, description, due_date, cover_color, cover_image } =
      body;
    const organizationId =
      body.organizationId ||
      body.organization_id ||
      req.headers.get("x-organization-id");

    if (!list_id || !title) {
      return NextResponse.json(
        { error: "List ID and title are required" },
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

    // Verify list exists and user has access through project organization
    const { data: list, error: listError } = await supabase
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

    if (listError || !list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Get next position
    const { data: lastCard } = await supabase
      .from("cards")
      .select("position")
      .eq("list_id", list_id)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const position = lastCard ? lastCard.position + 1 : 0;

    // Create card
    const { data: card, error } = await supabase
      .from("cards")
      .insert([
        {
          list_id,
          title,
          description,
          position,
          due_date,
          cover_color,
          cover_image,
          created_by: userContext!.userId,
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
        board_id: list.board_id,
        card_id: card.id,
        action_type: "create",
        entity_type: "card",
        entity_id: card.id,
        details: { card_title: title, list_id },
      },
    ]);

    // Refresh caches impacted by new card
    try {
      // Refresh list-level cache
      const listCacheKey = `kanban:cards:list:${list_id}:${organizationId}`;
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
              project_members (
                id,
                organization_member_id,
                role,
                joined_at,
                organization_members (
                  id,
                  user_id,
                  users!organization_members_user_id_fkey (
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
        .eq("lists.boards.projects.organization_id", organizationId)
        .eq("is_archived", false)
        .eq("list_id", list_id)
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
      await redisSetJSON(listCacheKey, { cards: transformed }, 1296000);

      // Also refresh board-level cache
      const boardCacheKey = `kanban:cards:board:${list.board_id}:${organizationId}`;
      const { data: boardCards } = await supabase
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
              project_members (
                id,
                organization_member_id,
                role,
                joined_at,
                organization_members (
                  id,
                  user_id,
                  users!organization_members_user_id_fkey (
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
        .eq("lists.boards.projects.organization_id", organizationId)
        .eq("is_archived", false)
        .eq("lists.board_id", list.board_id)
        .order("position", { ascending: true });

      const transformedBoard = (boardCards || []).map((c) => ({
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
      await redisSetJSON(boardCacheKey, { cards: transformedBoard }, 1296000);

      // CRITICAL: Also refresh the lists cache that includes cards (this is what the frontend uses)
      const listsCacheKey = `kanban:lists:${list.board_id}:${organizationId}`;
      const { data: freshLists } = await supabase
        .from("lists")
        .select(
          `
          *,
          cards (
            id,
            title,
            description,
            position,
            due_date,
            is_completed,
            is_archived,
            cover_color,
            cover_image,
            created_by,
            created_at,
            updated_at,
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
                project_members (
                  id,
                  organization_member_id,
                  role,
                  joined_at,
                  organization_members (
                    id,
                    user_id,
                    users!organization_members_user_id_fkey (
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
          )
        `
        )
        .eq("board_id", list.board_id)
        .eq("is_archived", false)
        .order("position", { ascending: true });

      // Transform card_labels to labels and cover data for frontend compatibility
      const transformedLists =
        freshLists?.map((list) => ({
          ...list,
          cards:
            list.cards
              ?.map((card: any) => ({
                ...card,
                labels:
                  card.card_labels
                    ?.map((cl: any) => cl.labels)
                    .filter(Boolean) || [],
                cover: {
                  color: card.cover_color,
                  image: card.cover_image,
                  size:
                    card.cover_color || card.cover_image ? "small" : undefined,
                },
                card_labels: undefined, // Remove the original card_labels to avoid confusion
              }))
              .filter((card: any) => !card.is_archived) || [],
        })) || [];

      await redisSetJSON(listsCacheKey, { lists: transformedLists }, 1296000);
    } catch (e) {
      console.warn("Failed to refresh kanban cards cache after create:", e);
    }

    // Invalidate project progress cache since a new card was created
    try {
      const projectId = list.boards[0].project_id;
      const progressCacheKey = `project_progress:${projectId}:${organizationId}`;
      await redisDel(progressCacheKey);
      console.log("🔄 Invalidated project progress cache after card creation");
    } catch (e) {
      console.warn("Failed to invalidate project progress cache:", e);
    }

    return NextResponse.json({ card });
  } catch (error: any) {
    console.error("Error in POST /api/kanban/cards:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
