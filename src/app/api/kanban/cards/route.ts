import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listId = searchParams.get('list_id');
    const boardId = searchParams.get('board_id');
    const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

    if (!listId && !boardId) {
      return NextResponse.json({ error: 'List ID or Board ID is required' }, { status: 400 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      organizationId,
      { resource: 'projects', action: 'read' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

    const { context: userContext } = validation;
    const supabase = await createClient();

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
    .eq('lists.boards.projects.organization_id', organizationId)
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
  } catch (error: any) {
    console.error('Error in GET /api/kanban/cards:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { list_id, title, description, due_date, cover_color, cover_image } = body;
    const organizationId = body.organizationId || body.organization_id || req.headers.get('x-organization-id');

    if (!list_id || !title) {
      return NextResponse.json({ error: 'List ID and title are required' }, { status: 400 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      organizationId,
      { resource: 'projects', action: 'update' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

    const { context: userContext } = validation;
    const supabase = await createClient();

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
    .eq('boards.projects.organization_id', organizationId)
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
      created_by: userContext!.userId
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
      user_id: userContext!.userId,
      board_id: list.board_id,
      card_id: card.id,
      action_type: 'create',
      entity_type: 'card',
      entity_id: card.id,
      details: { card_title: title, list_id }
    }]);

    return NextResponse.json({ card });
  } catch (error: any) {
    console.error('Error in POST /api/kanban/cards:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
