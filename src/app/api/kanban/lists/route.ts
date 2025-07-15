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
  const boardId = searchParams.get('board_id');

  if (!boardId) {
    return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
  }

  // Check if user has access to the board
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Verify board exists and user has access through project organization
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select(`
      id,
      project_id,
      projects!inner (
        id,
        organization_id
      )
    `)
    .eq('id', boardId)
    .eq('projects.organization_id', userOrg.organization_id)
    .single();

  if (boardError || !board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Get lists for the board
  const { data: lists, error } = await supabase
    .from('lists')
    .select(`
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
            position
          )
        )
      )
    `)
    .eq('board_id', boardId)
    .eq('is_archived', false)
    .order('position', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lists: lists || [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await req.json();
  const { board_id, name } = body;

  if (!board_id || !name) {
    return NextResponse.json({ error: 'Board ID and name are required' }, { status: 400 });
  }

  // Check if user has access to the board
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Verify board exists and user has access through project organization
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select(`
      id,
      project_id,
      projects!inner (
        id,
        organization_id
      )
    `)
    .eq('id', board_id)
    .eq('projects.organization_id', userOrg.organization_id)
    .single();

  if (boardError || !board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Get next position
  const { data: lastList } = await supabase
    .from('lists')
    .select('position')
    .eq('board_id', board_id)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = lastList ? lastList.position + 1 : 0;

  // Create list
  const { data: list, error } = await supabase
    .from('lists')
    .insert([{
      board_id,
      name,
      position
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
      board_id: board_id,
      action_type: 'create',
      entity_type: 'list',
      entity_id: list.id,
      details: { list_name: name }
    }]);

  return NextResponse.json({ list });
}
