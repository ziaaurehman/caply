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
  const cardId = searchParams.get('card_id');

  if (!cardId) {
    return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
  }

  // Check if user has access to the card
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
    .eq('id', cardId)
    .eq('lists.boards.projects.organization_members.user_id', session.user.id)
    .eq('lists.boards.projects.organization_members.status', 'active')
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  // Get comments for the card
  const { data: comments, error } = await supabase
    .from('comments')
    .select(`
      *,
      users (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('card_id', cardId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comments: comments || [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await req.json();
  const { card_id, content } = body;

  if (!card_id || !content) {
    return NextResponse.json({ error: 'Card ID and content are required' }, { status: 400 });
  }

  // Check if user has access to the card
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select(`
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
    `)
    .eq('id', card_id)
    .eq('lists.boards.projects.organization_members.user_id', session.user.id)
    .eq('lists.boards.projects.organization_members.status', 'active')
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  // Create comment
  const { data: comment, error } = await supabase
    .from('comments')
    .insert([{
      card_id,
      user_id: session.user.id,
      content
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
      board_id: (card.lists as any).boards.id,
      card_id: card_id,
      action_type: 'create',
      entity_type: 'comment',
      entity_id: comment.id,
      details: { 
        comment_content: content,
        card_title: card.title
      }
    }]);

  return NextResponse.json({ comment });
}
