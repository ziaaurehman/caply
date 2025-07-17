import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { id: boardId } = await params;

  // Check user access to organization
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

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
    .eq('projects.organization_id', userOrg.organization_id)
    .single();

  if (error || !board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  if (!board.projects.kanban_enabled) {
    return NextResponse.json({ error: 'Kanban is not enabled for this project' }, { status: 403 });
  }

  return NextResponse.json({ board });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { id: boardId } = await params;
  const body = await req.json();
  const { name, description, background_color, background_image, visibility, is_closed } = body;

  // Check user access to organization
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

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
    .eq('projects.organization_id', userOrg.organization_id)
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
      user_id: session.user.id,
      board_id: boardId,
      action_type: 'update',
      entity_type: 'board',
      entity_id: boardId,
      details: { changes: body }
    }]);

  return NextResponse.json({ board });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { id: boardId } = await params;

  // Check user access to organization
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

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
    .eq('projects.organization_id', userOrg.organization_id)
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
      user_id: session.user.id,
      action_type: 'delete',
      entity_type: 'board',
      entity_id: boardId,
      details: { board_name: existingBoard.name }
    }]);

  return NextResponse.json({ success: true });
}
