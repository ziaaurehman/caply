import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await req.json();
  const { operation, card_ids, target_list_id, positions } = body;

  if (!operation || !card_ids || !Array.isArray(card_ids)) {
    return NextResponse.json({ error: 'Operation and card IDs array are required' }, { status: 400 });
  }

  // Verify user has access to all cards
  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select(`
      id,
      title,
      list_id,
      position,
      lists!inner (
        id,
        boards!inner (
          id,
          projects!inner (
            organization_members!inner (
              user_id
            )
          )
        )
      )
    `)
    .in('id', card_ids)
    .eq('lists.boards.projects.organization_members.user_id', session.user.id)
    .eq('lists.boards.projects.organization_members.status', 'active');

  if (cardsError || !cards || cards.length !== card_ids.length) {
    return NextResponse.json({ error: 'Some cards not found or access denied' }, { status: 404 });
  }

  const results: any[] = [];

  switch (operation) {
    case 'move':
      if (!target_list_id) {
        return NextResponse.json({ error: 'Target list ID is required for move operation' }, { status: 400 });
      }

      // Verify access to target list
      const { data: targetList, error: listError } = await supabase
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
        .eq('id', target_list_id)
        .eq('boards.projects.organization_members.user_id', session.user.id)
        .eq('boards.projects.organization_members.status', 'active')
        .single();

      if (listError || !targetList) {
        return NextResponse.json({ error: 'Target list not found' }, { status: 404 });
      }

      // Move cards to target list
      for (let i = 0; i < card_ids.length; i++) {
        const cardId = card_ids[i];
        const newPosition = positions && positions[i] !== undefined ? positions[i] : i;

        const { data: updatedCard, error: updateError } = await supabase
          .from('cards')
          .update({
            list_id: target_list_id,
            position: newPosition
          })
          .eq('id', cardId)
          .select()
          .single();

        if (updateError) {
          results.push({ card_id: cardId, success: false, error: updateError.message });
        } else {
          results.push({ card_id: cardId, success: true, card: updatedCard });

          // Create activity log for each moved card
          const originalCard = cards.find(c => c.id === cardId);
          await supabase
            .from('activities')
            .insert([{
              user_id: session.user.id,
              board_id: (originalCard?.lists as any).boards.id,
              card_id: cardId,
              action_type: 'move',
              entity_type: 'card',
              entity_id: cardId,
              details: {
                from_list_id: originalCard?.list_id,
                to_list_id: target_list_id,
                card_title: originalCard?.title,
                bulk_operation: true
              }
            }]);
        }
      }
      break;

    case 'archive':
      // Archive multiple cards
      for (const cardId of card_ids) {
        const { data: updatedCard, error: updateError } = await supabase
          .from('cards')
          .update({ is_archived: true })
          .eq('id', cardId)
          .select()
          .single();

        if (updateError) {
          results.push({ card_id: cardId, success: false, error: updateError.message });
        } else {
          results.push({ card_id: cardId, success: true, card: updatedCard });

          // Create activity log
          const originalCard = cards.find(c => c.id === cardId);
          await supabase
            .from('activities')
            .insert([{
              user_id: session.user.id,
              board_id: (originalCard?.lists as any).boards.id,
              card_id: cardId,
              action_type: 'archive',
              entity_type: 'card',
              entity_id: cardId,
              details: {
                card_title: originalCard?.title,
                bulk_operation: true
              }
            }]);
        }
      }
      break;

    case 'delete':
      // Delete multiple cards
      for (const cardId of card_ids) {
        const { error: deleteError } = await supabase
          .from('cards')
          .delete()
          .eq('id', cardId);

        if (deleteError) {
          results.push({ card_id: cardId, success: false, error: deleteError.message });
        } else {
          results.push({ card_id: cardId, success: true });

          // Create activity log
          const originalCard = cards.find(c => c.id === cardId);
          await supabase
            .from('activities')
            .insert([{
              user_id: session.user.id,
              board_id: (originalCard?.lists as any).boards.id,
              card_id: cardId,
              action_type: 'delete',
              entity_type: 'card',
              entity_id: cardId,
              details: {
                card_title: originalCard?.title,
                bulk_operation: true
              }
            }]);
        }
      }
      break;

    default:
      return NextResponse.json({ error: 'Invalid operation. Supported operations: move, archive, delete' }, { status: 400 });
  }

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return NextResponse.json({ 
    results,
    summary: {
      total: card_ids.length,
      successful: successCount,
      failed: errorCount
    }
  });
}
