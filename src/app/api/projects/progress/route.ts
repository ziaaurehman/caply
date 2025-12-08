import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Optimized progress calculation API
 * Calculates progress for multiple projects in a single request
 * Uses position-based weighting: first list = 0%, last list = 100%
 */
export async function POST(req: NextRequest) {
  try {
    const { projectIds } = await req.json();

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json(
        { error: "Project IDs array is required" },
        { status: 400 }
      );
    }

    // Get boards first
    const boardsData = await prisma.board.findMany({
      where: {
        projectId: {
          in: projectIds,
        },
      },
      select: {
        projectId: true,
        id: true,
        name: true,
      },
    });

    if (!boardsData || boardsData.length === 0) {
      console.log("No boards found for projects:", projectIds);
      const results = projectIds.map((projectId) => ({
        projectId,
        progress: 0,
        totalCards: 0,
        completedCards: 0,
        inProgressCards: 0,
        todoCards: 0,
      }));
      return NextResponse.json({
        success: true,
        progress: results,
      });
    }

    // Get lists for all boards
    const boardIds = boardsData.map((board) => board.id);
    const listsData = await prisma.list.findMany({
      where: {
        boardId: {
          in: boardIds,
        },
        isArchived: false,
      },
      select: {
        id: true,
        boardId: true,
        name: true,
        position: true,
      },
    });

    // Get cards for all lists
    const listIds = listsData.map((list) => list.id);
    const cardsData = await prisma.card.findMany({
      where: {
        listId: {
          in: listIds,
        },
        isArchived: false,
      },
      select: {
        id: true,
        listId: true,
        isCompleted: true,
      },
    });

    console.log("Data fetched successfully:", {
      boards: boardsData?.length || 0,
      lists: listsData?.length || 0,
      cards: cardsData?.length || 0,
    });

    // Group data by project_id
    const projectProgressMap = new Map<string, any>();

    // Initialize all projects with default progress
    projectIds.forEach((projectId) => {
      projectProgressMap.set(projectId, {
        projectId,
        progress: 0,
        totalCards: 0,
        completedCards: 0,
        inProgressCards: 0,
        todoCards: 0,
      });
    });

    // Process data by grouping lists and cards by board
    const boardListsMap = new Map<string, any[]>();
    const listCardsMap = new Map<string, any[]>();

    // Group lists by board_id
    if (listsData) {
      listsData.forEach((list) => {
        if (!boardListsMap.has(list.boardId)) {
          boardListsMap.set(list.boardId, []);
        }
        boardListsMap.get(list.boardId)!.push(list);
      });
    }

    // Group cards by list_id
    if (cardsData) {
      cardsData.forEach((card) => {
        if (!listCardsMap.has(card.listId)) {
          listCardsMap.set(card.listId, []);
        }
        listCardsMap.get(card.listId)!.push(card);
      });
    }

    // Process each board
    if (boardsData && boardsData.length > 0) {
      boardsData.forEach((board) => {
        const projectId = board.projectId;
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

          listCards.forEach((card) => {
            projectData.totalCards++;

            let cardProgress = listWeight;

            // If card is explicitly completed, it's 100% regardless of list position
            if (card.isCompleted) {
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
      projectProgressMap.forEach((projectData) => {
        if (projectData.totalCards > 0) {
          // Calculate weighted average progress
          let totalProgress = 0;
          let totalWeight = 0;

          // Re-process to calculate weighted average
          const projectBoards = boardsData.filter(
            (board) => board.project_id === projectData.projectId
          );

          projectBoards.forEach((board) => {
            const boardLists = boardListsMap.get(board.id) || [];
            if (boardLists.length === 0) return;

            const sortedLists = boardLists.sort(
              (a, b) => a.position - b.position
            );
            const totalLists = sortedLists.length;

            sortedLists.forEach((list, index) => {
              const listWeight = calculateListWeight(index, totalLists);
              const listCards = listCardsMap.get(list.id) || [];

              listCards.forEach((card) => {
                let cardProgress = listWeight;
                if (card.is_completed) {
                  cardProgress = 100;
                }

                totalProgress += cardProgress;
                totalWeight += 100; // Each card has max weight of 100
              });
            });
          });

          projectData.progress =
            totalWeight > 0
              ? Math.round((totalProgress / totalWeight) * 100)
              : 0;
        }
      });
    }

    // Convert map to array
    const results = Array.from(projectProgressMap.values());

    console.log(
      "Progress calculation completed for",
      results.length,
      "projects"
    );

    return NextResponse.json({
      success: true,
      progress: results,
    });
  } catch (error) {
    console.error("Error calculating project progress:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
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
