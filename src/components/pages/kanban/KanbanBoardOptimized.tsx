"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import KanbanColumnOptimized from "./KanbanColumnOptimized";
import AddTaskModal from "./AddTaskModal";
import CardDetailModal from "./CardDetailModal";
import KanbanSkeleton from "./KanbanSkeleton";
import {
  Board,
  List,
  Card,
  ProjectMember,
  DragState,
  CardModalState,
  KanbanFilters,
  BackgroundOption,
} from "./types";

// Import our optimized hooks
import {
  useBoards,
  useBoard,
  useListsByBoard,
  useCardsByBoard,
  useCreateBoard,
  useCreateList,
  useCreateCard,
  useReorderCards,
  useReorderLists,
  useUpdateCard,
  useUpdateList,
  useArchiveList,
  useArchiveCard,
  kanbanKeys,
} from "@/lib/hooks/useKanban";

interface KanbanBoardOptimizedProps {
  projectId: string;
}

export default function KanbanBoardOptimized({
  projectId,
}: KanbanBoardOptimizedProps) {
  const { currentOrganization, loading: organizationLoading } =
    useOrganizationStore();

  // Main state
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [projectName, setProjectName] = useState<string>("");

  // UI state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedCard: null,
    sourceListId: null,
    targetListId: null,
  });

  // Search and filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [selectedAssignee, setSelectedAssignee] = useState("all");

  // Modals
  const [cardModal, setCardModal] = useState<CardModalState>({
    isOpen: false,
    card: null,
    mode: "view",
  });
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Background customization
  const [backgroundDropdownOpen, setBackgroundDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"images" | "colors">("images");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // TanStack Query hooks
  const { data: boardsData, isLoading: boardsLoading } = useBoards(
    projectId,
    currentOrganization?.id || ""
  );

  const { data: currentBoardData, isLoading: boardLoading } = useBoard(
    currentBoardId || "",
    currentOrganization?.id || ""
  );

  const { data: listsData, isLoading: listsLoading } = useListsByBoard(
    currentBoardId || "",
    currentOrganization?.id || "",
    showArchived
  );

  const { data: cardsData, isLoading: cardsLoading } = useCardsByBoard(
    currentBoardId || "",
    currentOrganization?.id || "",
    searchTerm,
    showArchived
  );

  // Mutations
  const createBoardMutation = useCreateBoard();
  const createListMutation = useCreateList();
  const createCardMutation = useCreateCard();
  const reorderCardsMutation = useReorderCards();
  const reorderListsMutation = useReorderLists();
  const updateCardMutation = useUpdateCard();
  const updateListMutation = useUpdateList();
  const archiveListMutation = useArchiveList();
  const archiveCardMutation = useArchiveCard();

  const boards = useMemo(() => boardsData?.boards || [], [boardsData?.boards]);
  const currentBoard = useMemo(
    () => currentBoardData?.board || null,
    [currentBoardData?.board]
  );

  // Set first board as current board when boards load
  useEffect(() => {
    if (boards && boards.length > 0 && !currentBoardId) {
      setCurrentBoardId(boards[0].id);
    }
  }, [boards, currentBoardId]);

  // Loading states
  const isLoading =
    boardsLoading || boardLoading || listsLoading || cardsLoading;

  // Event handlers
  const handleBoardSelect = (boardId: string) => {
    setCurrentBoardId(boardId);
  };

  const handleCreateBoard = async (name: string) => {
    if (!currentOrganization?.id) return;

    try {
      await createBoardMutation.mutateAsync({
        name,
        project_id: projectId,
        organizationId: currentOrganization.id,
      });
      toast.success("Board created successfully");
    } catch (error) {
      toast.error("Failed to create board");
    }
  };

  const handleCreateList = async (name: string) => {
    if (!currentBoardId || !currentOrganization?.id) return;

    try {
      await createListMutation.mutateAsync({
        name,
        board_id: currentBoardId,
        organizationId: currentOrganization.id,
      });
      toast.success("List created successfully");
    } catch (error) {
      toast.error("Failed to create list");
    }
  };

  const handleCreateCard = async (data: {
    title: string;
    description?: string;
    list_id: string;
  }) => {
    if (!currentOrganization?.id) return;

    try {
      await createCardMutation.mutateAsync({
        ...data,
        organizationId: currentOrganization.id,
      });
      toast.success("Card created successfully");
    } catch (error) {
      toast.error("Failed to create card");
    }
  };

  const handleCardDragStart = (e: React.DragEvent, card: Card) => {
    e.dataTransfer.effectAllowed = "move";
    setDragState({
      isDragging: true,
      draggedCard: card,
      sourceListId: card.list_id,
      targetListId: null,
    });
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleCardDrop = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();

    if (!dragState.draggedCard || !currentOrganization?.id) return;

    const { draggedCard, sourceListId } = dragState;

    if (sourceListId === targetListId) {
      setDragState({
        isDragging: false,
        draggedCard: null,
        sourceListId: null,
        targetListId: null,
      });
      return;
    }

    try {
      // Optimistic update - the mutation will handle cache updates
      await reorderCardsMutation.mutateAsync({
        listId: targetListId!,
        cardPositions: [
          {
            card_id: draggedCard.id,
            position: 0, // Add to top of target list
          },
        ],
        organizationId: currentOrganization.id,
      });

      toast.success("Card moved successfully");
    } catch (error) {
      toast.error("Failed to move card");
    } finally {
      setDragState({
        isDragging: false,
        draggedCard: null,
        sourceListId: null,
        targetListId: null,
      });
    }
  };

  const handleCardClick = (card: Card) => {
    setCardModal({
      isOpen: true,
      card,
      mode: "view",
    });
  };

  const handleCardUpdate = (updatedCard: Card) => {
    // The mutation will automatically update the cache
    setCardModal((prev) => ({
      ...prev,
      card: updatedCard,
    }));
  };

  const handleArchiveList = async (listId: string, isArchived: boolean) => {
    if (!currentOrganization?.id) return;

    try {
      await archiveListMutation.mutateAsync({
        listId,
        isArchived,
        organizationId: currentOrganization.id,
      });
      toast.success(
        `List ${isArchived ? "archived" : "restored"} successfully`
      );
    } catch (error) {
      toast.error(`Failed to ${isArchived ? "archive" : "restore"} list`);
    }
  };

  const handleArchiveCard = async (cardId: string, isArchived: boolean) => {
    if (!currentOrganization?.id) return;

    try {
      await archiveCardMutation.mutateAsync({
        cardId,
        isArchived,
        organizationId: currentOrganization.id,
      });
      toast.success(
        `Card ${isArchived ? "archived" : "restored"} successfully`
      );
    } catch (error) {
      toast.error(`Failed to ${isArchived ? "archive" : "restore"} card`);
    }
  };

  // Group cards by list
  const cardsByList =
    cardsData?.cards.reduce(
      (acc, card) => {
        if (!acc[card.list_id]) {
          acc[card.list_id] = [];
        }
        acc[card.list_id].push(card);
        return acc;
      },
      {} as Record<string, Card[]>
    ) || {};

  if (isLoading) {
    return <KanbanSkeleton />;
  }

  if (!currentBoard) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No board selected</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {currentBoard.name}
            </h1>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent text-sm placeholder-gray-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsAddTaskModalOpen(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex space-x-6 min-w-max">
          {listsData?.lists.map((list) => (
            <KanbanColumnOptimized
              key={list.id}
              list={list}
              cards={cardsByList[list.id] || []}
              projectMembers={projectMembers}
              onDragStart={handleCardDragStart}
              onDragOver={handleCardDragOver}
              onDrop={(e) => handleCardDrop(e, list.id)}
              onAddCard={() => {
                setSelectedListId(list.id);
                setIsAddTaskModalOpen(true);
              }}
              onCardClick={handleCardClick}
              onListArchive={handleArchiveList}
              isDraggedOver={dragState.targetListId === list.id}
              draggedCardId={dragState.draggedCard?.id}
            />
          ))}

          {/* Add List Button */}
          <div className="w-80 bg-gray-100 rounded-lg p-4 border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
            <button
              onClick={() => {
                const name = prompt("Enter list name:");
                if (name) handleCreateList(name);
              }}
              className="w-full h-32 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <div className="text-center">
                <Plus className="h-8 w-8 mx-auto mb-2" />
                <span className="text-sm font-medium">Add a list</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAddTaskModalOpen && (
        <AddTaskModal
          isOpen={isAddTaskModalOpen}
          onClose={() => {
            setIsAddTaskModalOpen(false);
            setSelectedListId(null);
          }}
          onSave={async (listId: string, cardData: any) => {
            await handleCreateCard({
              title: cardData.title,
              description: cardData.description,
              list_id: listId,
            });
          }}
          listId={selectedListId}
          projectMembers={projectMembers}
        />
      )}

      {cardModal.isOpen && cardModal.card && (
        <CardDetailModal
          isOpen={cardModal.isOpen}
          onClose={() =>
            setCardModal({ isOpen: false, card: null, mode: "view" })
          }
          card={cardModal.card}
          projectMembers={projectMembers}
          organizationId={currentOrganization?.id || ""}
          boardId={currentBoardId || ""}
          projectId={projectId}
          onCardUpdate={handleCardUpdate}
        />
      )}
    </div>
  );
}
