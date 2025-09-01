import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisSetJSON } from '@/utils/redis';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { board_id, list_positions, organizationId } = body;

    if (!board_id || !list_positions || !Array.isArray(list_positions)) {
      return NextResponse.json({ error: 'Board ID and list positions array are required' }, { status: 400 });
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

    // Verify board exists and belongs to this organization
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
      console.error('Board not found error:', boardError);
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

  // Verify all lists belong to the board
  const listIds = list_positions.map(lp => lp.list_id);
  const { data: lists, error: listsError } = await supabase
    .from('lists')
    .select('id, name')
    .eq('board_id', board_id)
    .in('id', listIds);

  if (listsError || !lists || lists.length !== listIds.length) {
    return NextResponse.json({ error: 'Some lists not found in the specified board' }, { status: 404 });
  }

  const results: any[] = [];

  // Update position for each list
  for (const { list_id, position } of list_positions) {
    const { data: updatedList, error: updateError } = await supabase
      .from('lists')
      .update({ position })
      .eq('id', list_id)
      .eq('board_id', board_id)
      .select()
      .single();

    if (updateError) {
      results.push({ list_id, success: false, error: updateError.message });
    } else {
      results.push({ list_id, success: true, list: updatedList });
    }
  }

  // Create activity log for reordering
  await supabase
    .from('activities')
    .insert([{
      user_id: userContext!.userId,
      board_id: board_id,
      action_type: 'update',
      entity_type: 'board',
      entity_id: board_id,
      details: {
        action: 'reorder_lists',
        list_count: list_positions.length,
        new_positions: list_positions
      }
    }]);

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  // *** CACHE REFRESH: Update lists cache after reordering ***
  if (successCount > 0) {
    try {
      const cacheKey = `kanban:lists:${board_id}:${organizationId}`;
      
      // Get fresh lists data in the new order
      const { data: freshLists } = await supabase
        .from('lists')
        .select(`
          id,
          board_id,
          name,
          position,
          is_archived,
          created_at,
          updated_at
        `)
        .eq('board_id', board_id)
        .eq('is_archived', false)
        .order('position', { ascending: true });

      // Update cache with reordered lists
      const result = { lists: freshLists || [] };
      await redisSetJSON(cacheKey, result, 1800);
      
      console.log(`🔄 Refreshed lists cache after reordering ${successCount} lists`);
    } catch (e) {
      console.warn('Failed to refresh lists cache after reordering:', e);
    }
  }

  return NextResponse.json({ 
    results,
    summary: {
      total: list_positions.length,
      successful: successCount,
      failed: errorCount
    }
  });
  } catch (error: any) {
    console.error('Error in PATCH /api/kanban/lists/reorder:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
