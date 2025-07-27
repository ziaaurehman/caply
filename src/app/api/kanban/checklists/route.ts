import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get('card_id');
    const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

    if (!cardId) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
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

    // Get checklists for the card
    const { data: checklists, error } = await supabase
      .from('checklists')
      .select(`
        *,
        checklist_items (
          id,
          content,
          is_completed,
          position,
          due_date,
          assigned_to,
          created_at,
          updated_at,
          users (
            id,
            full_name,
            email,
            avatar_url
          )
        )
      `)
      .eq('card_id', cardId)
      .order('position', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ checklists: checklists || [] });
  } catch (error) {
    console.error('Error fetching checklists:', error);
    return NextResponse.json({ error: 'Failed to fetch checklists' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await req.json();
  const { card_id, name } = body;

  if (!card_id || !name) {
    return NextResponse.json({ error: 'Card ID and name are required' }, { status: 400 });
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
    .eq('lists.boards.projects.organization_id', userOrg.organization_id)
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  // Get next position
  const { data: lastChecklist } = await supabase
    .from('checklists')
    .select('position')
    .eq('card_id', card_id)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = lastChecklist ? lastChecklist.position + 1 : 0;

  // Create checklist
  const { data: checklist, error } = await supabase
    .from('checklists')
    .insert([{
      card_id,
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
      board_id: (card.lists as any).board_id,
      card_id: card_id,
      action_type: 'create',
      entity_type: 'checklist',
      entity_id: checklist.id,
      details: { 
        checklist_name: name,
        card_title: card.title 
      }
    }]);

  return NextResponse.json({ checklist });
}
