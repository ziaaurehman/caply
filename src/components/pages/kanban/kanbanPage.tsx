"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { ChevronDown, Plus, Settings, Users, Filter, Search, Bell } from "lucide-react"
import { kanbanAPI } from "@/utils/api/kanban"
import { projectAPI } from "@/utils/api/project"
import { useOrganizationStore } from "@/lib/stores/organizationStore"
import KanbanColumn from "./KanbanColumn"
import AddTaskModal from "./AddTaskModal"
import { 
  Board, 
  List, 
  Card, 
  KanbanBoardProps, 
  ProjectMember, 
  KanbanState, 
  DragState,
  CardModalState,
  KanbanFilters,
  BackgroundOption
} from "./types"

// Temporarily remove problematic imports for now
import CardDetailModal from "./CardDetailModal"
// import BoardSettingsModal from "./BoardSettingsModal"
import KanbanSkeleton from "./KanbanSkeleton"

interface KanbanPageProps {
  projectId: string;
}

export default function KanbanBoard({ projectId }: KanbanPageProps) {
  const { 
    currentOrganization, 
    loading: organizationLoading, 
    fetchUserOrganizations,
    userOrganizations 
  } = useOrganizationStore();
  
  // Main state
  const [kanbanState, setKanbanState] = useState<KanbanState>({
    boards: [],
    currentBoard: null,
    lists: [],
    isLoading: true,
    error: null
  });

  // Project data
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [projectName, setProjectName] = useState<string>("");

  // UI state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedCard: null,
    sourceListId: null,
    targetListId: null
  });

  const [cardModal, setCardModal] = useState<CardModalState>({
    isOpen: false,
    card: null,
    mode: 'view'
  });

  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Filters and search
  const [filters, setFilters] = useState<KanbanFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("all");

  // Background customization
  const [backgroundDropdownOpen, setBackgroundDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'colors'>("images");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Background options
  const backgroundImages: BackgroundOption[] = [
    { type: "image", value: "/kanban/blue-preview.jpg", name: "Blue", preview: "/kanban/blue-preview.jpg" },
    { type: "image", value: "/kanban/dark-preview.jpg", name: "Dark", preview: "/kanban/dark-preview.jpg" },
    { type: "image", value: "/kanban/landscape-preview.jpg", name: "Landscape", preview: "/kanban/landscape-preview.jpg" },
    { type: "image", value: "/kanban/nature-preview.jpg", name: "Nature", preview: "/kanban/nature-preview.jpg" },
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

  // Initialize data
  const initializeKanbanData = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    try {
      setKanbanState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch project details and members
      const projectResponse = await projectAPI.getProject(projectId, currentOrganization.id);
      const project = projectResponse.project;
      setProjectName(project.name);
      
      // Map project members to the format expected by Kanban components
      const members = project.project_members?.map(pm => ({
        user_id: pm.organization_members.user_id,
        users: pm.organization_members.users,
        role: pm.role,
        joined_at: pm.joined_at
      })) || [];
      setProjectMembers(members);

      // Check if Kanban is enabled for this project
      if (!project.kanban_enabled) {
        setKanbanState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: "Kanban board is not enabled for this project" 
        }));
        return;
      }

      // Fetch boards for the project
      const boardsResponse = await kanbanAPI.getBoards(projectId, currentOrganization.id);
      const boards = boardsResponse.boards;

      if (boards.length === 0) {
        // Create default board if none exists
        const newBoard = await kanbanAPI.createBoard({
          project_id: projectId,
          name: `${project.name} Board`,
          description: `Kanban board for ${project.name}`,
          background_color: "#0079bf",
          organizationId: currentOrganization.id
        });
        setKanbanState(prev => ({
          ...prev,
          boards: [newBoard.board],
          currentBoard: newBoard.board,
          isLoading: false
        }));
        await loadBoardData(newBoard.board.id);
      } else {
        // Use the first board
        const currentBoard = boards[0];
        setKanbanState(prev => ({
          ...prev,
          boards,
          currentBoard,
          isLoading: false
        }));
        await loadBoardData(currentBoard.id);
      }
    } catch (error) {
      console.error("Error initializing Kanban data:", error);
      setKanbanState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load Kanban board"
      }));
    }
  }, [projectId, currentOrganization?.id]);

  // Initialize organization store if needed
  useEffect(() => {
    if (!organizationLoading && userOrganizations.length === 0) {
      fetchUserOrganizations();
    }
  }, [organizationLoading, userOrganizations.length, fetchUserOrganizations]);

  // Initialize kanban data when organization is ready
  useEffect(() => {
    if (currentOrganization?.id) {
      initializeKanbanData();
    }
  }, [initializeKanbanData, currentOrganization?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setBackgroundDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadBoardData = async (boardId: string) => {
    if (!currentOrganization?.id) return;
    
    try {
      const listsResponse = await kanbanAPI.getLists(boardId, currentOrganization.id);
      setKanbanState(prev => ({
        ...prev,
        lists: listsResponse.lists
      }));
    } catch (error) {
      console.error("Error loading board data:", error);
      setKanbanState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to load board data"
      }));
    }
  };

  // Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, card: Card) => {
    setDragState({
      isDragging: true,
      draggedCard: card,
      sourceListId: card.list_id,
      targetListId: null
    });
    e.dataTransfer.setData("cardId", card.id);
    e.dataTransfer.setData("sourceListId", card.list_id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    
    const cardId = e.dataTransfer.getData("cardId");
    const sourceListId = e.dataTransfer.getData("sourceListId");

    if (cardId && sourceListId && sourceListId !== targetListId) {
      if (!currentOrganization?.id) return;

      try {
        // Update card's list
        await kanbanAPI.updateCard(cardId, { list_id: targetListId, organizationId: currentOrganization.id });
        
        // Refresh board data
        if (kanbanState.currentBoard) {
          await loadBoardData(kanbanState.currentBoard.id);
        }
      } catch (error) {
        console.error("Error moving card:", error);
      }
    }

    setDragState({
      isDragging: false,
      draggedCard: null,
      sourceListId: null,
      targetListId: null
    });
  }, [kanbanState.currentBoard]);

  // Board management
  const updateBoardBackground = async (backgroundType: 'image' | 'color', value: string) => {
    if (!kanbanState.currentBoard) return;

    try {
      const updateData = backgroundType === 'image' 
        ? { background_image: value, background_color: undefined }
        : { background_color: value, background_image: undefined };

      const updatedBoard = await kanbanAPI.updateBoard(kanbanState.currentBoard.id, updateData);
      
      setKanbanState(prev => ({
        ...prev,
        currentBoard: updatedBoard.board,
        boards: prev.boards.map(board => 
          board.id === updatedBoard.board.id ? updatedBoard.board : board
        )
      }));
      
      setBackgroundDropdownOpen(false);
    } catch (error) {
      console.error("Error updating board background:", error);
    }
  };

  // List management
  const handleAddList = async () => {
    if (!kanbanState.currentBoard || !currentOrganization?.id) return;

    const listName = prompt("Enter list name:");
    if (!listName) return;

    try {
      await kanbanAPI.createList({
        board_id: kanbanState.currentBoard.id,
        name: listName,
        organizationId: currentOrganization.id
      });
      
      // Refresh board data
      await loadBoardData(kanbanState.currentBoard.id);
    } catch (error) {
      console.error("Error creating list:", error);
    }
  };

  // Card management
  const handleAddCard = (listId: string) => {
    setSelectedListId(listId);
    setIsAddTaskModalOpen(true);
  };

  const handleSaveCard = async (listId: string, cardData: any) => {
    if (!currentOrganization?.id) return;

    try {
      const newCard = await kanbanAPI.createCard({
        list_id: listId,
        title: cardData.title,
        description: cardData.description,
        due_date: cardData.due_date,
        cover_color: cardData.cover_color,
        organizationId: currentOrganization.id
      });
      
      // Assign members to the card if any were selected
      if (cardData.assignee_ids && cardData.assignee_ids.length > 0) {
        for (const userId of cardData.assignee_ids) {
          await kanbanAPI.assignCardMember(newCard.card.id, userId, currentOrganization.id);
        }
      }
      
      // Refresh board data
      if (kanbanState.currentBoard) {
        await loadBoardData(kanbanState.currentBoard.id);
      }
      
      setIsAddTaskModalOpen(false);
    } catch (error) {
      console.error("Error creating card:", error);
    }
  };

  const handleCardClick = (card: Card) => {
    setCardModal({
      isOpen: true,
      card,
      mode: 'view'
    });
  };

  // Filter cards based on current filters
  const getFilteredCards = (cards: Card[]): Card[] => {
    return cards.filter(card => {
      // Search filter
      if (searchTerm && !card.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !card.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Assignee filter
      if (selectedAssignee !== "all") {
        const isAssigned = card.card_members?.some(member => member.user_id === selectedAssignee);
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
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    } else if (kanbanState.currentBoard.background_color) {
      return { backgroundColor: kanbanState.currentBoard.background_color };
    }
    
    return { backgroundColor: '#f3f4f6' };
  };

  // Show loading while organization is loading or not loaded
  if (organizationLoading || !currentOrganization?.id) {
    return <KanbanSkeleton />;
  }

  if (kanbanState.isLoading) {
    return <KanbanSkeleton />;
  }

  if (kanbanState.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Board</h3>
            <p className="text-red-600 mb-4">{kanbanState.error}</p>
            <button 
              onClick={() => initializeKanbanData()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto">
        <div className="p-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                {kanbanState.currentBoard?.name || projectName}
              </h1>
              <p className="text-sm text-gray-500">
                {kanbanState.currentBoard?.description || "Manage tasks with Kanban board"}
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
              </div>

              {/* Assignee Filter */}
              <div className="relative">
                <select 
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Assignees</option>
                  {projectMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.users.full_name}
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
                  onClick={() => setBackgroundDropdownOpen(!backgroundDropdownOpen)}
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
                          activeTab === 'images' ? 'bg-orange-50 text-orange-600' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                        onClick={() => setActiveTab('images')}
                      >
                        Images
                      </button>
                      <button
                        className={`flex-1 py-2 text-sm font-medium rounded-tr-lg focus:outline-none transition-colors duration-150 ${
                          activeTab === 'colors' ? 'bg-orange-50 text-orange-600' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                        onClick={() => setActiveTab('colors')}
                      >
                        Colors
                      </button>
                    </div>
                    
                    {/* Tab Content */}
                    <div className="p-4">
                      {activeTab === 'images' && (
                        <div className="grid grid-cols-2 gap-4">
                          {backgroundImages.map((bg) => (
                            <button
                              key={bg.value}
                              className={`group relative rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none ${
                                kanbanState.currentBoard?.background_image === bg.value
                                  ? "border-orange-500 ring-2 ring-orange-200"
                                  : "border-transparent"
                              }`}
                              onClick={() => updateBoardBackground('image', bg.value)}
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
                              {kanbanState.currentBoard?.background_image === bg.value && (
                                <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full shadow">
                                  Selected
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {activeTab === 'colors' && (
                        <div className="grid grid-cols-4 gap-4">
                          {backgroundColors.map((color) => (
                            <button
                              key={color.value}
                              className={`relative w-14 h-14 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                                kanbanState.currentBoard?.background_color === color.value
                                  ? "border-orange-500 ring-2 ring-orange-200"
                                  : "border-transparent"
                              }`}
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                              onClick={() => updateBoardBackground('color', color.value)}
                            >
                              {kanbanState.currentBoard?.background_color === color.value && (
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

              {/* Board Settings
              <button
                onClick={() => setBoardSettingsOpen(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <Settings className="h-4 w-4" />
              </button> */}
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div
          className="relative py-12 rounded-lg"
          style={getBoardStyle()}
        >
          {/* Backdrop overlay */}
          <div className="absolute inset-0 rounded-lg bg-black/10 backdrop-blur-sm"></div>
          
          <div className="flex overflow-x-auto pb-4 gap-6 px-4 relative z-10 min-h-[500px] items-start">
            {kanbanState.lists.map((list) => (
              <div key={list.id} data-list-id={list.id} className="flex-shrink-0">
                <KanbanColumn
                  list={list}
                  cards={getFilteredCards(list.cards || [])}
                  projectMembers={projectMembers}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onAddCard={handleAddCard}
                  onCardClick={handleCardClick}
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
      </div>

      {/* Modals */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onSave={handleSaveCard}
        listId={selectedListId}
        projectMembers={projectMembers}
      />

      {cardModal.isOpen && cardModal.card && (
        <CardDetailModal
          card={cardModal.card}
          isOpen={cardModal.isOpen}
          onClose={() => setCardModal({ isOpen: false, card: null, mode: 'view' })}
          projectMembers={projectMembers}
          boardId={kanbanState.currentBoard?.id}
          organizationId={currentOrganization?.id || ''}
          onCardUpdate={() => {
            if (kanbanState.currentBoard) {
              loadBoardData(kanbanState.currentBoard.id);
            }
          }}
        />
      )}

      {/* TODO: Implement board settings modal
      {boardSettingsOpen && kanbanState.currentBoard && (
        <BoardSettingsModal
          board={kanbanState.currentBoard}
          isOpen={boardSettingsOpen}
          onClose={() => setBoardSettingsOpen(false)}
          onBoardUpdate={(updatedBoard: Board) => {
            setKanbanState(prev => ({
              ...prev,
              currentBoard: updatedBoard,
              boards: prev.boards.map(board => 
                board.id === updatedBoard.id ? updatedBoard : board
              )
            }));
          }}
        />
      )}
      */}
    </div>
  );
}
