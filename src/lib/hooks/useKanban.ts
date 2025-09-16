import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { kanbanAPI } from "@/utils/api/kanban";
import type {
  Board,
  List,
  Card,
  Label,
  Checklist,
  ChecklistItem,
  Comment,
  Attachment,
  Activity,
  CreateBoardData,
  UpdateBoardData,
  CreateListData,
  UpdateListData,
  CreateCardData,
  UpdateCardData,
  CreateLabelData,
  UpdateLabelData,
  CreateChecklistData,
  UpdateChecklistData,
  CreateChecklistItemData,
  UpdateChecklistItemData,
  CreateCommentData,
  UpdateCommentData,
  CreateAttachmentData,
  BulkCardOperation,
  CardPosition,
  ListPosition,
} from "@/utils/api/kanban";

// Query Keys Factory
export const kanbanKeys = {
  all: ["kanban"] as const,
  boards: () => [...kanbanKeys.all, "boards"] as const,
  board: (id: string) => [...kanbanKeys.boards(), id] as const,
  boardsByProject: (projectId: string, orgId: string) =>
    [...kanbanKeys.boards(), "project", projectId, orgId] as const,

  lists: () => [...kanbanKeys.all, "lists"] as const,
  listsByBoard: (boardId: string, orgId: string, includeArchived?: boolean) =>
    [...kanbanKeys.lists(), "board", boardId, orgId, includeArchived] as const,
  list: (id: string) => [...kanbanKeys.lists(), id] as const,

  cards: () => [...kanbanKeys.all, "cards"] as const,
  cardsByList: (
    listId: string,
    orgId: string,
    search?: string,
    includeArchived?: boolean
  ) =>
    [
      ...kanbanKeys.cards(),
      "list",
      listId,
      orgId,
      search,
      includeArchived,
    ] as const,
  cardsByBoard: (
    boardId: string,
    orgId: string,
    search?: string,
    includeArchived?: boolean
  ) =>
    [
      ...kanbanKeys.cards(),
      "board",
      boardId,
      orgId,
      search,
      includeArchived,
    ] as const,
  card: (id: string, orgId: string) =>
    [...kanbanKeys.cards(), id, orgId] as const,

  labels: () => [...kanbanKeys.all, "labels"] as const,
  labelsByBoard: (boardId: string, orgId: string) =>
    [...kanbanKeys.labels(), "board", boardId, orgId] as const,
  label: (id: string) => [...kanbanKeys.labels(), id] as const,

  checklists: () => [...kanbanKeys.all, "checklists"] as const,
  checklistsByCard: (cardId: string, orgId: string) =>
    [...kanbanKeys.checklists(), "card", cardId, orgId] as const,
  checklist: (id: string) => [...kanbanKeys.checklists(), id] as const,

  checklistItems: () => [...kanbanKeys.all, "checklistItems"] as const,
  checklistItem: (id: string) => [...kanbanKeys.checklistItems(), id] as const,

  comments: () => [...kanbanKeys.all, "comments"] as const,
  commentsByCard: (cardId: string, orgId: string) =>
    [...kanbanKeys.comments(), "card", cardId, orgId] as const,
  comment: (id: string) => [...kanbanKeys.comments(), id] as const,

  attachments: () => [...kanbanKeys.all, "attachments"] as const,
  attachmentsByCard: (cardId: string, orgId: string) =>
    [...kanbanKeys.attachments(), "card", cardId, orgId] as const,
  attachment: (id: string) => [...kanbanKeys.attachments(), id] as const,

  activities: () => [...kanbanKeys.all, "activities"] as const,
  activitiesByBoard: (boardId: string, orgId: string) =>
    [...kanbanKeys.activities(), "board", boardId, orgId] as const,
  activitiesByCard: (cardId: string, orgId: string) =>
    [...kanbanKeys.activities(), "card", cardId, orgId] as const,
};

// ===== BOARDS =====

