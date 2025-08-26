import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON } from '@/utils/redis';

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

    // Check if user has access to the board
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select(`
        id,
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

    // Try cache first (15 days)
    const cacheKey = `kanban:labels:${boardId}:${organizationId}`;
    const cached = await redisGetJSON<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
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

    const result = { labels: labels || [] };
    try {
      await redisSetJSON(cacheKey, result, 1296000);
    } catch (e) {
      console.warn('Failed to cache kanban labels:', e);
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/kanban/labels:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { board_id, name, color } = body;
    const organizationId = body.organizationId || body.organization_id || req.headers.get('x-organization-id');

    if (!board_id || !name || !color) {
      return NextResponse.json({ error: 'Board ID, name, and color are required' }, { status: 400 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Validate color format (hex color)
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json({ error: 'Color must be a valid hex color (e.g., #FF0000)' }, { status: 400 });
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
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select(`
        id,
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
        user_id: userContext!.userId,
        board_id: board_id,
        action_type: 'create',
        entity_type: 'label',
        entity_id: label.id,
        details: { label_name: name, label_color: color }
      }]);

    // Refresh labels cache for this board
    try {
      const { data: freshLabels } = await supabase
        .from('labels')
        .select('*')
        .eq('board_id', board_id)
        .order('name', { ascending: true });
      const cacheKey = `kanban:labels:${board_id}:${organizationId}`;
      await redisSetJSON(cacheKey, { labels: freshLabels || [] }, 1296000);
    } catch (e) {
      console.warn('Failed to refresh kanban labels cache after create:', e);
    }

    return NextResponse.json({ label });
  } catch (error) {
    console.error('Error in POST /api/kanban/labels:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
