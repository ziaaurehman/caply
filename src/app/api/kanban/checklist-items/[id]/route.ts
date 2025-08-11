import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const itemId = params.id;
    const body = await req.json();
    const { content, is_completed, position, due_date, assigned_to_project_member_id, organizationId } = body;
    const orgId = organizationId || req.headers.get('x-organization-id');

    // First get the checklist item to find the organization
    const { data: existingItem, error: itemError } = await supabase
      .from('checklist_items')
      .select(`
        *,
        checklists!inner (
          id,
          name,
          card_id,
          cards!inner (
            id,
            title,
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
        )
      `)
      .eq('id', itemId)
      .single();

    if (itemError || !existingItem) {
      console.log('Checklist item not found:', itemError);
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    // Get the organization ID from the item
    const itemOrgId = (existingItem.checklists as any).cards.lists.boards.projects.organization_id;

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(
      itemOrgId,
      { resource: 'projects', action: 'update' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

  // If assigned_to_project_member_id is provided, verify the project member exists
  if (assigned_to_project_member_id) {
    const organizationId = (existingItem.checklists as any).cards.lists.boards.projects.organization_id;
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

  // Update checklist item
  const { data: checklistItem, error } = await supabase
    .from('checklist_items')
    .update({
      content,
      is_completed,
      position,
      due_date,
      assigned_to_project_member_id
    })
    .eq('id', itemId)
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
  let actionType = 'update';
  let details: any = { changes: body };

  if (body.hasOwnProperty('is_completed')) {
    actionType = is_completed ? 'complete' : 'incomplete';
    details = {
      item_content: existingItem.content,
      completed: is_completed,
      checklist_name: (existingItem.checklists as any).name,
      card_title: (existingItem.checklists as any).cards.title
    };
  }

  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: (existingItem.checklists as any).cards.lists.boards.id,
      card_id: (existingItem.checklists as any).card_id,
      action_type: actionType,
      entity_type: 'checklist_item',
      entity_id: itemId,
      details
    }]);

    return NextResponse.json({ checklist_item: checklistItem });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const itemId = params.id;

    // First get the checklist item to find the organization
    const { data: existingItem, error: itemError } = await supabase
      .from('checklist_items')
      .select(`
        *,
        checklists!inner (
          id,
          name,
          card_id,
          cards!inner (
            id,
            title,
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
        )
      `)
      .eq('id', itemId)
      .single();

    if (itemError || !existingItem) {
      console.log('Checklist item not found for deletion:', itemError);
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    // Get the organization ID from the item
    const itemOrgId = (existingItem.checklists as any).cards.lists.boards.projects.organization_id;

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(
      itemOrgId,
      { resource: 'projects', action: 'update' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

  // Delete checklist item
  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create activity log
  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: (existingItem.checklists as any).cards.lists.boards.id,
      card_id: (existingItem.checklists as any).card_id,
      action_type: 'delete',
      entity_type: 'checklist_item',
      entity_id: itemId,
      details: { 
        item_content: existingItem.content,
        checklist_name: (existingItem.checklists as any).name,
        card_title: (existingItem.checklists as any).cards.title
      }
    }]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 });
  }
}
