import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { id: checklistId } = await params;
  const body = await req.json();
  const { name, position } = body;

  // Check if user has access to the checklist
  const { data: existingChecklist, error: checklistError } = await supabase
    .from("checklists")
    .select(
      `
      *,
      cards!inner (
        id,
        title,
        lists!inner (
          id,
          boards!inner (
            id,
            projects!inner (
              organization_members!inner (
                user_id
              )
            )
          )
        )
      )
    `
    )
    .eq("id", checklistId)
    .eq(
      "cards.lists.boards.projects.organization_members.user_id",
      session.user.id
    )
    .eq("cards.lists.boards.projects.organization_members.status", "active")
    .single();

  if (checklistError || !existingChecklist) {
    return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
  }

  // Update checklist
  const { data: checklist, error } = await supabase
    .from("checklists")
    .update({
      name,
      position,
    })
    .eq("id", checklistId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase.from("activities").insert([
    {
      user_id: session.user.id,
      board_id: (existingChecklist.cards as any).lists.boards.id,
      card_id: existingChecklist.card_id,
      action_type: "update",
      entity_type: "checklist",
      entity_id: checklistId,
      details: { changes: body },
    },
  ]);

  return NextResponse.json({ checklist });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { id: checklistId } = await params;

  // First, get the checklist with basic card info
  const { data: checklist, error: checklistError } = await supabase
    .from("checklists")
    .select(
      `
      *,
      cards (
        id,
        title,
        list_id,
        lists (
          id,
          board_id,
          boards (
            id,
            project_id,
            projects (
              id,
              organization_id
            )
          )
        )
      )
    `
    )
    .eq("id", checklistId)
    .single();

  if (checklistError || !checklist) {
    console.error("Checklist not found:", checklistError);
    return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
  }

  // Check if user has access to the project
  const projectId = checklist.cards?.lists?.boards?.projects?.id;
  if (!projectId) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: organizationMember, error: memberError } = await supabase
    .from("organization_members")
    .select("id, status")
    .eq("user_id", session.user.id)
    .eq(
      "organization_id",
      checklist.cards?.lists?.boards?.projects?.organization_id
    )
    .eq("status", "active")
    .single();

  if (memberError || !organizationMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Delete checklist (CASCADE will handle checklist_items)
  const { error: deleteError } = await supabase
    .from("checklists")
    .delete()
    .eq("id", checklistId);

  if (deleteError) {
    console.error("Error deleting checklist:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Create activity log
  try {
    await supabase.from("activities").insert([
      {
        user_id: session.user.id,
        board_id: checklist.cards?.lists?.boards?.id,
        card_id: checklist.card_id,
        action_type: "delete",
        entity_type: "checklist",
        entity_id: checklistId,
        details: {
          checklist_name: checklist.name || checklist.title,
          card_title: checklist.cards?.title,
        },
      },
    ]);
  } catch (activityError) {
    console.error("Error creating activity log:", activityError);
    // Don't fail the request if activity log fails
  }

  return NextResponse.json({ success: true });
}