export function useBoards(projectId: string, organizationId: string) {
  return useQuery({
    queryKey: kanbanKeys.boardsByProject(projectId, organizationId),
    queryFn: () => kanbanAPI.getBoards(projectId, organizationId),
    enabled: !!projectId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useBoard(boardId: string, organizationId: string) {
  return useQuery({
    queryKey: kanbanKeys.board(boardId),
    queryFn: () => kanbanAPI.getBoard(boardId),
    enabled: !!boardId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBoardData & { organizationId: string }) =>
      kanbanAPI.createBoard(data),
    onSuccess: (data, variables) => {
      // Invalidate boards list for the project
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.boardsByProject(
          variables.project_id,
          variables.organizationId
        ),
      });

      // Add the new board to cache
      queryClient.setQueryData(kanbanKeys.board(data.board.id), {
        board: data.board,
      });
    },
  });
}

export function useUpdateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateBoardData & { organizationId: string };
    }) => kanbanAPI.updateBoard(id, data),
    onSuccess: (data, variables) => {
      // Update the board in cache
      queryClient.setQueryData(kanbanKeys.board(variables.id), {
        board: data.board,
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.boards(),
        exact: false,
      });
    },
  });
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      organizationId,
    }: {
      id: string;
      organizationId: string;
    }) => kanbanAPI.deleteBoard(id, organizationId),
    onSuccess: (_, variables) => {
      // Remove board from cache
      queryClient.removeQueries({
        queryKey: kanbanKeys.board(variables.id),
      });

      // Invalidate boards list
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.boards(),
        exact: false,
      });

      // Invalidate all related data
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.lists(),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.cards(),
        exact: false,
      });
    },
  });
}

// ===== LISTS =====

export function useLists(
  boardId: string,
  organizationId: string,
  includeArchived = false
) {
  return useQuery({
    queryKey: kanbanKeys.listsByBoard(boardId, organizationId, includeArchived),
    queryFn: () => kanbanAPI.getLists(boardId, organizationId, includeArchived),
    enabled: !!boardId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useListsByBoard(
  boardId: string,
  organizationId: string,
  includeArchived = false
) {
  return useLists(boardId, organizationId, includeArchived);
}

export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateListData & { organizationId: string }) =>
      kanbanAPI.createList(data),
    onSuccess: (data, variables) => {
      // Invalidate lists for the board
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.listsByBoard(
          variables.board_id,
          variables.organizationId
        ),
      });

      // Add the new list to cache
      queryClient.setQueryData(kanbanKeys.list(data.list.id), {
        list: data.list,
      });
    },
  });
}

export function useUpdateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateListData & { organizationId: string };
    }) => kanbanAPI.updateList(id, data),
    onSuccess: (data, variables) => {
      // Update the list in cache
      queryClient.setQueryData(kanbanKeys.list(variables.id), {
        list: data.list,
      });

      // Invalidate lists queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.lists(),
        exact: false,
      });
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      organizationId,
    }: {
      id: string;
      organizationId: string;
    }) => kanbanAPI.deleteList(id, organizationId),
    onSuccess: (_, variables) => {
      // Remove list from cache
      queryClient.removeQueries({
        queryKey: kanbanKeys.list(variables.id),
      });

      // Invalidate lists and cards
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.lists(),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.cards(),
        exact: false,
      });
    },
  });
}

export function useArchiveList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      isArchived,
      organizationId,
    }: {
      listId: string;
      isArchived: boolean;
      organizationId: string;
    }) =>
      kanbanAPI.updateList(listId, { is_archived: isArchived, organizationId }),
    onSuccess: (data, variables) => {
      // Update the list in cache
      queryClient.setQueryData(kanbanKeys.list(variables.listId), data.list);

      // Invalidate lists queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.lists(),
      });
    },
  });
}

export function useReorderLists() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boardId,
      listPositions,
      organizationId,
    }: {
      boardId: string;
      listPositions: ListPosition[];
      organizationId: string;
    }) => kanbanAPI.reorderLists(boardId, listPositions, organizationId),
    onSuccess: (_, variables) => {
      // Invalidate lists for the board
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.listsByBoard(
          variables.boardId,
          variables.organizationId
        ),
      });
    },
  });
}

// ===== CARDS =====

