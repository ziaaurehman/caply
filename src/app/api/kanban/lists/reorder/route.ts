import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await req.json();
  const { board_id, list_positions } = body;

  if (!board_id || !list_positions || !Array.isArray(list_positions)) {
    return NextResponse.json({ error: 'Board ID and list positions array are required' }, { status: 400 });
  }

  // Verify user has access to the board
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Verify board exists and user has access through project organization
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
    .eq('projects.organization_id', userOrg.organization_id)
    .single();

  if (boardError || !board) {
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
      user_id: session.user.id,
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

  return NextResponse.json({ 
    results,
    summary: {
      total: list_positions.length,
      successful: successCount,
      failed: errorCount
    }
  });
}
