import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const body = await req.json();
    const { checklist_id, content, due_date, assigned_to_project_member_id, organizationId } = body;
    const orgId = organizationId || req.headers.get('x-organization-id');

    if (!checklist_id || !content) {
      return NextResponse.json({ error: 'Checklist ID and content are required' }, { status: 400 });
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      orgId,
      { resource: 'projects', action: 'update' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

    // Verify checklist exists and user has access through project organization
    const { data: checklist, error: checklistError } = await supabase
      .from('checklists')
      .select(`
        id,
        name,
        card_id,
        cards!inner (
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
        )
      `)
      .eq('id', checklist_id)
      .eq('cards.lists.boards.projects.organization_id', orgId)
      .single();

    if (checklistError || !checklist) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    }

  // If assigned_to_project_member_id is provided, verify the project member exists
  if (assigned_to_project_member_id) {
    const organizationId = (checklist.cards as any).lists.boards.projects.organization_id;
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select(`
        id,
        organization_member_id,
        projects!inner(id, organization_id)
      `)
      .eq('id', assigned_to_project_member_id)
      .eq('projects.organization_id', organizationId)
      .single();

    if (memberError || !projectMember) {
      return NextResponse.json({ error: 'Assigned project member not found' }, { status: 404 });
    }
  }

  // Get next position
  const { data: lastItem } = await supabase
    .from('checklist_items')
    .select('position')
    .eq('checklist_id', checklist_id)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = lastItem ? lastItem.position + 1 : 0;

  // Create checklist item
  const { data: checklistItem, error } = await supabase
    .from('checklist_items')
    .insert([{
      checklist_id,
      content,
      position,
      due_date,
      assigned_to_project_member_id
    }])
          .select(`
        *,
        assigned_to_project_member_id,
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
      user_id: session.user.id,
      board_id: (checklist.cards as any).lists.board_id,
      card_id: checklist.card_id,
      action_type: 'create',
      entity_type: 'checklist_item',
      entity_id: checklistItem.id,
      details: { 
        item_content: content,
        checklist_name: checklist.name,
        card_title: (checklist.cards as any).title
      }
    }]);

    return NextResponse.json({ checklist_item: checklistItem });
  } catch (error) {
    console.error('Error creating checklist item:', error);
    return NextResponse.json({ error: 'Failed to create checklist item' }, { status: 500 });
  }
}
