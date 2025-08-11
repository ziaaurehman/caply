// Import types from API
import type { 
  Board,
  List,
  Card,
  CardMember,
  Label,
  CardLabel,
  Checklist,
  ChecklistItem,
  Comment,
  Activity
} from '@/utils/api/kanban';

// Re-export API types for component use
export type {
  Board,
  List,
  Card,
  CardMember,
  Label,
  CardLabel,
  Checklist,
  ChecklistItem,
  Comment,
  Activity
};

// Extended types for UI components
export interface KanbanBoardProps {
  projectId: string;
  projectName?: string;
  projectMembers?: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  organization_member_id: string;
  role?: string;
  joined_at?: string;
  organization_members: {
    id: string;
    user_id: string;
    users: {
      id: string;
      full_name: string;
      email: string;
      avatar_url?: string;
    };
  };
}

export interface CardWithDetails extends Card {
  lists?: {
    name: string;
    boards: {
      name: string;
    };
  };
}

// UI State interfaces
export interface KanbanState {
  boards: Board[];
  currentBoard: Board | null;
  lists: List[];
  isLoading: boolean;
  error: string | null;
}

export interface DragState {
  isDragging: boolean;
  draggedCard: Card | null;
  sourceListId: string | null;
  targetListId: string | null;
}

// Modal interfaces
export interface CardModalState {
  isOpen: boolean;
  card: Card | null;
  mode: 'view' | 'edit' | 'create';
}

export interface LabelModalState {
  isOpen: boolean;
  boardId: string | null;
  editingLabel: Label | null;
}

export interface ChecklistModalState {
  isOpen: boolean;
  cardId: string | null;
  editingChecklist: Checklist | null;
}

// Form interfaces
export interface CreateCardForm {
  title: string;
  description?: string;
  due_date?: string;
  cover_color?: string;
  assigned_members: string[];
  labels: string[];
}

export interface CreateListForm {
  name: string;
}

export interface CreateBoardForm {
  name: string;
  description?: string;
  background_color?: string;
  background_image?: string;
  visibility?: 'private' | 'project' | 'public';
}

// Filter and search interfaces
export interface KanbanFilters {
  assignedTo?: string;
  labels?: string[];
  dueDate?: 'overdue' | 'today' | 'this_week' | 'this_month';
  search?: string;
}

// Background options
export interface BackgroundOption {
  type: 'image' | 'color';
  value: string;
  name: string;
  preview?: string;
} 