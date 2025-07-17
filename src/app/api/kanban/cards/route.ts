import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const listId = searchParams.get('list_id');
  const boardId = searchParams.get('board_id');

  if (!listId && !boardId) {
    return NextResponse.json({ error: 'List ID or Board ID is required' }, { status: 400 });
  }

  // Check user access to organization
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  let query = supabase
    .from('cards')
    .select(`
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
        user_id,
        users (
          id,
          full_name,
          email,
          avatar_url
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
          assigned_to,
          users (
            id,
            full_name,
            email,
            avatar_url
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
    `)
    .eq('lists.boards.projects.organization_id', userOrg.organization_id)
    .eq('is_archived', false);

  if (listId) {
    query = query.eq('list_id', listId);
  } else if (boardId) {
    query = query.eq('lists.board_id', boardId);
  }

  const { data: cards, error } = await query.order('position', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cards: cards || [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await req.json();
  const { list_id, title, description, due_date, cover_color, cover_image } = body;

  if (!list_id || !title) {
    return NextResponse.json({ error: 'List ID and title are required' }, { status: 400 });
  }

  // Check if user has access to the list
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Verify list exists and user has access through project organization
  const { data: list, error: listError } = await supabase
    .from('lists')
    .select(`
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
    `)
    .eq('id', list_id)
    .eq('boards.projects.organization_id', userOrg.organization_id)
    .single();

  if (listError || !list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  // Get next position
  const { data: lastCard } = await supabase
    .from('cards')
    .select('position')
    .eq('list_id', list_id)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = lastCard ? lastCard.position + 1 : 0;

  // Create card
  const { data: card, error } = await supabase
    .from('cards')
    .insert([{
      list_id,
      title,
      description,
      position,
      due_date,
      cover_color,
      cover_image,
      created_by: session.user.id
    }])
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
      board_id: list.board_id,
      card_id: card.id,
      action_type: 'create',
      entity_type: 'card',
      entity_id: card.id,
      details: { card_title: title, list_id }
    }]);

  return NextResponse.json({ card });
}
