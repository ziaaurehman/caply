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
  const cardId = searchParams.get('card_id');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!boardId && !cardId) {
    return NextResponse.json({ error: 'Board ID or Card ID is required' }, { status: 400 });
  }

  // Verify user has access to organization
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Build query based on parameters
  let query = supabase
    .from('activities')
    .select(`
      *,
      users (
        id,
        full_name,
        email,
        avatar_url
      )
    `);

  if (boardId) {
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

    query = query.eq('board_id', boardId);
  }

  if (cardId) {
    // Verify card exists and user has access through project organization
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        id,
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
      `)
      .eq('id', cardId)
      .eq('lists.boards.projects.organization_id', userOrg.organization_id)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    query = query.eq('card_id', cardId);
  }

  // Execute query with pagination
  const { data: activities, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get total count for pagination
  let countQuery = supabase
    .from('activities')
    .select('*', { count: 'exact', head: true });

  if (boardId) {
    countQuery = countQuery.eq('board_id', boardId);
  }

  if (cardId) {
    countQuery = countQuery.eq('card_id', cardId);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  return NextResponse.json({ 
    activities: activities || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit
    }
  });
}
