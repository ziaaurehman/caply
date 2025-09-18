import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const organizationId = searchParams.get("organizationId");
    const boardId = searchParams.get("board_id");
    const includeArchived = searchParams.get("include_archived") === "true";
    const search = searchParams.get("search") || "";

    if (!projectId || !organizationId) {
      return NextResponse.json(
        { error: "Project ID and Organization ID are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Step 1: Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("organization_id", organizationId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Step 2: Get project members
    const { data: projectMembers } = await supabase
      .from("project_members")
      .select(
        `
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
      `
      )
      .eq("project_id", projectId);

    // Attach project members to project
    project.project_members = projectMembers || [];

    // Step 3: Get boards
    const { data: boards = [] } = await supabase
      .from("boards")
      .select("*")
      .eq("project_id", projectId)
      .order("position");

    // Create default board if none exists
    let currentBoard = boards[0];
    if (boards.length === 0) {
      const { data: newBoard } = await supabase
        .from("boards")
        .insert({
          project_id: projectId,
          name: `${project.name} Board`,
          description: `Kanban board for ${project.name}`,
          background_color: "#0079bf",
          visibility: "project",
          position: 0,
          created_by: project.created_by,
        })
        .select()
        .single();

      if (newBoard) {
        currentBoard = newBoard;
        boards.push(newBoard);
      }
    } else {
      // Use specified board or first board
      currentBoard = boardId
        ? boards.find((b) => b.id === boardId) || boards[0]
        : boards[0];
    }

    if (!currentBoard) {
      return NextResponse.json(
        { error: "No board available" },
        { status: 404 }
      );
    }

    // Step 4: Get lists
    let listsQuery = supabase
      .from("lists")
      .select("*")
      .eq("board_id", currentBoard.id)
      .order("position");

    if (!includeArchived) {
      listsQuery = listsQuery.eq("is_archived", false);
    }

    const { data: lists = [] } = await listsQuery;

    // Step 5: Get cards
    const listIds = lists.map((list) => list.id);
    let cards = [];

    if (listIds.length > 0) {
      let cardsQuery = supabase
        .from("cards")
        .select("*")
        .in("list_id", listIds)
        .order("position");

      if (!includeArchived) {
        cardsQuery = cardsQuery.eq("is_archived", false);
      }

      if (search.trim()) {
        cardsQuery = cardsQuery.or(
          `title.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      const { data: cardsData } = await cardsQuery;
      cards = cardsData || [];
    }

    // Step 6: Get all related data for cards
    const cardIds = cards.map((card) => card.id);
    let cardMembers = [];
    let cardLabels = [];
    let checklists = [];
    let checklistItems = [];
    let comments = [];
    let attachments = [];

    if (cardIds.length > 0) {
      // Get card members
      const { data: cardMembersData } = await supabase
        .from("card_members")
        .select(
          `
          id,
          card_id,
          project_member_id,
          assigned_at,
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
        `
        )
        .in("card_id", cardIds);

      cardMembers = cardMembersData || [];

      // Get card labels
      const { data: cardLabelsData } = await supabase
        .from("card_labels")
        .select(
          `
          id,
          card_id,
          label_id,
          labels (
            id,
            name,
            color,
            board_id
          )
        `
        )
        .in("card_id", cardIds);

      cardLabels = cardLabelsData || [];

      // Get checklists
      const { data: checklistsData } = await supabase
        .from("checklists")
        .select("*")
        .in("card_id", cardIds)
        .order("position");

      checklists = checklistsData || [];

      // Get checklist items
      if (checklists.length > 0) {
        const checklistIds = checklists.map((cl) => cl.id);
        const { data: checklistItemsData } = await supabase
          .from("checklist_items")
          .select("*")
          .in("checklist_id", checklistIds)
          .order("position");

        checklistItems = checklistItemsData || [];
      }

      // Get comments
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*")
        .in("card_id", cardIds)
        .order("created_at");

      comments = commentsData || [];

      // Get attachments
      const { data: attachmentsData } = await supabase
        .from("attachments")
        .select("*")
        .in("card_id", cardIds)
        .order("uploaded_at");

      attachments = attachmentsData || [];
    }

    // Step 7: Get board labels
    const { data: boardLabels = [] } = await supabase
      .from("labels")
      .select("*")
      .eq("board_id", currentBoard.id)
      .order("name");

    // Step 8: Get user information for comments and attachments
    const userIds = new Set();
    comments.forEach((comment) => {
      if (comment.user_id) userIds.add(comment.user_id);
    });
    attachments.forEach((attachment) => {
      if (attachment.uploaded_by) userIds.add(attachment.uploaded_by);
    });

    let userLookup = {};
    if (userIds.size > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .in("id", Array.from(userIds));

      if (users) {
        userLookup = users.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }
    }

    // Step 9: Organize and enrich the data
    const enrichedCards = cards.map((card) => {
      // Attach card members
      const cardMembersList = cardMembers.filter(
        (cm) => cm.card_id === card.id
      );

      // Attach card labels
      const cardLabelsList = cardLabels.filter((cl) => cl.card_id === card.id);

      // Attach checklists with items
      const cardChecklists = checklists
        .filter((cl) => cl.card_id === card.id)
        .map((checklist) => ({
          ...checklist,
          checklist_items: checklistItems.filter(
            (ci) => ci.checklist_id === checklist.id
          ),
        }));

      // Attach comments with user info
      const cardComments = comments
        .filter((c) => c.card_id === card.id)
        .map((comment) => ({
          ...comment,
          users: userLookup[comment.user_id] || null,
        }));

      // Attach attachments with user info
      const cardAttachments = attachments
        .filter((a) => a.card_id === card.id)
        .map((attachment) => ({
          ...attachment,
          users: userLookup[attachment.uploaded_by] || null,
        }));

      return {
        ...card,
        card_members: cardMembersList,
        card_labels: cardLabelsList,
        checklists: cardChecklists,
        comments: cardComments,
        attachments: cardAttachments,
      };
    });

    // Step 10: Organize cards by list
    const listsWithCards = lists.map((list) => ({
      ...list,
      cards: enrichedCards.filter((card) => card.list_id === list.id),
    }));

    return NextResponse.json({
      success: true,
      data: {
        project,
        boards,
        currentBoard,
        lists: listsWithCards,
        cards: enrichedCards,
        labels: boardLabels,
      },
    });
  } catch (error) {
    console.error("Error fetching board data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
