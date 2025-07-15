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
  const { list_id, card_positions } = body;

  if (!list_id || !card_positions || !Array.isArray(card_positions)) {
    return NextResponse.json({ error: 'List ID and card positions array are required' }, { status: 400 });
  }

  // Verify user has access to the list
  const { data: list, error: listError } = await supabase
    .from('lists')
    .select(`
      id,
      boards!inner (
        id,
        projects!inner (
          organization_members!inner (
            user_id
          )
        )
      )
    `)
    .eq('id', list_id)
    .eq('boards.projects.organization_members.user_id', session.user.id)
    .eq('boards.projects.organization_members.status', 'active')
    .single();

  if (listError || !list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  // Verify all cards belong to the list and user has access
  const cardIds = card_positions.map(cp => cp.card_id);
  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id, title')
    .eq('list_id', list_id)
    .in('id', cardIds);

  if (cardsError || !cards || cards.length !== cardIds.length) {
    return NextResponse.json({ error: 'Some cards not found in the specified list' }, { status: 404 });
  }

  const results: any[] = [];

  // Update position for each card
  for (const { card_id, position } of card_positions) {
    const { data: updatedCard, error: updateError } = await supabase
      .from('cards')
      .update({ position })
      .eq('id', card_id)
      .eq('list_id', list_id)
      .select()
      .single();

    if (updateError) {
      results.push({ card_id, success: false, error: updateError.message });
    } else {
      results.push({ card_id, success: true, card: updatedCard });
    }
  }

  // Create activity log for reordering
  await supabase
    .from('activities')
    .insert([{
      user_id: session.user.id,
      board_id: (list.boards as any).id,
      action_type: 'update',
      entity_type: 'list',
      entity_id: list_id,
      details: {
        action: 'reorder_cards',
        card_count: card_positions.length,
        new_positions: card_positions
      }
    }]);

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return NextResponse.json({ 
    results,
    summary: {
      total: card_positions.length,
      successful: successCount,
      failed: errorCount
    }
  });
}
