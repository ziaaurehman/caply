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
  const boardId = searchParams.get('board_id');

  if (!boardId) {
    return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
  }

  // Check if user has access to the board
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select(`
      id,
      projects!inner (
        organization_members!inner (
          user_id
        )
      )
    `)
    .eq('id', boardId)
    .eq('projects.organization_members.user_id', session.user.id)
    .eq('projects.organization_members.status', 'active')
    .single();

  if (boardError || !board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Get labels for the board
  const { data: labels, error } = await supabase
    .from('labels')
    .select('*')
    .eq('board_id', boardId)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ labels: labels || [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await req.json();
  const { board_id, name, color } = body;

  if (!board_id || !name || !color) {
    return NextResponse.json({ error: 'Board ID, name, and color are required' }, { status: 400 });
  }

  // Validate color format (hex color)
  if (!/^#[0-9A-F]{6}$/i.test(color)) {
    return NextResponse.json({ error: 'Color must be a valid hex color (e.g., #FF0000)' }, { status: 400 });
  }

  // Check if user has access to the board
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select(`
      id,
      projects!inner (
        organization_members!inner (
          user_id
        )
      )
    `)
    .eq('id', board_id)
    .eq('projects.organization_members.user_id', session.user.id)
    .eq('projects.organization_members.status', 'active')
    .single();

  if (boardError || !board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Create label
  const { data: label, error } = await supabase
    .from('labels')
    .insert([{
      board_id,
      name,
      color
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
      board_id: board_id,
      action_type: 'create',
      entity_type: 'label',
      entity_id: label.id,
      details: { label_name: name, label_color: color }
    }]);

  return NextResponse.json({ label });
}
