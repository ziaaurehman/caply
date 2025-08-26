import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON } from '@/utils/redis';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get('board_id');
    const cardId = searchParams.get('card_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

    if (!boardId && !cardId) {
      return NextResponse.json({ error: 'Board ID or Card ID is required' }, { status: 400 });
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

    // Try cache first (15 days)
    const scope = cardId ? `card:${cardId}` : `board:${boardId}`;
    const cacheKey = `kanban:activities:${scope}:${limit}:${offset}:${organizationId}`;
    const cached = await redisGetJSON<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build query based on parameters
    let query = supabase
      .from('activities')
      .select(`
        *,
        users (
          id,
          full_name,
          email,
          avatar_url
        )
      `);

    if (boardId) {
      // Verify board exists and user has access through project organization
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

      query = query.eq('board_id', boardId);
    }

    if (cardId) {
      // Verify card exists and user has access through project organization
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .select(`
          id,
          lists!inner (
            id,
            boards!inner (
              id,
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

      query = query.eq('card_id', cardId);
    }

    // Execute query with pagination
    const { data: activities, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = { activities: activities || [] };
    try {
      await redisSetJSON(cacheKey, result, 1296000);
    } catch (e) {
      console.warn('Failed to cache kanban activities:', e);
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/kanban/activities:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
