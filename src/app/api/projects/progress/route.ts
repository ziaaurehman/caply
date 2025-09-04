import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Optimized progress calculation API
 * Calculates progress for multiple projects in a single request
 * Uses position-based weighting: first list = 0%, last list = 100%
 */
export async function POST(req: NextRequest) {
  try {
    const { projectIds } = await req.json();

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: 'Project IDs array is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get boards first
    const { data: boardsData, error: boardsError } = await supabase
      .from('boards')
      .select(`
        project_id,
        id,
        name
      `)
      .in('project_id', projectIds);

    if (boardsError) {
      console.error('Error fetching boards data:', boardsError);
      return NextResponse.json({ error: 'Failed to fetch progress data' }, { status: 500 });
    }

    if (!boardsData || boardsData.length === 0) {
      console.log('No boards found for projects:', projectIds);
      const results = projectIds.map(projectId => ({
        projectId,
        progress: 0,
        totalCards: 0,
        completedCards: 0,
        inProgressCards: 0,
        todoCards: 0
      }));
      return NextResponse.json({ 
        success: true,
        progress: results 
      });
    }

    // Get lists for all boards
    const boardIds = boardsData.map(board => board.id);
    const { data: listsData, error: listsError } = await supabase
      .from('lists')
      .select(`
        id,
        board_id,
        name,
        position
      `)
      .in('board_id', boardIds)
      .eq('is_archived', false);

    if (listsError) {
      console.error('Error fetching lists data:', listsError);
      return NextResponse.json({ error: 'Failed to fetch progress data' }, { status: 500 });
    }

    // Get cards for all lists
    const listIds = listsData?.map(list => list.id) || [];
    const { data: cardsData, error: cardsError } = await supabase
      .from('cards')
      .select(`
        id,
        list_id,
        is_completed
      `)
      .in('list_id', listIds)
      .eq('is_archived', false);

    if (cardsError) {
      console.error('Error fetching cards data:', cardsError);
      return NextResponse.json({ error: 'Failed to fetch progress data' }, { status: 500 });
    }

    console.log('Data fetched successfully:', {
      boards: boardsData?.length || 0,
      lists: listsData?.length || 0,
      cards: cardsData?.length || 0
    });

    // Group data by project_id
    const projectProgressMap = new Map<string, any>();

    // Initialize all projects with default progress
    projectIds.forEach(projectId => {
      projectProgressMap.set(projectId, {
        projectId,
        progress: 0,
        totalCards: 0,
        completedCards: 0,
        inProgressCards: 0,
        todoCards: 0
      });
    });

    // Process data by grouping lists and cards by board
    const boardListsMap = new Map<string, any[]>();
    const listCardsMap = new Map<string, any[]>();

    // Group lists by board_id
    if (listsData) {
      listsData.forEach(list => {
        if (!boardListsMap.has(list.board_id)) {
          boardListsMap.set(list.board_id, []);
        }
        boardListsMap.get(list.board_id)!.push(list);
      });
    }

    // Group cards by list_id
    if (cardsData) {
      cardsData.forEach(card => {
        if (!listCardsMap.has(card.list_id)) {
          listCardsMap.set(card.list_id, []);
        }
        listCardsMap.get(card.list_id)!.push(card);
      });
    }

    // Process each board
    if (boardsData && boardsData.length > 0) {
      boardsData.forEach(board => {
        const projectId = board.project_id;
        const projectData = projectProgressMap.get(projectId);
        
        if (!projectData) return; // Skip if project not in our map

        const boardLists = boardListsMap.get(board.id) || [];
        if (boardLists.length === 0) return;

        // Sort lists by position
        const sortedLists = boardLists.sort((a, b) => a.position - b.position);
        const totalLists = sortedLists.length;

        sortedLists.forEach((list, index) => {
          const listWeight = calculateListWeight(index, totalLists);
          const listCards = listCardsMap.get(list.id) || [];
          
          listCards.forEach(card => {
            projectData.totalCards++;
            
            let cardProgress = listWeight;
            
            // If card is explicitly completed, it's 100% regardless of list position
            if (card.is_completed) {
              cardProgress = 100;
            }
            
            // Categorize cards based on progress
            if (cardProgress >= 100) {
              projectData.completedCards++;
            } else if (cardProgress > 0) {
              projectData.inProgressCards++;
            } else {
              projectData.todoCards++;
            }
          });
        });
      });

      // Calculate overall progress for each project
      projectProgressMap.forEach(projectData => {
        if (projectData.totalCards > 0) {
          // Calculate weighted average progress
          let totalProgress = 0;
          let totalWeight = 0;

          // Re-process to calculate weighted average
          const projectBoards = boardsData.filter(board => board.project_id === projectData.projectId);
          
          projectBoards.forEach(board => {
            const boardLists = boardListsMap.get(board.id) || [];
            if (boardLists.length === 0) return;
            
            const sortedLists = boardLists.sort((a, b) => a.position - b.position);
            const totalLists = sortedLists.length;

            sortedLists.forEach((list, index) => {
              const listWeight = calculateListWeight(index, totalLists);
              const listCards = listCardsMap.get(list.id) || [];
              
              listCards.forEach(card => {
                let cardProgress = listWeight;
                if (card.is_completed) {
                  cardProgress = 100;
                }
                
                totalProgress += cardProgress;
                totalWeight += 100; // Each card has max weight of 100
              });
            });
          });

          projectData.progress = totalWeight > 0 ? Math.round(totalProgress / totalWeight * 100) : 0;
        }
      });
    }

    // Convert map to array
    const results = Array.from(projectProgressMap.values());

    console.log('Progress calculation completed for', results.length, 'projects');

    return NextResponse.json({ 
      success: true,
      progress: results 
    });

  } catch (error) {
    console.error('Error calculating project progress:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * Calculate list weight based on position
 * First position (0) = 0%, Last position = 100%
 * Linear scaling for middle positions
 */
function calculateListWeight(position: number, totalLists: number): number {
  if (totalLists === 1) return 50; // Single list = in progress
  
  if (position === totalLists - 1) return 100; // Last list = complete (100%)
  if (position === 0) return 0; // First list = todo (0%)
  
  // Linear scaling for middle positions
  const progressStep = 100 / (totalLists - 1);
  return Math.round(position * progressStep);
}
