import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';
import { redisSetJSON } from '@/utils/redis';

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
          
          // Get list names for better activity description
          const { data: fromList } = await supabase
            .from('lists')
            .select('name')
            .eq('id', originalCard?.list_id)
            .single();
            
          const { data: toList } = await supabase
            .from('lists')
            .select('name')
            .eq('id', target_list_id)
            .single();
          
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
                from_list_name: fromList?.name || 'Unknown List',
                to_list_id: target_list_id,
                to_list_name: toList?.name || 'Unknown List',
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

  // Refresh caches for affected lists and boards
  try {
    const affectedLists = new Set<string>();
    const affectedBoards = new Set<string>();
    
    // Collect affected lists and boards
    cards.forEach(card => {
      affectedLists.add(card.list_id);
      affectedBoards.add((card.lists as any).boards.id);
    });

    // Refresh caches for each affected list and board
    for (const listId of Array.from(affectedLists)) {
      const { data: freshCards } = await supabase
        .from('cards')
        .select(`
          *,
          lists!inner (
            id,
            name,
            boards!inner (
              id,
              project_id,
              projects!inner (
                id,
                organization_id
              )
            )
          ),
          card_members (
            project_member_id,
            project_members!inner (
              id,
              organization_member_id,
              role,
              joined_at,
              organization_members!inner (
                id,
                user_id,
                users!organization_members_user_id_fkey!inner (
                  id,
                  full_name,
                  email,
                  avatar_url
                )
              )
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
        `)
        .eq('list_id', listId)
        .eq('is_archived', false)
        .order('position', { ascending: true });

      const transformed = (freshCards || []).map(c => ({
        ...c,
        labels: (c as any).card_labels?.map((cl: any) => cl.labels).filter(Boolean) || [],
        cover: { color: (c as any).cover_color, image: (c as any).cover_image, size: ((c as any).cover_color || (c as any).cover_image) ? 'small' : undefined },
        card_labels: undefined
      }));

      const listCacheKey = `kanban:cards:list:${listId}:${(cards[0]?.lists as any)?.boards?.projects?.organization_id}`;
      await redisSetJSON(listCacheKey, { cards: transformed }, 1296000);
    }

    for (const boardId of Array.from(affectedBoards)) {
      const { data: boardCards } = await supabase
        .from('cards')
        .select(`
          *,
          lists!inner (
            id,
            name,
            boards!inner (
              id,
              project_id,
              projects!inner (
                id,
                organization_id
              )
            )
          ),
          card_members (
            project_member_id,
            project_members!inner (
              id,
              organization_member_id,
              role,
              joined_at,
              organization_members!inner (
                id,
                user_id,
                users!organization_members_user_id_fkey!inner (
                  id,
                  full_name,
                  email,
                  avatar_url
                )
              )
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
        `)
        .eq('lists.board_id', boardId)
        .eq('is_archived', false)
        .order('position', { ascending: true });

      const transformedBoard = (boardCards || []).map(c => ({
        ...c,
        labels: (c as any).card_labels?.map((cl: any) => cl.labels).filter(Boolean) || [],
        cover: { color: (c as any).cover_color, image: (c as any).cover_image, size: ((c as any).cover_color || (c as any).cover_image) ? 'small' : undefined },
        card_labels: undefined
      }));

      const boardCacheKey = `kanban:cards:board:${boardId}:${(cards[0]?.lists as any)?.boards?.projects?.organization_id}`;
      await redisSetJSON(boardCacheKey, { cards: transformedBoard }, 1296000);
    }
  } catch (e) {
    console.warn('Failed to refresh kanban cards cache after bulk operation:', e);
  }

  return NextResponse.json({ 
    results,
    summary: {
      total: card_ids.length,
      successful: successCount,
      failed: errorCount
    }
  });
}
