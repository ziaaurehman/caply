"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  ChevronDown,
  Plus,
  Settings,
  Users,
  Filter,
  Search,
  Bell,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { kanbanAPI } from "@/utils/api/kanban";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import KanbanColumn from "./KanbanColumn";
import AddTaskModal from "./AddTaskModal";
import {
  List,
  Card,
  ProjectMember,
  KanbanState,
  DragState,
  CardModalState,
  BackgroundOption,
} from "./types";
import { useKanbanBoard } from "@/lib/hooks/useKanbanBoard";

import CardDetailModal from "./CardDetailModal";
import KanbanSkeleton from "./KanbanSkeleton";
import AddListModal from "./AddListModal";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface KanbanPageProps {
  projectId: string;
}

export default function KanbanBoard({ projectId }: KanbanPageProps) {
  const {
    currentOrganization,
    loading: organizationLoading,
    fetchUserOrganizations,
    userOrganizations,
  } = useOrganizationStore();
  const queryClient = useQueryClient();

  // Main state
  const [kanbanState, setKanbanState] = useState<KanbanState>({
    boards: [],
    currentBoard: null,
    lists: [],
    isLoading: false,
    error: null,
  });

  const [isAddListModalOpen, setIsAddListModalOpen] = useState(false);

  // UI state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedCard: null,
    sourceListId: null,
    targetListId: null,
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [showArchived, setShowArchived] = useState<boolean>(false);

  const [cardModal, setCardModal] = useState<CardModalState>({
    isOpen: false,
    card: null,
    mode: "view",
  });

  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const [selectedAssignee, setSelectedAssignee] = useState("all");

  // Background customization
  const [backgroundDropdownOpen, setBackgroundDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"images" | "colors">("images");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listReorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listReorderAbortControllerRef = useRef<AbortController | null>(null);
  const [isListReordering, setIsListReordering] = useState(false);

  const {
    data: boardData,
    isLoading: boardLoading,
    isError: boardError,
    error: boardErrorMessage,
    refetch: refetchBoard,
    isFetching: boardFetching,

    // Derived data
    project,
    boards,
    currentBoard,
    lists,
    cards,
    labels,
    projectMembers,
    projectName,

    // Optimistic updates
    optimisticUpdateCard,
    optimisticMoveCard,
    optimisticAddCard,
    optimisticDeleteCard,
    invalidateBoard,
  } = useKanbanBoard(projectId, currentOrganization?.id, {
    includeArchived: showArchived,
    search: debouncedSearchTerm,
  });

  console.log("boardData", boardData);

  useEffect(() => {
    if (boardData) {
      setKanbanState({
        boards: boards,
        currentBoard: currentBoard || null,
        lists: lists,
        isLoading: false,
        error: null,
      });
    }
  }, [boardData, boards, currentBoard, lists]);

  // Handle loading and error states
  useEffect(() => {
    setKanbanState((prev) => ({
      ...prev,
      isLoading: boardLoading,
      error: boardError
        ? boardErrorMessage?.message || "Failed to load board data"
        : null,
    }));
  }, [boardLoading, boardError, boardErrorMessage]);

  // List Drag & Drop State
  const [listDragState, setListDragState] = useState<{
    isDragging: boolean;
    draggedListId: string | null;
    dragOverListId: string | null;
  }>({
    isDragging: false,
    draggedListId: null,
    dragOverListId: null,
  });

  const [cardDragState, setCardDragState] = useState<{
    isDragging: boolean;
    draggedCardId: string | null;
    dragOverCardId: string | null;
    sourceListId: string | null;
  }>({
    isDragging: false,
    draggedCardId: null,
    dragOverCardId: null,
    sourceListId: null,
  });

  const dragStateRef = useRef(listDragState);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardReorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardReorderAbortControllerRef = useRef<AbortController | null>(null);
  const [isCardReordering, setIsCardReordering] = useState(false);

  // Background options
  const backgroundImages: BackgroundOption[] = [
    {
      type: "image",
      value: "/kanban/blue-preview.jpg",
      name: "Blue",
      preview: "/kanban/blue-preview.jpg",
    },
    {
      type: "image",
      value: "/kanban/dark-preview.jpg",
      name: "Dark",
      preview: "/kanban/dark-preview.jpg",
    },
    {
      type: "image",
      value: "/kanban/landscape-preview.jpg",
      name: "Landscape",
      preview: "/kanban/landscape-preview.jpg",
    },
    {
      type: "image",
      value: "/kanban/nature-preview.jpg",
      name: "Nature",
      preview: "/kanban/nature-preview.jpg",
    },
  ];

  const backgroundColors: BackgroundOption[] = [
    { type: "color", value: "#ffffff", name: "White" },
    { type: "color", value: "#f3f4f6", name: "Light Gray" },
    { type: "color", value: "#ffedd5", name: "Orange" },
    { type: "color", value: "#e0f2fe", name: "Sky Blue" },
    { type: "color", value: "#d1fae5", name: "Emerald" },
    { type: "color", value: "#ede9fe", name: "Purple" },
    { type: "color", value: "#e2e8f0", name: "Slate" },
    { type: "color", value: "#1e293b", name: "Dark Gray" },
  ];

  useEffect(() => {
    if (!organizationLoading && userOrganizations.length === 0) {
      fetchUserOrganizations();
    }
  }, [organizationLoading, userOrganizations.length, fetchUserOrganizations]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setBackgroundDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent, card: Card) => {
      // Find the source list ID by searching for the card in our current state
      let sourceListId = null;
      for (const list of kanbanState.lists) {
        const foundCard = (list.cards || []).find((c) => c.id === card.id);
        if (foundCard) {
          sourceListId = list.id;
          break;
        }
      }

      setDragState({
        isDragging: true,
        draggedCard: card,
        sourceListId: sourceListId,
        targetListId: null,
      });

      setCardDragState({
        isDragging: true,
        draggedCardId: card.id,
        dragOverCardId: null,
        sourceListId: sourceListId,
      });

      e.dataTransfer.setData("cardId", card.id);
      e.dataTransfer.setData("sourceListId", sourceListId || "");
      e.dataTransfer.setData("dragType", "card");
    },
    [kanbanState.lists]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Add card drag leave handler
  const handleCardDragLeave = useCallback((e: React.DragEvent) => {
    // Only reset if we're leaving the card area completely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setCardDragState((prev) => ({
        ...prev,
        dragOverCardId: null,
      }));
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetListId: string) => {
      e.preventDefault();

      const dragType = e.dataTransfer.getData("dragType");
      const cardId = e.dataTransfer.getData("cardId");
      let sourceListId = e.dataTransfer.getData("sourceListId");

      // Only handle card drops
      if (dragType !== "card") {
        return;
      }

      // Fallback: if sourceListId is empty or undefined, use the drag state
      if (!sourceListId || sourceListId === "undefined") {
        sourceListId = dragState.sourceListId || "";
      }

      if (cardId && sourceListId && sourceListId !== targetListId) {
        if (!currentOrganization?.id) return;

        // Find the card being moved - more explicit approach
        let cardToMove = null;
        let sourceList = null;

        for (const list of kanbanState.lists) {
          const foundCard = (list.cards || []).find(
            (card) => card.id === cardId
          );
          if (foundCard) {
            cardToMove = foundCard;
            sourceList = list;
            break;
          }
        }

        if (!cardToMove) {
          console.warn("Card not found:", cardId);
          console.log(
            "Available cards:",
            kanbanState.lists
              .flatMap((l) => l.cards || [])
              .map((c) => ({ id: c.id, title: c.title }))
          );
          return;
        }

        // Store original state for potential rollback
        const originalLists = JSON.parse(JSON.stringify(kanbanState.lists));

        // OPTIMISTIC UPDATE: Immediately move the card in the UI
        console.log("Starting optimistic update...");

        // Force immediate state update
        setKanbanState((prevState) => {
          const newLists = prevState.lists.map((list) => {
            if (list.id === sourceListId) {
              // Remove from source list
              const cardsWithoutMoved = (list.cards || []).filter(
                (card) => card.id !== cardId
              );
              console.log(
                `Removing card ${cardId} from ${list.name}, cards left: ${cardsWithoutMoved.length}`
              );
              return { ...list, cards: cardsWithoutMoved };
            }
            if (list.id === targetListId) {
              // Add to target list
              const movedCard = { ...cardToMove, list_id: targetListId };
              const cardsWithMoved = [...(list.cards || []), movedCard];
              console.log(
                `Adding card ${cardId} to ${list.name}, total cards: ${cardsWithMoved.length}`
              );
              return { ...list, cards: cardsWithMoved };
            }
            return list;
          });

          console.log("Optimistic update completed");
          return { ...prevState, lists: newLists };
        });

        // Make API call in the background after a small delay to ensure UI update
        setTimeout(async () => {
          try {
            console.log("Making API call to update card...");
            await kanbanAPI.updateCard(cardId, {
              list_id: targetListId,
              organizationId: currentOrganization.id,
            });
            console.log("API call successful - card moved");
            // Invalidate query to refresh data
            invalidateBoard();
          } catch (error) {
            console.error("Error moving card:", error);

            // ROLLBACK: Revert the optimistic update on failure
            console.log("Rolling back to original state");
            setKanbanState((prev) => ({
              ...prev,
              lists: originalLists,
            }));

            // Show error toast
            toast.error("Failed to move card. Please try again.");
          }
        }, 0);
      }

      // Reset all drag states
      setDragState({
        isDragging: false,
        draggedCard: null,
        sourceListId: null,
        targetListId: null,
      });

      setCardDragState({
        isDragging: false,
        draggedCardId: null,
        dragOverCardId: null,
        sourceListId: null,
      });
    },
    [
      kanbanState.lists,
      currentOrganization?.id,
      dragState.sourceListId,
      invalidateBoard,
    ]
  );

  // Board management
  const updateBoardBackground = async (
    backgroundType: "image" | "color",
    value: string
  ) => {
    if (!kanbanState.currentBoard || !currentOrganization?.id) return;

    try {
      const updateData =
        backgroundType === "image"
          ? { background_image: value, background_color: undefined }
          : { background_color: value, background_image: undefined };

      const updatedBoard = await kanbanAPI.updateBoard(
        kanbanState.currentBoard.id,
        {
          ...updateData,
          organizationId: currentOrganization.id,
        }
      );

      setKanbanState((prev) => ({
        ...prev,
        currentBoard: updatedBoard.board,
        // boards: prev.boards.map((board) =>
        //   board.id === updatedBoard.board.id ? updatedBoard.board : board
        // ),
      }));

      setBackgroundDropdownOpen(false);
      // Invalidate query to refresh data
      invalidateBoard();
    } catch (error) {
      console.error("Error updating board background:", error);
    }
  };

  useEffect(() => {
    dragStateRef.current = listDragState;
  }, [listDragState]);

  const handleListDragStart = useCallback(
    (e: React.DragEvent, list: List) => {
      console.log("List drag start:", list.name);

      // Clear any existing timeout
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      setListDragState({
        isDragging: true,
        draggedListId: list.id,
        dragOverListId: null,
      });

      e.dataTransfer.setData("listId", list.id);
      e.dataTransfer.setData("listPosition", list.position.toString());
      e.dataTransfer.setData("dragType", "list");
      e.dataTransfer.effectAllowed = "move";

      // Set a shorter timeout to reset drag state if drag end doesn't fire
      dragTimeoutRef.current = setTimeout(() => {
        if (
          dragStateRef.current.isDragging &&
          dragStateRef.current.draggedListId === list.id
        ) {
          console.log("Drag timeout (5s) - forcing drag state reset");
          setListDragState({
            isDragging: false,
            draggedListId: null,
            dragOverListId: null,
          });
        }
      }, 5000);
    },
    [listDragState.isDragging, listDragState.draggedListId]
  );

  const handleCardDrop = useCallback(
    async (e: React.DragEvent, targetCard: Card) => {
      e.preventDefault();

      const dragType = e.dataTransfer.getData("dragType");
      const draggedCardId = e.dataTransfer.getData("cardId");
      const sourceListId =
        e.dataTransfer.getData("sourceListId") || cardDragState.sourceListId;

      // Only handle card drops
      if (dragType !== "card" || !draggedCardId || !sourceListId) {
        setCardDragState({
          isDragging: false,
          draggedCardId: null,
          dragOverCardId: null,
          sourceListId: null,
        });
        return;
      }

      // Find the target list
      const targetList = kanbanState.lists.find((list) =>
        list.cards?.some((card) => card.id === targetCard.id)
      );

      if (!targetList) {
        console.warn("Target list not found");
        setCardDragState({
          isDragging: false,
          draggedCardId: null,
          dragOverCardId: null,
          sourceListId: null,
        });
        return;
      }

      // If it's the same list, handle reordering
      if (sourceListId === targetList.id && draggedCardId !== targetCard.id) {
        if (!currentOrganization?.id) {
          setCardDragState({
            isDragging: false,
            draggedCardId: null,
            dragOverCardId: null,
            sourceListId: null,
          });
          return;
        }

        // Store original state for potential rollback
        const originalLists = JSON.parse(JSON.stringify(kanbanState.lists));

        try {
          console.log(
            `Reordering card ${draggedCardId} to position of ${targetCard.id}`
          );

          // Find current positions
          const cards = targetList.cards || [];
          const draggedCard = cards.find((c) => c.id === draggedCardId);
          const targetCardIndex = cards.findIndex(
            (c) => c.id === targetCard.id
          );

          if (!draggedCard || targetCardIndex === -1) {
            console.warn("Card not found for reordering");
            setCardDragState({
              isDragging: false,
              draggedCardId: null,
              dragOverCardId: null,
              sourceListId: null,
            });
            return;
          }

          // Create new card order with optimistic update
          const newCards = [...cards];
          const draggedIndex = newCards.findIndex(
            (c) => c.id === draggedCardId
          );

          // Remove dragged card and insert at target position
          const [removed] = newCards.splice(draggedIndex, 1);
          newCards.splice(targetCardIndex, 0, removed);

          // Update positions
          const updatedCards = newCards.map((card, index) => ({
            ...card,
            position: index,
          }));

          // OPTIMISTIC UPDATE: Immediately update the UI
          setKanbanState((prev) => ({
            ...prev,
            lists: prev.lists.map((list) =>
              list.id === targetList.id
                ? { ...list, cards: updatedCards }
                : list
            ),
          }));

          // Set reordering state
          setIsCardReordering(true);

          // Prepare API payload
          const cardPositions = updatedCards.map((card) => ({
            card_id: card.id,
            position: card.position,
          }));

          // Create new abort controller for this request
          cardReorderAbortControllerRef.current = new AbortController();

          // Debounced API call with cancellation support
          cardReorderTimeoutRef.current = setTimeout(async () => {
            try {
              console.log("Making debounced API call to reorder cards...");

              // Check if request was cancelled
              if (cardReorderAbortControllerRef.current?.signal.aborted) {
                console.log("Card reorder request was cancelled");
                return;
              }

              await kanbanAPI.reorderCards(
                targetList.id,
                cardPositions,
                currentOrganization.id
              );

              console.log("Card reorder API call successful");
              toast.success("Cards reordered successfully!");
              // Invalidate query to refresh data
              invalidateBoard();
            } catch (error: any) {
              // Don't show error if request was cancelled
              if (error.name === "AbortError") {
                console.log("Card reorder request was cancelled");
                return;
              }

              console.error("Error reordering cards:", error);
              toast.error("Failed to reorder cards");

              // ROLLBACK: Revert the optimistic update on failure
              console.log("Rolling back card reorder to original state");
              setKanbanState((prev) => ({
                ...prev,
                lists: originalLists,
              }));
            } finally {
              setIsCardReordering(false);
              cardReorderAbortControllerRef.current = null;
            }
          }, 300); // 300ms debounce delay
        } catch (error) {
          console.error("Error in card reorder logic:", error);
          toast.error("Failed to reorder cards");

          // ROLLBACK: Revert the optimistic update on failure
          setKanbanState((prev) => ({
            ...prev,
            lists: originalLists,
          }));

          setIsCardReordering(false);
        }
      }

      // Reset card drag state
      setCardDragState({
        isDragging: false,
        draggedCardId: null,
        dragOverCardId: null,
        sourceListId: null,
      });
    },
    [
      kanbanState.lists,
      currentOrganization?.id,
      cardDragState.sourceListId,
      isCardReordering,
      invalidateBoard,
    ]
  );

  const handleListDragOver = useCallback(
    (e: React.DragEvent, targetListId: string) => {
      e.preventDefault();

      // Only handle list drag over if it's a list being dragged
      const dragType = e.dataTransfer.types.includes("text/plain")
        ? e.dataTransfer.getData("dragType")
        : null;

      if (dragType === "list") {
        e.dataTransfer.dropEffect = "move";
        setListDragState((prev) => ({
          ...prev,
          dragOverListId: targetListId,
        }));
      }
    },
    []
  );

  const handleListDragLeave = useCallback(() => {
    setListDragState((prev) => ({
      ...prev,
      dragOverListId: null,
    }));
  }, []);

  // Force reset function for debugging
  const forceResetDragState = useCallback(() => {
    console.log("Force resetting drag state");
    setListDragState({
      isDragging: false,
      draggedListId: null,
      dragOverListId: null,
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragStateRef.current.isDragging) {
        console.log("Escape key pressed - resetting drag state");
        forceResetDragState();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [forceResetDragState]);

  const handleListDrop = useCallback(
    async (e: React.DragEvent, targetListId: string) => {
      e.preventDefault();

      const dragType = e.dataTransfer.getData("dragType");
      const draggedListId = e.dataTransfer.getData("listId");

      // Only handle list drops
      if (
        dragType !== "list" ||
        !draggedListId ||
        draggedListId === targetListId ||
        !currentOrganization?.id ||
        isListReordering // Prevent multiple simultaneous reorders
      ) {
        setListDragState({
          isDragging: false,
          draggedListId: null,
          dragOverListId: null,
        });
        return;
      }

      // Cancel any pending reorder operation
      if (listReorderAbortControllerRef.current) {
        listReorderAbortControllerRef.current.abort();
      }

      // Clear any pending timeout
      if (listReorderTimeoutRef.current) {
        clearTimeout(listReorderTimeoutRef.current);
      }

      // Store original state for potential rollback
      const originalLists = JSON.parse(JSON.stringify(kanbanState.lists));

      try {
        console.log(
          `Moving list ${draggedListId} to position of ${targetListId}`
        );

        // Find current positions
        const lists = kanbanState.lists;
        const draggedList = lists.find((l) => l.id === draggedListId);
        const targetList = lists.find((l) => l.id === targetListId);

        if (!draggedList || !targetList) {
          // Reset drag state if lists not found
          setListDragState({
            isDragging: false,
            draggedListId: null,
            dragOverListId: null,
          });
          return;
        }

        // Create new list order with optimistic update
        const newLists = [...lists];
        const draggedIndex = newLists.findIndex((l) => l.id === draggedListId);
        const targetIndex = newLists.findIndex((l) => l.id === targetListId);

        // Remove dragged list and insert at target position
        const [removed] = newLists.splice(draggedIndex, 1);
        newLists.splice(targetIndex, 0, removed);

        // Update positions
        const updatedLists = newLists.map((list, index) => ({
          ...list,
          position: index,
        }));

        // OPTIMISTIC UPDATE: Immediately update the UI
        setKanbanState((prev) => ({
          ...prev,
          lists: updatedLists,
        }));

        // Set reordering state
        setIsListReordering(true);

        // Prepare API payload
        const listPositions = updatedLists.map((list) => ({
          list_id: list.id,
          position: list.position,
        }));

        // Create new abort controller for this request
        listReorderAbortControllerRef.current = new AbortController();

        // Debounced API call with cancellation support
        listReorderTimeoutRef.current = setTimeout(async () => {
          try {
            console.log("Making debounced API call to reorder lists...");

            // Check if request was cancelled
            if (listReorderAbortControllerRef.current?.signal.aborted) {
              console.log("List reorder request was cancelled");
              return;
            }

            await kanbanAPI.reorderLists(
              kanbanState.currentBoard!.id,
              listPositions,
              currentOrganization.id
            );

            console.log("List reorder API call successful");
            toast.success("List reordered successfully!");
            // Invalidate query to refresh data
            invalidateBoard();
          } catch (error: any) {
            // Don't show error if request was cancelled
            if (error.name === "AbortError") {
              console.log("List reorder request was cancelled");
              return;
            }

            console.error("Error reordering lists:", error);
            toast.error("Failed to reorder list");

            // ROLLBACK: Revert the optimistic update on failure
            console.log("Rolling back list reorder to original state");
            setKanbanState((prev) => ({
              ...prev,
              lists: originalLists,
            }));
          } finally {
            setIsListReordering(false);
            listReorderAbortControllerRef.current = null;
          }
        }, 300); // 300ms debounce delay
      } catch (error) {
        console.error("Error in list reorder logic:", error);
        toast.error("Failed to reorder list");

        // ROLLBACK: Revert the optimistic update on failure
        setKanbanState((prev) => ({
          ...prev,
          lists: originalLists,
        }));

        setIsListReordering(false);
      } finally {
        setListDragState({
          isDragging: false,
          draggedListId: null,
          dragOverListId: null,
        });
      }
    },
    [
      kanbanState.lists,
      kanbanState.currentBoard,
      currentOrganization?.id,
      isListReordering,
    ]
  );

  useEffect(() => {
    return () => {
      if (listReorderTimeoutRef.current) {
        clearTimeout(listReorderTimeoutRef.current);
      }
      if (listReorderAbortControllerRef.current) {
        listReorderAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handleListArchive = useCallback(
    async (listId: string, isArchived: boolean) => {
      if (!currentOrganization?.id) return;

      // Store original state for potential rollback
      const originalLists = JSON.parse(JSON.stringify(kanbanState.lists));

      try {
        console.log(
          `${isArchived ? "Archiving" : "Unarchiving"} list:`,
          listId
        );

        // Optimistic update
        setKanbanState((prev) => ({
          ...prev,
          lists: prev.lists.map((list) =>
            list.id === listId ? { ...list, is_archived: isArchived } : list
          ),
        }));

        // Make API call in the background
        setTimeout(async () => {
          try {
            await kanbanAPI.updateList(listId, {
              is_archived: isArchived,
              organizationId: currentOrganization.id,
            });

            toast.success(
              `List ${isArchived ? "archived" : "unarchived"} successfully!`
            );
            // Invalidate query to refresh data
            invalidateBoard();
          } catch (error) {
            console.error("Error archiving/unarchiving list:", error);
            toast.error(
              `Failed to ${isArchived ? "archive" : "unarchive"} list`
            );

            // ROLLBACK: Revert the optimistic update on failure
            setKanbanState((prev) => ({
              ...prev,
              lists: originalLists,
            }));
          }
        }, 0);

        // No need to refetch data since optimistic update already handled the UI
      } catch (error) {
        console.error("Error archiving/unarchiving list:", error);
        toast.error(`Failed to ${isArchived ? "archive" : "unarchive"} list`);

        // ROLLBACK: Revert the optimistic update on failure
        setKanbanState((prev) => ({
          ...prev,
          lists: originalLists,
        }));
      }
    },
    [currentOrganization?.id]
  );

  const handleAddList = () => {
    setIsAddListModalOpen(true);
  };

  const handleSaveList = async (listName: string) => {
    if (!kanbanState.currentBoard || !currentOrganization?.id) return;

    // Store original state for potential rollback
    const originalLists = JSON.parse(JSON.stringify(kanbanState.lists));

    try {
      // Create a temporary list for optimistic update
      const tempList = {
        id: `temp-${Date.now()}`, // Temporary ID
        board_id: kanbanState.currentBoard.id,
        name: listName,
        position: kanbanState.lists.length,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cards: [],
      };

      // OPTIMISTIC UPDATE: Add the temporary list immediately
      setKanbanState((prev) => ({
        ...prev,
        lists: [...prev.lists, tempList],
      }));

      // Make API call in the background
      setTimeout(async () => {
        try {
          const response = await kanbanAPI.createList({
            board_id: kanbanState.currentBoard!.id,
            name: listName,
            organizationId: currentOrganization.id,
          });

          // Replace the temporary list with the real one
          setKanbanState((prev) => ({
            ...prev,
            lists: prev.lists.map((list) =>
              list.id === tempList.id ? response.list : list
            ),
          }));

          toast.success("List created successfully!");
          // Invalidate query to refresh data
          invalidateBoard();
        } catch (error) {
          console.error("Error creating list:", error);
          toast.error("Failed to create list");

          // ROLLBACK: Remove the temporary list
          setKanbanState((prev) => ({
            ...prev,
            lists: originalLists,
          }));
        }
      }, 0);
    } catch (error) {
      console.error("Error in add list logic:", error);
      toast.error("Failed to create list");

      // ROLLBACK: Revert the optimistic update on failure
      setKanbanState((prev) => ({
        ...prev,
        lists: originalLists,
      }));
    }
  };

  useEffect(() => {
    const handleGlobalDragEnd = (e: DragEvent) => {
      console.log("Global drag end detected");

      // Reset card drag state
      setDragState({
        isDragging: false,
        draggedCard: null,
        sourceListId: null,
        targetListId: null,
      });

      // Reset list drag state
      setListDragState({
        isDragging: false,
        draggedListId: null,
        dragOverListId: null,
      });

      // Reset card drag state
      setCardDragState({
        isDragging: false,
        draggedCardId: null,
        dragOverCardId: null,
        sourceListId: null,
      });
    };

    const handleGlobalDragOver = (e: DragEvent) => {
      // Allow drop anywhere to prevent default browser behavior
      e.preventDefault();
    };

    const handleGlobalDrop = (e: DragEvent) => {
      console.log("Global drop detected - resetting all drag states");

      // Reset all drag states when dropping outside valid drop zones
      setDragState({
        isDragging: false,
        draggedCard: null,
        sourceListId: null,
        targetListId: null,
      });

      setListDragState({
        isDragging: false,
        draggedListId: null,
        dragOverListId: null,
      });

      setCardDragState({
        isDragging: false,
        draggedCardId: null,
        dragOverCardId: null,
        sourceListId: null,
      });
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        console.log("Escape key pressed - resetting all drag states");

        // Reset all drag states
        setDragState({
          isDragging: false,
          draggedCard: null,
          sourceListId: null,
          targetListId: null,
        });

        setListDragState({
          isDragging: false,
          draggedListId: null,
          dragOverListId: null,
        });

        setCardDragState({
          isDragging: false,
          draggedCardId: null,
          dragOverCardId: null,
          sourceListId: null,
        });
      }
    };

    // Add global event listeners
    document.addEventListener("dragend", handleGlobalDragEnd);
    document.addEventListener("dragover", handleGlobalDragOver);
    document.addEventListener("drop", handleGlobalDrop);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      // Cleanup event listeners
      document.removeEventListener("dragend", handleGlobalDragEnd);
      document.removeEventListener("dragover", handleGlobalDragOver);
      document.removeEventListener("drop", handleGlobalDrop);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (cardReorderTimeoutRef.current) {
        clearTimeout(cardReorderTimeoutRef.current);
      }
      if (cardReorderAbortControllerRef.current) {
        cardReorderAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Card management
  const handleAddCard = (listId: string) => {
    setSelectedListId(listId);
    setIsAddTaskModalOpen(true);
  };

  const handleSaveCard = async (listId: string, cardData: any) => {
    if (!currentOrganization?.id) return;

    try {
      // Set loading state for this specific list
      // setCreatingCardForList(listId);

      // Create the card via API
      const newCard = await kanbanAPI.createCard({
        list_id: listId,
        title: cardData.title,
        description: cardData.description,
        due_date: cardData.due_date,
        cover_color: cardData.cover_color,
        organizationId: currentOrganization.id,
      });

      // Assign members to the card if any were selected
      if (cardData.assignee_ids && cardData.assignee_ids.length > 0) {
        for (const projectMemberId of cardData.assignee_ids) {
          await kanbanAPI.assignCardMember(
            newCard.card.id,
            projectMemberId,
            currentOrganization.id
          );
        }
      }

      // Add the real card to the state
      setKanbanState((prev) => ({
        ...prev,
        lists: prev.lists.map((list) =>
          list.id === listId
            ? {
                ...list,
                cards: [...(list.cards || []), newCard.card],
                isLoadingCards: false, // Ensure loading state is cleared
              }
            : list
        ),
      }));

      setIsAddTaskModalOpen(false);

      toast.success("Card created successfully!");
      // Invalidate query to refresh data
      invalidateBoard();
    } catch (error) {
      console.error("Error creating card:", error);
      toast.error("Failed to create card");
    } finally {
      // Clear loading state
      // setCreatingCardForList(null);
    }
  };

  const handleCardClick = (card: Card) => {
    // Ensure card has the expected structure and remove any unexpected properties
    const cleanCard = { ...card };
    // Remove any unexpected properties that might cause rendering issues
    delete (cleanCard as any).card_title;

    setCardModal({
      isOpen: true,
      card: cleanCard,
      mode: "view",
    });
  };

  // Add card drag over handler
  const handleCardDragOver = useCallback(
    (e: React.DragEvent, targetCard: Card) => {
      e.preventDefault();

      const dragType = e.dataTransfer.getData("dragType");
      if (dragType === "card") {
        e.dataTransfer.dropEffect = "move";
        setCardDragState((prev) => ({
          ...prev,
          dragOverCardId: targetCard.id,
        }));
      }
    },
    []
  );

  // Filter cards based on current filters
  const getFilteredCards = (cards: Card[]): Card[] => {
    return cards.filter((card) => {
      // Archive filter - if showArchived is false, exclude archived cards
      if (!showArchived && card.is_archived) {
        return false;
      }

      // Search filter
      if (
        searchTerm &&
        !card.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !card.description?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Assignee filter
      if (selectedAssignee !== "all") {
        const isAssigned = card.card_members?.some(
          (member) => member.project_member_id === selectedAssignee
        );
        if (!isAssigned) return false;
      }

      return true;
    });
  };

  // Get background style
  const getBoardStyle = () => {
    if (!kanbanState.currentBoard) return {};

    if (kanbanState.currentBoard.background_image) {
      return {
        backgroundImage: `url(${kanbanState.currentBoard.background_image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    } else if (kanbanState.currentBoard.background_color) {
      return { backgroundColor: kanbanState.currentBoard.background_color };
    }

    return { backgroundColor: "#f3f4f6" };
  };

  const isLoading = boardLoading && !boardData; // Only show skeleton on initial load
  const isSearching = boardFetching && boardData && debouncedSearchTerm;

  // Show loading while organization is loading or not loaded
  // if (organizationLoading || !currentOrganization?.id || isLoading) {
  //   return (
  //     <div className="min-h-screen">
  //       <div className="w-full h-16 bg-gray-200 animate-pulse"></div>
  //       <div className="w-full h-16 bg-gray-200 animate-pulse"></div>
  //       <KanbanSkeleton />
  //     </div>
  //   );
  // }

  // if (kanbanState.isLoading || isSearching) {
  //   return <KanbanSkeleton />;
  // }

  // if (boardError || kanbanState.error) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center max-w-md mx-auto">
  //         <div className="bg-red-50 border border-red-200 rounded-lg p-6">
  //           <h3 className="text-lg font-semibold text-red-800 mb-2">
  //             Error Loading Board
  //           </h3>
  //           <p className="text-red-600 mb-4">
  //             {boardErrorMessage?.message ||
  //               kanbanState.error ||
  //               "Failed to load board data"}
  //           </p>
  //           <button
  //             onClick={() => refetchBoard()}
  //             className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
  //           >
  //             Try Again
  //           </button>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        <div className="px-8 py-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                {kanbanState.currentBoard?.name || projectName}
              </h1>
              <p className="text-sm text-gray-500">
                {kanbanState.currentBoard?.description ||
                  "Manage tasks with Kanban board"}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {/* Search loading indicator */}
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
                {/* Clear search button */}
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Assignee Filter */}
              <div className="relative">
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Assignees</option>
                  {projectMembers.map((member: ProjectMember) => (
                    <option key={member.id} value={member.id}>
                      {member.organization_members.users.full_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 h-4 w-4 text-gray-700" />
              </div>

              {/* Board Background Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  onClick={() =>
                    setBackgroundDropdownOpen(!backgroundDropdownOpen)
                  }
                >
                  <span className="mr-2">Background</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {backgroundDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                      <button
                        className={`flex-1 py-2 text-sm font-medium rounded-tl-lg focus:outline-none transition-colors duration-150 ${
                          activeTab === "images"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                        onClick={() => setActiveTab("images")}
                      >
                        Images
                      </button>
                      <button
                        className={`flex-1 py-2 text-sm font-medium rounded-tr-lg focus:outline-none transition-colors duration-150 ${
                          activeTab === "colors"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                        onClick={() => setActiveTab("colors")}
                      >
                        Colors
                      </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4">
                      {activeTab === "images" && (
                        <div className="grid grid-cols-2 gap-4">
                          {backgroundImages.map((bg) => (
                            <button
                              key={bg.value}
                              className={`group relative rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none ${
                                kanbanState.currentBoard?.background_image ===
                                bg.value
                                  ? "border-orange-500 ring-2 ring-orange-200"
                                  : "border-transparent"
                              }`}
                              onClick={() =>
                                updateBoardBackground("image", bg.value)
                              }
                            >
                              <Image
                                src={bg.preview || bg.value}
                                alt={bg.name}
                                width={160}
                                height={96}
                                className="w-full h-24 object-cover group-hover:opacity-80 transition-opacity"
                              />
                              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 text-center">
                                {bg.name}
                              </span>
                              {kanbanState.currentBoard?.background_image ===
                                bg.value && (
                                <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full shadow">
                                  Selected
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {activeTab === "colors" && (
                        <div className="grid grid-cols-4 gap-4">
                          {backgroundColors.map((color) => (
                            <button
                              key={color.value}
                              className={`relative w-14 h-14 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                                kanbanState.currentBoard?.background_color ===
                                color.value
                                  ? "border-orange-500 ring-2 ring-orange-200"
                                  : "border-transparent"
                              }`}
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                              onClick={() =>
                                updateBoardBackground("color", color.value)
                              }
                            >
                              {kanbanState.currentBoard?.background_color ===
                                color.value && (
                                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-1 py-0.5 rounded-full shadow">
                                  ✓
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div
          className="relative py-12 h-screen rounded-lg w-full"
          style={getBoardStyle()}
          onDragOver={(e) => {
            e.preventDefault();
            // Allow drop on empty space
          }}
          onDrop={(e) => {
            console.log("Drop on board background - resetting drag state", e);
            setListDragState({
              isDragging: false,
              draggedListId: null,
              dragOverListId: null,
            });
          }}
        >
          {/* Backdrop overlay */}
          <div className="absolute inset-0 rounded-lg bg-black/10 backdrop-blur-sm"></div>

          {isLoading ? (
            <KanbanSkeleton />
          ) : boardError ? (
            <div className="p-8 text-center">
              <p className="text-red-500">
                Error loading board: {boardErrorMessage?.message}
              </p>
              <button
                onClick={() => refetchBoard()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="p-6">
              <div
                onDrop={(e) => {
                  console.log("Drop on container - resetting drag state");
                }}
                className="flex overflow-x-auto pb-4 gap-6 px-8 relative z-10 min-h-[500px] items-start w-full"
              >
                {kanbanState.lists.map((list) => (
                  <div
                    key={list.id}
                    data-list-id={list.id}
                    className="flex-shrink-0"
                  >
                    <KanbanColumn
                      list={list}
                      cards={getFilteredCards(list.cards || [])}
                      projectMembers={projectMembers}
                      isLoadingCards={(list as any).isLoadingCards}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onAddCard={handleAddCard}
                      onCardClick={handleCardClick}
                      onListDragStart={handleListDragStart}
                      onListDragOver={handleListDragOver}
                      onListDragLeave={handleListDragLeave}
                      onListDrop={handleListDrop}
                      onListArchive={handleListArchive}
                      onCardDragOver={handleCardDragOver}
                      onCardDragLeave={handleCardDragLeave}
                      onCardDrop={handleCardDrop}
                      isDraggedOver={listDragState.dragOverListId === list.id}
                      isBeingDragged={listDragState.draggedListId === list.id}
                      draggedCardId={cardDragState.draggedCardId}
                      dragOverCardId={cardDragState.dragOverCardId}
                    />
                  </div>
                ))}

                {/* Add List Button */}
                <button
                  onClick={handleAddList}
                  className="flex-shrink-0 w-80 bg-gray-200/80 backdrop-blur-sm rounded-lg p-4 flex items-center justify-center text-gray-700 hover:bg-gray-300/80 transition-colors duration-200"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add another list
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onSave={handleSaveCard}
        listId={selectedListId}
        projectMembers={projectMembers}
      />

      <AddListModal
        isOpen={isAddListModalOpen}
        onClose={() => setIsAddListModalOpen(false)}
        onSave={handleSaveList}
      />

      {cardModal.isOpen && cardModal.card && kanbanState.currentBoard && (
        <CardDetailModal
          card={cardModal.card}
          isOpen={cardModal.isOpen}
          onClose={() =>
            setCardModal({ isOpen: false, card: null, mode: "view" })
          }
          projectMembers={projectMembers}
          organizationId={currentOrganization?.id || ""}
          boardId={kanbanState.currentBoard.id}
          projectId={projectId}
          onCardUpdate={(updatedCard: Card) => {
            setKanbanState((prev) => ({
              ...prev,
              lists: prev.lists.map((list) => ({
                ...list,
                cards:
                  list.cards?.map((card) =>
                    card.id === updatedCard.id ? updatedCard : card
                  ) || [],
              })),
            }));

            if (updatedCard.is_archived && !showArchived) {
              setCardModal({ isOpen: false, card: null, mode: "view" });
              toast.success("Card archived and removed from view");
              return;
            }

            if (
              !updatedCard.is_archived &&
              updatedCard.is_archived !== cardModal.card?.is_archived
            ) {
              toast.success("Card unarchived successfully!");
            }
          }}
        />
      )}
    </div>
  );
}
