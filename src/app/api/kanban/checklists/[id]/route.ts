import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const checklistId = params.id;
  const body = await req.json();
  const { name, position } = body;

  // Check if user has access to the checklist
  const { data: existingChecklist, error: checklistError } = await supabase
    .from('checklists')
    .select(`
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
    `)
    .eq('id', checklistId)
    .eq('cards.lists.boards.projects.organization_members.user_id', session.user.id)
    .eq('cards.lists.boards.projects.organization_members.status', 'active')
    .single();

  if (checklistError || !existingChecklist) {
    return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
  }

  // Update checklist
  const { data: checklist, error } = await supabase
    .from('checklists')
    .update({
      name,
      position
    })
    .eq('id', checklistId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: (existingChecklist.cards as any).lists.boards.id,
      card_id: existingChecklist.card_id,
      action_type: 'update',
      entity_type: 'checklist',
      entity_id: checklistId,
      details: { changes: body }
    }]);

  return NextResponse.json({ checklist });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const checklistId = params.id;

  // Check if user has access to the checklist
  const { data: existingChecklist, error: checklistError } = await supabase
    .from('checklists')
    .select(`
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
    `)
    .eq('id', checklistId)
    .eq('cards.lists.boards.projects.organization_members.user_id', session.user.id)
    .eq('cards.lists.boards.projects.organization_members.status', 'active')
    .single();

  if (checklistError || !existingChecklist) {
    return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
  }

  // Delete checklist (CASCADE will handle checklist_items)
  const { error } = await supabase
    .from('checklists')
    .delete()
    .eq('id', checklistId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: (existingChecklist.cards as any).lists.boards.id,
      card_id: existingChecklist.card_id,
      action_type: 'delete',
      entity_type: 'checklist',
      entity_id: checklistId,
      details: { 
        checklist_name: existingChecklist.name,
        card_title: (existingChecklist.cards as any).title
      }
    }]);

  return NextResponse.json({ success: true });
}
