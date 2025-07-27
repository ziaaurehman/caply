import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

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

    // Check if user has access to the board
    const { data: board, error } = await supabase
      .from('boards')
      .select(`
        *,
        projects!inner (
          id,
          organization_id,
          kanban_enabled
        )
      `)
      .eq('id', boardId)
      .eq('projects.organization_id', organizationId)
      .single();

    if (error || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    if (!board.projects.kanban_enabled) {
      return NextResponse.json({ error: 'Kanban is not enabled for this project' }, { status: 403 });
    }

    return NextResponse.json({ board });
  } catch (error) {
    console.error('Error fetching board:', error);
    return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    const body = await req.json();
    const { name, description, background_color, background_image, visibility, is_closed } = body;
    const organizationId = body.organizationId || body.organization_id || req.headers.get('x-organization-id');

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

    // Check if user has access to the board
    const { data: existingBoard, error: boardError } = await supabase
      .from('boards')
      .select(`
        *,
        projects!inner (
          id,
          organization_id,
          kanban_enabled
        )
      `)
      .eq('id', boardId)
      .eq('projects.organization_id', organizationId)
      .single();

    if (boardError || !existingBoard) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Update board
    const { data: board, error } = await supabase
      .from('boards')
      .update({
        name,
        description,
        background_color,
        background_image,
        visibility,
        is_closed
      })
      .eq('id', boardId)
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
        board_id: boardId,
        action_type: 'update',
        entity_type: 'board',
        entity_id: boardId,
        details: { changes: body }
      }]);

    return NextResponse.json({ board });
  } catch (error) {
    console.error('Error updating board:', error);
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      organizationId,
      { resource: 'projects', action: 'delete' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

    const { context: userContext } = validation;
    const supabase = await createClient();

    // Check if user has access to the board
    const { data: existingBoard, error: boardError } = await supabase
      .from('boards')
      .select(`
        *,
        projects!inner (
          id,
          organization_id,
          kanban_enabled
        )
      `)
      .eq('id', boardId)
      .eq('projects.organization_id', organizationId)
      .single();

    if (boardError || !existingBoard) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Delete board (CASCADE will handle related data)
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create activity log
    await supabase
      .from('activities')
      .insert([{
        user_id: userContext!.userId,
        action_type: 'delete',
        entity_type: 'board',
        entity_id: boardId,
        details: { board_name: existingBoard.name }
      }]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting board:', error);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}