export function useCardsByList(
  listId: string,
  organizationId: string,
  search?: string,
  includeArchived = false
) {
  return useQuery({
    queryKey: kanbanKeys.cardsByList(
      listId,
      organizationId,
      search,
      includeArchived
    ),
    queryFn: () =>
      kanbanAPI.getCardsByList(listId, organizationId, search, includeArchived),
    enabled: !!listId && !!organizationId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useCardsByBoard(
  boardId: string,
  organizationId: string,
  search?: string,
  includeArchived = false
) {
  return useQuery({
    queryKey: kanbanKeys.cardsByBoard(
      boardId,
      organizationId,
      search,
      includeArchived
    ),
    queryFn: () =>
      kanbanAPI.getCardsByBoard(
        boardId,
        organizationId,
        search,
        includeArchived
      ),
    enabled: !!boardId && !!organizationId,
    staleTime: 1 * 60 * 1000,
    gcTime: 3 * 60 * 1000,
  });
}

export function useCard(cardId: string, organizationId: string) {
  return useQuery({
    queryKey: kanbanKeys.card(cardId, organizationId),
    queryFn: () => kanbanAPI.getCard(cardId, organizationId),
    enabled: !!cardId && !!organizationId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCardData & { organizationId: string }) =>
      kanbanAPI.createCard(data),
    onSuccess: (data, variables) => {
      // Invalidate cards for the list
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.cardsByList(
          variables.list_id,
          variables.organizationId
        ),
      });

      // Invalidate cards for the board (if we know the board ID)
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.cardsByBoard("", variables.organizationId),
        exact: false,
      });

      // Add the new card to cache
      queryClient.setQueryData(
        kanbanKeys.card(data.card.id, variables.organizationId),
        { card: data.card }
      );
    },
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCardData & { organizationId: string };
    }) => kanbanAPI.updateCard(id, data),
    onSuccess: (data, variables) => {
      // Update the card in cache
      queryClient.setQueryData(
        kanbanKeys.card(variables.id, variables.data.organizationId),
        { card: data.card }
      );

      // Invalidate cards queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.cards(),
        exact: false,
      });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      organizationId,
    }: {
      id: string;
      organizationId: string;
    }) => kanbanAPI.deleteCard(id, organizationId),
    onSuccess: (_, variables) => {
      // Remove card from cache
      queryClient.removeQueries({
        queryKey: kanbanKeys.card(variables.id, variables.organizationId),
      });

      // Invalidate cards queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.cards(),
        exact: false,
      });
    },
  });
}

export function useArchiveCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cardId,
      isArchived,
      organizationId,
    }: {
      cardId: string;
      isArchived: boolean;
      organizationId: string;
    }) =>
      kanbanAPI.updateCard(cardId, { is_archived: isArchived, organizationId }),
    onSuccess: (data, variables) => {
      // Update the card in cache
      queryClient.setQueryData(
        kanbanKeys.card(variables.cardId, variables.organizationId),
        data.card
      );

      // Invalidate cards queries to refresh the card
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.cards(),
      });
    },
  });
}

export function useReorderCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      cardPositions,
      organizationId,
    }: {
      listId: string;
      cardPositions: CardPosition[];
      organizationId: string;
    }) => kanbanAPI.reorderCards(listId, cardPositions, organizationId),
    onSuccess: (_, variables) => {
      // Invalidate cards for the list
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.cardsByList(
          variables.listId,
          variables.organizationId
        ),
      });
    },
  });
}

export function useBulkCardOperations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkCardOperation) => kanbanAPI.bulkCardOperations(data),
    onSuccess: () => {
      // Invalidate all cards queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.cards(),
        exact: false,
      });
    },
  });
}

// ===== LABELS =====

export function useLabels(boardId: string, organizationId: string) {
  return useQuery({
    queryKey: kanbanKeys.labelsByBoard(boardId, organizationId),
    queryFn: () => kanbanAPI.getLabels(boardId, organizationId),
    enabled: !!boardId && !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLabelData & { organizationId: string }) =>
      kanbanAPI.createLabel(data),
    onSuccess: (data, variables) => {
      // Invalidate labels for the board
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.labelsByBoard(
          variables.board_id,
          variables.organizationId
        ),
      });

      // Add the new label to cache
      queryClient.setQueryData(kanbanKeys.label(data.label.id), {
        label: data.label,
      });
    },
  });
}

