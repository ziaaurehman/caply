import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { redisSetJSON, redisGetJSON } from '@/utils/redis'

// Cache progress for 10 minutes (since Kanban data changes frequently)
const PROGRESS_CACHE_TTL = 600

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const url = new URL(req.url)
    const organizationId = url.searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Check cache first
    const cacheKey = `project_progress:${projectId}:${organizationId}`
    try {
      const cached = await redisGetJSON<any>(cacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }
    } catch (cacheError) {
      console.log('Cache read failed for project progress:', cacheError)
    }

    const supabase = await createClient()

    // Get all boards and their lists/cards for this project
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select(`
        id,
        name,
        lists!inner (
          id,
          name,
          position,
          cards (
            id,
            title,
            is_completed,
            checklists (
              id,
              checklist_items (
                id,
                is_completed
              )
            )
          )
        )
      `)
      .eq('project_id', projectId)
      .eq('lists.is_archived', false)
      .eq('cards.is_archived', false)

    if (boardsError) {
      console.error('Error fetching boards for progress:', boardsError)
      return NextResponse.json({ error: 'Failed to fetch project boards' }, { status: 500 })
    }

    if (!boards || boards.length === 0) {
      const result = {
        projectId,
        progress: 0,
        totalCards: 0,
        completedCards: 0,
        inProgressCards: 0,
        todoCards: 0,
        boardsAnalysis: []
      }
      
      // Cache empty result for 2 minutes
      try {
        await redisSetJSON(cacheKey, result, 120)
      } catch (e) {
        console.warn('Failed to cache empty progress result:', e)
      }
      
      return NextResponse.json(result)
    }

    let totalCards = 0
    let totalProgress = 0
    let completedCards = 0
    let inProgressCards = 0
    let todoCards = 0
    const boardsAnalysis: any[] = []

    for (const board of boards) {
      if (!board.lists || board.lists.length === 0) continue

      const lists = board.lists.sort((a, b) => a.position - b.position)
      const boardAnalysis = {
        boardId: board.id,
        boardName: board.name,
        lists: []
      }

      // Analyze each list and calculate list status weights
      for (let i = 0; i < lists.length; i++) {
        const list = lists[i]
        const listWeight = calculateListWeight(list.name, i, lists.length)
        const listAnalysis = {
          listId: list.id,
          listName: list.name,
          weight: listWeight,
          cards: list.cards?.length || 0
        }

        if (list.cards) {
          for (const card of list.cards) {
            totalCards++
            const cardProgress = calculateCardProgress(card, listWeight)
            totalProgress += cardProgress

            // Categorize cards
            if (cardProgress >= 100) {
              completedCards++
            } else if (cardProgress > 0) {
              inProgressCards++
            } else {
              todoCards++
            }
          }
        }

        boardAnalysis.lists.push(listAnalysis)
      }

      boardsAnalysis.push(boardAnalysis)
    }

    const overallProgress = totalCards > 0 ? Math.round(totalProgress / totalCards) : 0

    const result = {
      projectId,
      progress: overallProgress,
      totalCards,
      completedCards,
      inProgressCards,
      todoCards,
      boardsAnalysis
    }

    // Cache the result
    try {
      await redisSetJSON(cacheKey, result, PROGRESS_CACHE_TTL)
    } catch (e) {
      console.warn('Failed to cache progress result:', e)
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Error calculating project progress:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * Calculate the weight/completion percentage for a list based ONLY on its position
 * Last position = highest weight (100%), first position = lowest weight (0%)
 */
function calculateListWeight(listName: string, position: number, totalLists: number): number {
  // Use ONLY position-based logic (no name-based detection)
  if (totalLists === 1) return 50 // Single list = in progress
  
  if (position === totalLists - 1) return 100  // Last list = complete (100%)
  if (position === 0) return 0                 // First list = todo (0%)
  
  // Middle lists = scaled progress based on position
  // Each step increases progress evenly across all positions
  const progressStep = 100 / (totalLists - 1)
  return Math.round(position * progressStep)
}

/**
 * Calculate the progress percentage for a specific card
 */
function calculateCardProgress(card: any, listWeight: number): number {
  // If card is explicitly marked as completed, it's 100% regardless of list
  if (card.is_completed) {
    return 100
  }
  
  // If card has checklists, calculate based on checklist completion
  if (card.checklists && card.checklists.length > 0) {
    let totalChecklistItems = 0
    let completedChecklistItems = 0
    
    card.checklists.forEach((checklist: any) => {
      if (checklist.checklist_items) {
        checklist.checklist_items.forEach((item: any) => {
          totalChecklistItems++
          if (item.is_completed) {
            completedChecklistItems++
          }
        })
      }
    })
    
    if (totalChecklistItems > 0) {
      const checklistProgress = (completedChecklistItems / totalChecklistItems) * 100
      // Combine checklist progress with list weight
      return Math.round((checklistProgress * listWeight) / 100)
    }
  }
  
  // Default: Use list weight
  return listWeight
}
