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
  const projectId = searchParams.get('project_id');

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  // Check if user has access to the project
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Verify project exists and user has access
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, organization_id, kanban_enabled')
    .eq('id', projectId)
    .eq('organization_id', userOrg.organization_id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (!project.kanban_enabled) {
    return NextResponse.json({ error: 'Kanban is not enabled for this project' }, { status: 403 });
  }

  // Get boards for the project
  const { data: boards, error } = await supabase
    .from('boards')
    .select(`
      *,
      lists (
        id,
        name,
        position,
        is_archived,
        cards (
          id,
          title,
          position,
          is_completed,
          is_archived,
          due_date,
          cover_color,
          cover_image,
          card_members (
            user_id,
            users (
              id,
              full_name,
              email,
              avatar_url
            )
          ),
          card_labels (
            label_id,
            labels (
              id,
              name,
              color
            )
          )
        )
      )
    `)
    .eq('project_id', projectId)
    .eq('is_closed', false)
    .order('position', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ boards: boards || [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await req.json();
  const { project_id, name, description, background_color, background_image, visibility } = body;

  if (!project_id || !name) {
    return NextResponse.json({ error: 'Project ID and name are required' }, { status: 400 });
  }

  // Check if user has access to the project
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Verify project exists and user has access
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, organization_id, kanban_enabled')
    .eq('id', project_id)
    .eq('organization_id', userOrg.organization_id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (!project.kanban_enabled) {
    return NextResponse.json({ error: 'Kanban is not enabled for this project' }, { status: 403 });
  }

  // Get next position
  const { data: lastBoard } = await supabase
    .from('boards')
    .select('position')
    .eq('project_id', project_id)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = lastBoard ? lastBoard.position + 1 : 0;

  // Create board
  const { data: board, error } = await supabase
    .from('boards')
    .insert([{
      project_id,
      name,
      description,
      background_color: background_color || '#0079bf',
      background_image,
      visibility: visibility || 'project',
      position,
      created_by: session.user.id
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
      board_id: board.id,
      action_type: 'create',
      entity_type: 'board',
      entity_id: board.id,
      details: { board_name: name }
    }]);

  return NextResponse.json({ board });
}