export function useUpdateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLabelData }) =>
      kanbanAPI.updateLabel(id, data),
    onSuccess: (data, variables) => {
      // Update the label in cache
      queryClient.setQueryData(kanbanKeys.label(variables.id), {
        label: data.label,
      });

      // Invalidate labels queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.labels(),
        exact: false,
      });
    },
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => kanbanAPI.deleteLabel(id),
    onSuccess: (_, variables) => {
      // Remove label from cache
      queryClient.removeQueries({
        queryKey: kanbanKeys.label(variables),
      });

      // Invalidate labels and cards queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.labels(),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.cards(),
        exact: false,
      });
    },
  });
}

// ===== CHECKLISTS =====

export function useChecklists(cardId: string, organizationId: string) {
  return useQuery({
    queryKey: kanbanKeys.checklistsByCard(cardId, organizationId),
    queryFn: () => kanbanAPI.getChecklists(cardId, organizationId),
    enabled: !!cardId && !!organizationId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChecklistData) => kanbanAPI.createChecklist(data),
    onSuccess: (data, variables) => {
      // Invalidate checklists for the card
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.checklistsByCard(
          variables.card_id,
          variables.organizationId
        ),
      });

      // Add the new checklist to cache
      queryClient.setQueryData(kanbanKeys.checklist(data.checklist.id), {
        checklist: data.checklist,
      });
    },
  });
}

export function useUpdateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChecklistData }) =>
      kanbanAPI.updateChecklist(id, data),
    onSuccess: (data, variables) => {
      // Update the checklist in cache
      queryClient.setQueryData(kanbanKeys.checklist(variables.id), {
        checklist: data.checklist,
      });

      // Invalidate checklists queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.checklists(),
        exact: false,
      });
    },
  });
}

export function useDeleteChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => kanbanAPI.deleteChecklist(id),
    onSuccess: (_, variables) => {
      // Remove checklist from cache
      queryClient.removeQueries({
        queryKey: kanbanKeys.checklist(variables),
      });

      // Invalidate checklists queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.checklists(),
        exact: false,
      });
    },
  });
}

// ===== CHECKLIST ITEMS =====

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChecklistItemData) =>
      kanbanAPI.createChecklistItem(data),
    onSuccess: (data, variables) => {
      // Invalidate checklists for the card
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.checklistsByCard(
          variables.checklist_id,
          variables.organizationId
        ),
      });

      // Add the new checklist item to cache
      queryClient.setQueryData(
        kanbanKeys.checklistItem(data.checklist_item.id),
        { checklist_item: data.checklist_item }
      );
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChecklistItemData }) =>
      kanbanAPI.updateChecklistItem(id, data),
    onSuccess: (data, variables) => {
      // Update the checklist item in cache
      queryClient.setQueryData(kanbanKeys.checklistItem(variables.id), {
        checklist_item: data.checklist_item,
      });

      // Invalidate checklists queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.checklists(),
        exact: false,
      });
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => kanbanAPI.deleteChecklistItem(id),
    onSuccess: (_, variables) => {
      // Remove checklist item from cache
      queryClient.removeQueries({
        queryKey: kanbanKeys.checklistItem(variables),
      });

      // Invalidate checklists queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.checklists(),
        exact: false,
      });
    },
  });
}

// ===== COMMENTS =====

export function useComments(cardId: string, organizationId: string) {
  return useQuery({
    queryKey: kanbanKeys.commentsByCard(cardId, organizationId),
    queryFn: () => kanbanAPI.getComments(cardId, organizationId),
    enabled: !!cardId && !!organizationId,
    staleTime: 1 * 60 * 1000,
    gcTime: 3 * 60 * 1000,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentData) => kanbanAPI.createComment(data),
    onSuccess: (data, variables) => {
      // Invalidate comments for the card
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.commentsByCard(
          variables.card_id,
          variables.organizationId
        ),
      });

      // Add the new comment to cache
      queryClient.setQueryData(kanbanKeys.comment(data.comment.id), {
        comment: data.comment,
      });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCommentData }) =>
      kanbanAPI.updateComment(id, data),
    onSuccess: (data, variables) => {
      // Update the comment in cache
      queryClient.setQueryData(kanbanKeys.comment(variables.id), {
        comment: data.comment,
      });

      // Invalidate comments queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.comments(),
        exact: false,
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => kanbanAPI.deleteComment(id),
    onSuccess: (_, variables) => {
      // Remove comment from cache
      queryClient.removeQueries({
        queryKey: kanbanKeys.comment(variables),
      });

      // Invalidate comments queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.comments(),
        exact: false,
      });
    },
  });
}

