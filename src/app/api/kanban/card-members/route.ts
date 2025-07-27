import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { card_id, user_id } = body;
    const organizationId = body.organizationId || body.organization_id || req.headers.get('x-organization-id');

    if (!card_id || !user_id) {
      return NextResponse.json({ error: 'Card ID and User ID are required' }, { status: 400 });
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

    // Verify card exists and user has access through project organization
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        id,
        title,
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
      .eq('id', card_id)
      .eq('lists.boards.projects.organization_id', organizationId)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Verify the user to be assigned is a member of the organization
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
        user_id: userContext!.userId,
        board_id: (card.lists as any).board_id,
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
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get('card_id');
    const userId = searchParams.get('user_id');
    const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

    if (!cardId || !userId) {
      return NextResponse.json({ error: 'Card ID and User ID are required' }, { status: 400 });
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

    // Verify card exists and user has access through project organization
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        id,
        title,
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
      .eq('lists.boards.projects.organization_id', organizationId)
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
        user_id: userContext!.userId,
        board_id: (card.lists as any).board_id,
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
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
