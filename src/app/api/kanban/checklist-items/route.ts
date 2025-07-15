import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await req.json();
  const { checklist_id, content, due_date, assigned_to } = body;

  if (!checklist_id || !content) {
    return NextResponse.json({ error: 'Checklist ID and content are required' }, { status: 400 });
  }

  // Check if user has access to the checklist
  const { data: checklist, error: checklistError } = await supabase
    .from('checklists')
    .select(`
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
    `)
    .eq('id', checklist_id)
    .eq('cards.lists.boards.projects.organization_members.user_id', session.user.id)
    .eq('cards.lists.boards.projects.organization_members.status', 'active')
    .single();

  if (checklistError || !checklist) {
    return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
  }

  // If assigned_to is provided, verify the user is a member of the organization
  if (assigned_to) {
    const organizationId = (checklist.cards as any).lists.boards.projects.organization_id;
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

  // Get next position
  const { data: lastItem } = await supabase
    .from('checklist_items')
    .select('position')
    .eq('checklist_id', checklist_id)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = lastItem ? lastItem.position + 1 : 0;

  // Create checklist item
  const { data: checklistItem, error } = await supabase
    .from('checklist_items')
    .insert([{
      checklist_id,
      content,
      position,
      due_date,
      assigned_to
    }])
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
  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: (checklist.cards as any).lists.boards.id,
      card_id: checklist.card_id,
      action_type: 'create',
      entity_type: 'checklist_item',
      entity_id: checklistItem.id,
      details: { 
        item_content: content,
        checklist_name: checklist.name,
        card_title: (checklist.cards as any).title
      }
    }]);

  return NextResponse.json({ checklist_item: checklistItem });
}