// ===== ATTACHMENTS =====

export function useAttachments(cardId: string, organizationId: string) {
  return useQuery({
    queryKey: kanbanKeys.attachmentsByCard(cardId, organizationId),
    queryFn: () => kanbanAPI.getAttachments(cardId, organizationId),
    enabled: !!cardId && !!organizationId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAttachmentData) =>
      kanbanAPI.createAttachment(data),
    onSuccess: (data, variables) => {
      // Invalidate attachments for the card
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.attachmentsByCard(
          variables.card_id,
          variables.organizationId
        ),
      });

      // Add the new attachment to cache
      queryClient.setQueryData(kanbanKeys.attachment(data.attachment.id), {
        attachment: data.attachment,
      });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => kanbanAPI.deleteAttachment(id),
    onSuccess: (_, variables) => {
      // Remove attachment from cache
      queryClient.removeQueries({
        queryKey: kanbanKeys.attachment(variables),
      });

      // Invalidate attachments queries
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.attachments(),
        exact: false,
      });
    },
  });
}

// ===== ACTIVITIES =====

export function useActivitiesByBoard(
  boardId: string,
  organizationId: string,
  limit = 50
) {
  return useInfiniteQuery({
    queryKey: kanbanKeys.activitiesByBoard(boardId, organizationId),
    queryFn: ({ pageParam = 0 }) =>
      kanbanAPI.getActivitiesByBoard(boardId, limit, pageParam),
    enabled: !!boardId && !!organizationId,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.has_more) {
        return lastPage.pagination.offset + lastPage.pagination.limit;
      }
      return undefined;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useActivitiesByCard(
  cardId: string,
  organizationId: string,
  limit = 50
) {
  return useInfiniteQuery({
    queryKey: kanbanKeys.activitiesByCard(cardId, organizationId),
    queryFn: ({ pageParam = 0 }) =>
      kanbanAPI.getActivitiesByCard(cardId, limit, pageParam, organizationId),
    enabled: !!cardId && !!organizationId,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.has_more) {
        return lastPage.pagination.offset + lastPage.pagination.limit;
      }
      return undefined;
    },
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

// ===== OPTIMISTIC UPDATES HELPERS =====

export function useOptimisticCardUpdate() {
  const queryClient = useQueryClient();

  return {
    updateCardOptimistically: (
      cardId: string,
      organizationId: string,
      updates: Partial<Card>
    ) => {
      const queryKey = kanbanKeys.card(cardId, organizationId);
      const previousData = queryClient.getQueryData(queryKey);

      if (previousData) {
        queryClient.setQueryData(queryKey, {
          ...previousData,
          card: { ...(previousData as any).card, ...updates },
        });
      }

      // Also update in lists
      queryClient.setQueriesData(
        { queryKey: kanbanKeys.cards(), exact: false },
        (oldData: any) => {
          if (oldData?.cards) {
            return {
              ...oldData,
              cards: oldData.cards.map((card: Card) =>
                card.id === cardId ? { ...card, ...updates } : card
              ),
            };
          }
          return oldData;
        }
      );
    },

    revertCardUpdate: (cardId: string, organizationId: string) => {
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.card(cardId, organizationId),
      });
    },
  };
}

export function useOptimisticListUpdate() {
  const queryClient = useQueryClient();

  return {
    updateListOptimistically: (listId: string, updates: Partial<List>) => {
      const queryKey = kanbanKeys.list(listId);
      const previousData = queryClient.getQueryData(queryKey);

      if (previousData) {
        queryClient.setQueryData(queryKey, {
          ...previousData,
          list: { ...(previousData as any).list, ...updates },
        });
      }

      // Also update in boards
      queryClient.setQueriesData(
        { queryKey: kanbanKeys.lists(), exact: false },
        (oldData: any) => {
          if (oldData?.lists) {
            return {
              ...oldData,
              lists: oldData.lists.map((list: List) =>
                list.id === listId ? { ...list, ...updates } : list
              ),
            };
          }
          return oldData;
        }
      );
    },

    revertListUpdate: (listId: string) => {
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.list(listId),
      });
    },
  };
}
