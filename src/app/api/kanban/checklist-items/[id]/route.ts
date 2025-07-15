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
  const itemId = params.id;
  const body = await req.json();
  const { content, is_completed, position, due_date, assigned_to } = body;

  // Check if user has access to the checklist item
  const { data: existingItem, error: itemError } = await supabase
    .from('checklist_items')
    .select(`
      *,
      checklists!inner (
        id,
        name,
        card_id,
        cards!inner (
          id,
          title,
          lists!inner (
            id,
            boards!inner (
              id,
              projects!inner (
                organization_id,
                organization_members!inner (
                  user_id
                )
              )
            )
          )
        )
      )
    `)
    .eq('id', itemId)
    .eq('checklists.cards.lists.boards.projects.organization_members.user_id', session.user.id)
    .eq('checklists.cards.lists.boards.projects.organization_members.status', 'active')
    .single();

  if (itemError || !existingItem) {
    return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
  }

  // If assigned_to is provided, verify the user is a member of the organization
  if (assigned_to) {
    const organizationId = (existingItem.checklists as any).cards.lists.boards.projects.organization_id;
    const { data: assignedUser, error: userError } = await supabase
      .from('organization_members')
      .select('id, user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', assigned_to)
      .eq('status', 'active')
      .single();

    if (userError || !assignedUser) {
      return NextResponse.json({ error: 'Assigned user not found in organization' }, { status: 404 });
    }
  }

  // Update checklist item
  const { data: checklistItem, error } = await supabase
    .from('checklist_items')
    .update({
      content,
      is_completed,
      position,
      due_date,
      assigned_to
    })
    .eq('id', itemId)
    .select(`
      *,
      users (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  let actionType = 'update';
  let details: any = { changes: body };

  if (body.hasOwnProperty('is_completed')) {
    actionType = is_completed ? 'complete' : 'incomplete';
    details = {
      item_content: existingItem.content,
      completed: is_completed,
      checklist_name: (existingItem.checklists as any).name,
      card_title: (existingItem.checklists as any).cards.title
    };
  }

  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: (existingItem.checklists as any).cards.lists.boards.id,
      card_id: (existingItem.checklists as any).card_id,
      action_type: actionType,
      entity_type: 'checklist_item',
      entity_id: itemId,
      details
    }]);

  return NextResponse.json({ checklist_item: checklistItem });
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
  const itemId = params.id;

  // Check if user has access to the checklist item
  const { data: existingItem, error: itemError } = await supabase
    .from('checklist_items')
    .select(`
      *,
      checklists!inner (
        id,
        name,
        card_id,
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
      )
    `)
    .eq('id', itemId)
    .eq('checklists.cards.lists.boards.projects.organization_members.user_id', session.user.id)
    .eq('checklists.cards.lists.boards.projects.organization_members.status', 'active')
    .single();

  if (itemError || !existingItem) {
    return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
  }

  // Delete checklist item
  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: (existingItem.checklists as any).cards.lists.boards.id,
      card_id: (existingItem.checklists as any).card_id,
      action_type: 'delete',
      entity_type: 'checklist_item',
      entity_id: itemId,
      details: { 
        item_content: existingItem.content,
        checklist_name: (existingItem.checklists as any).name,
        card_title: (existingItem.checklists as any).cards.title
      }
    }]);

  return NextResponse.json({ success: true });
}
