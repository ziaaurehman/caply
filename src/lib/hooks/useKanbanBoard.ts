import { useQuery, useQueryClient } from "@tanstack/react-query";
import { kanbanAPI } from "@/utils/api/kanban";

interface UseKanbanBoardOptions {
  boardId?: string;
  includeArchived?: boolean;
  search?: string;
}

export const useKanbanBoard = (
  projectId: string | undefined,
  organizationId: string | undefined,
  options?: UseKanbanBoardOptions
) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [
      "kanban-board-data",
      projectId,
      organizationId,
      options?.boardId || "default",
      options?.includeArchived || false,
      options?.search || "",
    ],
    queryFn: async () => {
      if (!projectId || !organizationId) {
        throw new Error("Project ID and Organization ID are required");
      }

      const response = await kanbanAPI.getCompleteBoardData(
        projectId,
        organizationId,
        options
      );

      return response.data;
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("not found")) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: "always", // Change this to prevent unnecessary refetches
    refetchOnReconnect: false,
  });

  // Helper functions for data manipulation
  const invalidateBoard = () => {
    queryClient.invalidateQueries({
      queryKey: ["kanban-board-data", projectId, organizationId],
    });
  };

  const updateBoardData = (updater: (oldData: any) => any) => {
    queryClient.setQueryData(
      [
        "kanban-board-data",
        projectId,
        organizationId,
        options?.boardId || "default",
        options?.includeArchived || false,
        options?.search || "",
      ],
      updater
    );
  };

  // Optimistic updates for common operations
  const optimisticUpdateCard = (cardId: string, updates: any) => {
    updateBoardData((oldData: any) => {
      if (!oldData) return oldData;

      const newLists = oldData.lists.map((list: any) => ({
        ...list,
        cards: list.cards.map((card: any) =>
          card.id === cardId ? { ...card, ...updates } : card
        ),
      }));

      return {
        ...oldData,
        lists: newLists,
        cards: oldData.cards.map((card: any) =>
          card.id === cardId ? { ...card, ...updates } : card
        ),
      };
    });
  };

  const optimisticMoveCard = (
    cardId: string,
    fromListId: string,
    toListId: string,
    newPosition: number
  ) => {
    updateBoardData((oldData: any) => {
      if (!oldData) return oldData;

      // Find the card
      const cardToMove = oldData.cards.find((card: any) => card.id === cardId);
      if (!cardToMove) return oldData;

      // Update card with new list and position
      const updatedCard = {
        ...cardToMove,
        list_id: toListId,
        position: newPosition,
      };

      // Update cards array
      const updatedCards = oldData.cards.map((card: any) =>
        card.id === cardId ? updatedCard : card
      );

      // Update lists with cards
      const updatedLists = oldData.lists.map((list: any) => {
        if (list.id === fromListId) {
          return {
            ...list,
            cards: list.cards.filter((card: any) => card.id !== cardId),
          };
        }
        if (list.id === toListId) {
          const newCards = [
            ...list.cards.filter((card: any) => card.id !== cardId),
            updatedCard,
          ].sort((a, b) => a.position - b.position);
          return {
            ...list,
            cards: newCards,
          };
        }
        return list;
      });

      return {
        ...oldData,
        lists: updatedLists,
        cards: updatedCards,
      };
    });
  };

  const optimisticAddCard = (listId: string, newCard: any) => {
    updateBoardData((oldData: any) => {
      if (!oldData) return oldData;

      const updatedCards = [...oldData.cards, newCard];
      const updatedLists = oldData.lists.map((list: any) =>
        list.id === listId ? { ...list, cards: [...list.cards, newCard] } : list
      );

      return {
        ...oldData,
        lists: updatedLists,
        cards: updatedCards,
      };
    });
  };

  const optimisticDeleteCard = (cardId: string) => {
    updateBoardData((oldData: any) => {
      if (!oldData) return oldData;

      const updatedCards = oldData.cards.filter(
        (card: any) => card.id !== cardId
      );
      const updatedLists = oldData.lists.map((list: any) => ({
        ...list,
        cards: list.cards.filter((card: any) => card.id !== cardId),
      }));

      return {
        ...oldData,
        lists: updatedLists,
        cards: updatedCards,
      };
    });
  };

  return {
    // Query data and state
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Helper functions
    invalidateBoard,
    updateBoardData,

    // Optimistic updates
    optimisticUpdateCard,
    optimisticMoveCard,
    optimisticAddCard,
    optimisticDeleteCard,

    // Derived data for easy access
    project: query.data?.project,
    boards: query.data?.boards || [],
    currentBoard: query.data?.currentBoard,
    lists: query.data?.lists || [],
    cards: query.data?.cards || [],
    labels: query.data?.labels || [],
    projectMembers: query.data?.project?.project_members || [],
    projectName: query.data?.project?.name || "",
  };
};
