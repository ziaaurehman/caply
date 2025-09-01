import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON } from '@/utils/redis';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');
  const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  if (!organizationId) {
    return NextResponse.json({ 
      error: 'Organization ID is required' 
    }, { status: 400 })
  }

  // Validate organization access and permissions
  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'projects', action: 'read' }
  )

  if (!validation.success) {
    return NextResponse.json({ 
      error: validation.error 
    }, { status: validation.status })
  }

  const supabase = await createClient()
  const userContext = validation.context!

  // Verify project exists and belongs to the organization
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, organization_id, kanban_enabled')
    .eq('id', projectId)
    .eq('organization_id', organizationId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (!project.kanban_enabled) {
    return NextResponse.json({ error: 'Kanban is not enabled for this project' }, { status: 403 });
  }

  // Try cache first (1 hour for board info)
  const cacheKey = `kanban:boards:${projectId}:${organizationId}`;
  const cached = await redisGetJSON<any>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Get ONLY basic board information (no nested data)
  const { data: boards, error } = await supabase
    .from('boards')
    .select(`
      id,
      project_id,
      name,
      description,
      background_color,
      background_image,
      is_closed,
      visibility,
      position,
      created_by,
      created_at,
      updated_at
    `)
    .eq('project_id', projectId)
    .eq('is_closed', false)
    .order('position', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = { boards: boards || [] };
  try {
    // Cache for 1 hour (3600 seconds) instead of 15 days
    await redisSetJSON(cacheKey, result, 3600);
  } catch (e) {
    console.warn('Failed to cache kanban boards:', e);
  }
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { project_id, organizationId, name, description, background_color, background_image, visibility } = body;

  if (!project_id || !name) {
    return NextResponse.json({ error: 'Project ID and name are required' }, { status: 400 });
  }

  if (!organizationId) {
    return NextResponse.json({ 
      error: 'Organization ID is required' 
    }, { status: 400 })
  }

  // Validate organization access and permissions
  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'projects', action: 'update' }
  )

  if (!validation.success) {
    return NextResponse.json({ 
      error: validation.error 
    }, { status: validation.status })
  }

  const supabase = await createClient()
  const userContext = validation.context!

  // Verify project exists and belongs to the organization
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, organization_id, kanban_enabled')
    .eq('id', project_id)
    .eq('organization_id', organizationId)
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
      created_by: userContext.userId
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
      user_id: userContext.userId,
      board_id: board.id,
      action_type: 'create',
      entity_type: 'board',
      entity_id: board.id,
      details: { board_name: name }
    }]);

  // Refresh boards cache for this project (lightweight cache refresh)
  try {
    const { data: freshBoards } = await supabase
      .from('boards')
      .select(`
        id,
        project_id,
        name,
        description,
        background_color,
        background_image,
        is_closed,
        visibility,
        position,
        created_by,
        created_at,
        updated_at
      `)
      .eq('project_id', project_id)
      .eq('is_closed', false)
      .order('position', { ascending: true });

    const cacheKey = `kanban:boards:${project_id}:${organizationId}`;
    await redisSetJSON(cacheKey, { boards: freshBoards || [] }, 3600);
  } catch (e) {
    console.warn('Failed to refresh kanban boards cache after create:', e);
  }

  return NextResponse.json({ board });
}
