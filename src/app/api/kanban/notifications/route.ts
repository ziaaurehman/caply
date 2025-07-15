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
  const isRead = searchParams.get('is_read');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('board_notifications')
    .select(`
      *,
      cards (
        id,
        title,
        lists (
          id,
          name,
          boards (
            id,
            name
          )
        )
      ),
      boards (
        id,
        name
      )
    `)
    .eq('user_id', session.user.id);

  // Filter by read status if provided
  if (isRead !== null) {
    query = query.eq('is_read', isRead === 'true');
  }

  const { data: notifications, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get total count for pagination
  let countQuery = supabase
    .from('board_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id);

  if (isRead !== null) {
    countQuery = countQuery.eq('is_read', isRead === 'true');
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  return NextResponse.json({ 
    notifications: notifications || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit
    }
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await req.json();
  const { user_id, type, title, message, related_card_id, related_board_id } = body;

  if (!user_id || !type || !title || !message) {
    return NextResponse.json({ error: 'User ID, type, title, and message are required' }, { status: 400 });
  }

  // Verify the target user exists and has access to the related resources
  const { data: targetUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user_id)
    .single();

  if (userError || !targetUser) {
    return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
  }

  // If related to a card, verify access
  if (related_card_id) {
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        id,
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
      `)
      .eq('id', related_card_id)
      .eq('lists.boards.projects.organization_members.user_id', user_id)
      .eq('lists.boards.projects.organization_members.status', 'active')
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card not found or user does not have access' }, { status: 404 });
    }
  }

  // If related to a board, verify access
  if (related_board_id) {
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select(`
        id,
        projects!inner (
          organization_members!inner (
            user_id
          )
        )
      `)
      .eq('id', related_board_id)
      .eq('projects.organization_members.user_id', user_id)
      .eq('projects.organization_members.status', 'active')
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found or user does not have access' }, { status: 404 });
    }
  }

  // Create notification
  const { data: notification, error } = await supabase
    .from('board_notifications')
    .insert([{
      user_id,
      type,
      title,
      message,
      related_card_id,
      related_board_id
    }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notification });
}
