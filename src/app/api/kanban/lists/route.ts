import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get('board_id');
    const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

    if (!boardId) {
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
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

    // Verify board exists and belongs to the organization
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
      .eq('projects.organization_id', organizationId)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Get lists for the board
    const { data: lists, error } = await supabase
      .from('lists')
      .select(`
        *,
        cards (
          id,
          title,
          description,
          position,
          due_date,
          is_completed,
          is_archived,
          cover_color,
          cover_image,
          created_by,
          created_at,
          updated_at,
          card_members (
            project_member_id,
            project_members!inner (
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
              assigned_to_project_member_id,
              project_members (
                id,
                organization_member_id,
                role,
                joined_at,
                organization_members (
                  id,
                  user_id,
                  users!organization_members_user_id_fkey (
                    id,
                    full_name,
                    email,
                    avatar_url
                  )
                )
              )
            )
          )
        )
      `)
      .eq('board_id', boardId)
      .eq('is_archived', false)
      .order('position', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform card_labels to labels and cover data for frontend compatibility
    const transformedLists = lists?.map(list => ({
      ...list,
      cards: list.cards?.map((card: any) => ({
        ...card,
        labels: card.card_labels?.map((cl: any) => cl.labels).filter(Boolean) || [],
        cover: {
          color: card.cover_color,
          image: card.cover_image,
          size: card.cover_color || card.cover_image ? 'small' : undefined
        },
        card_labels: undefined // Remove the original card_labels to avoid confusion
      })) || []
    })) || [];

    return NextResponse.json({ lists: transformedLists });
  } catch (error: any) {
    console.error('Error in GET /api/kanban/lists:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { board_id, name } = body;
    const organizationId = body.organizationId || body.organization_id || req.headers.get('x-organization-id');

    if (!board_id || !name) {
      return NextResponse.json({ error: 'Board ID and name are required' }, { status: 400 });
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

    // Verify board exists and belongs to the organization
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
      .eq('id', board_id)
      .eq('projects.organization_id', organizationId)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Get next position
    const { data: lastList } = await supabase
      .from('lists')
      .select('position')
      .eq('board_id', board_id)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = lastList ? lastList.position + 1 : 0;

    // Create list
    const { data: list, error } = await supabase
      .from('lists')
      .insert([{
        board_id,
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
        user_id: userContext!.userId,
        board_id: board_id,
        action_type: 'create',
        entity_type: 'list',
        entity_id: list.id,
        details: { list_name: name }
      }]);

    return NextResponse.json({ list });
  } catch (error: any) {
    console.error('Error in POST /api/kanban/lists:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
