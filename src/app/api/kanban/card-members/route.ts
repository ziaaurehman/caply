import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { card_id, project_member_id } = body;
    const organizationId = body.organizationId || body.organization_id || req.headers.get('x-organization-id');

    if (!card_id || !project_member_id) {
      return NextResponse.json({ error: 'Card ID and Project Member ID are required' }, { status: 400 });
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

    // Verify the project member exists and belongs to the same project
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select(`
        id,
        role,
        organization_member_id,
        organization_members!inner (
          id,
          user_id,
          users!organization_members_user_id_fkey!inner (
            id,
            full_name,
            email,
            avatar_url
          )
        )
      `)
      .eq('id', project_member_id)
      .eq('organization_members.organization_id', organizationId)
      .eq('organization_members.status', 'active')
      .single();

    if (memberError || !projectMember) {
      return NextResponse.json({ error: 'Project member not found' }, { status: 404 });
    }

    // Check if project member is already assigned to the card
    const { data: existingMember } = await supabase
      .from('card_members')
      .select('id')
      .eq('card_id', card_id)
      .eq('project_member_id', project_member_id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'Project member is already assigned to this card' }, { status: 400 });
    }

    // Assign project member to card
    const { data: cardMember, error } = await supabase
      .from('card_members')
      .insert([{
        card_id,
        project_member_id
      }])
      .select(`
        *,
        project_members (
          id,
          organization_member_id,
          role,
          joined_at,
          organization_members!inner (
            id,
            user_id,
            users!organization_members_user_id_fkey!inner (
              id,
              full_name,
              email,
              avatar_url
            )
          )
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
          assigned_project_member_id: project_member_id,
          assigned_user_name: (projectMember.organization_members as any).users.full_name,
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
    const projectMemberId = searchParams.get('project_member_id');
    const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

    if (!cardId || !projectMemberId) {
      return NextResponse.json({ error: 'Card ID and Project Member ID are required' }, { status: 400 });
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
        project_members (
          id,
          organization_member_id,
          organization_members!inner (
            id,
            user_id,
            users!organization_members_user_id_fkey!inner (
              id,
              full_name,
              email
            )
          )
        )
      `)
      .eq('card_id', cardId)
      .eq('project_member_id', projectMemberId)
      .single();

    if (memberError || !cardMember) {
      return NextResponse.json({ error: 'Card member not found' }, { status: 404 });
    }

    // Remove project member from card
    const { error } = await supabase
      .from('card_members')
      .delete()
      .eq('card_id', cardId)
      .eq('project_member_id', projectMemberId);

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
          removed_project_member_id: projectMemberId,
          removed_user_name: ((cardMember.project_members as any).organization_members as any).users.full_name,
          card_title: card.title 
        }
      }]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
