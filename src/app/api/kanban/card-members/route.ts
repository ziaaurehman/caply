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
  const { card_id, user_id } = body;

  if (!card_id || !user_id) {
    return NextResponse.json({ error: 'Card ID and User ID are required' }, { status: 400 });
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
            organization_id,
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

  // Verify the user to be assigned is a member of the organization
  const organizationId = (card.lists as any).boards.projects.organization_id;
  const { data: targetUser, error: userError } = await supabase
    .from('organization_members')
    .select('id, user_id, users!inner(id, full_name, email, avatar_url)')
    .eq('organization_id', organizationId)
    .eq('user_id', user_id)
    .eq('status', 'active')
    .single();

  if (userError || !targetUser) {
    return NextResponse.json({ error: 'User not found in organization' }, { status: 404 });
  }

  // Check if user is already assigned to the card
  const { data: existingMember } = await supabase
    .from('card_members')
    .select('id')
    .eq('card_id', card_id)
    .eq('user_id', user_id)
    .single();

  if (existingMember) {
    return NextResponse.json({ error: 'User is already assigned to this card' }, { status: 400 });
  }

  // Assign user to card
  const { data: cardMember, error } = await supabase
    .from('card_members')
    .insert([{
      card_id,
      user_id
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
      entity_type: 'member',
      entity_id: cardMember.id,
      details: { 
        assigned_user_id: user_id,
        assigned_user_name: (targetUser.users as any).full_name,
        card_title: card.title 
      }
    }]);

  return NextResponse.json({ card_member: cardMember });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get('card_id');
  const userId = searchParams.get('user_id');

  if (!cardId || !userId) {
    return NextResponse.json({ error: 'Card ID and User ID are required' }, { status: 400 });
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
    .eq('id', cardId)
    .eq('lists.boards.projects.organization_members.user_id', session.user.id)
    .eq('lists.boards.projects.organization_members.status', 'active')
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  // Get the card member to delete
  const { data: cardMember, error: memberError } = await supabase
    .from('card_members')
    .select(`
      id,
      users (
        id,
        full_name,
        email
      )
    `)
    .eq('card_id', cardId)
    .eq('user_id', userId)
    .single();

  if (memberError || !cardMember) {
    return NextResponse.json({ error: 'Card member not found' }, { status: 404 });
  }

  // Remove user from card
  const { error } = await supabase
    .from('card_members')
    .delete()
    .eq('card_id', cardId)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: (card.lists as any).boards.id,
      card_id: cardId,
      action_type: 'delete',
      entity_type: 'member',
      entity_id: cardMember.id,
      details: { 
        removed_user_id: userId,
        removed_user_name: (cardMember.users as any).full_name,
        card_title: card.title 
      }
    }]);

  return NextResponse.json({ success: true });
}
