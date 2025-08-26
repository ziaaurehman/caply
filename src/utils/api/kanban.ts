// Kanban API Types
interface Board {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  background_color: string;
  background_image?: string;
  is_closed: boolean;
  visibility: 'private' | 'project' | 'public';
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  lists?: List[];
}

interface List {
  id: string;
  board_id: string;
  name: string;
  position: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  cards?: Card[];
}

interface Card {
  id: string;
  list_id: string;
  title: string;
  description?: string;
  position: number;
  due_date?: string;
  is_completed: boolean;
  is_archived: boolean;
  cover_color?: string;
  cover_image?: string;
  cover?: {
    color?: string;
    image?: string;
    size?: 'small' | 'large';
  };
  created_by: string;
  created_at: string;
  updated_at: string;
  card_members?: CardMember[];
  card_labels?: CardLabel[];
  labels?: Label[];
  checklists?: Checklist[];
  comments?: Comment[];
  attachments?: Attachment[];
  lists?: {
    name: string;
    boards: {
      id: string;
      name: string;
      project_id: string;
    };
  };
}

interface CardMember {
  id: string;
  card_id: string;
  project_member_id: string;
  assigned_at: string;
  project_members: {
    id: string;
    organization_member_id: string;
    role?: string;
    joined_at: string;
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
  };
}

interface Label {
  id: string;
  board_id: string;
  name: string;
  color: string;
  created_at: string;
}

interface CardLabel {
  id: string;
  card_id: string;
  label_id: string;
  labels: Label;
}

interface Checklist {
  id: string;
  card_id: string;
  name: string;
  position: number;
  created_at: string;
  checklist_items?: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  checklist_id: string;
  content: string;
  is_completed: boolean;
  position: number;
  due_date?: string;
  assigned_to_project_member_id?: string;
  created_at: string;
  updated_at: string;
  project_members?: {
    id: string;
    organization_member_id: string;
    role?: string;
    joined_at: string;
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
  };
}

interface Comment {
  id: string;
  card_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  users: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface Attachment {
  id: string;
  card_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  users: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface Activity {
  id: string;
  user_id: string;
  board_id?: string;
  card_id?: string;
  action_type: 'create' | 'update' | 'delete' | 'move' | 'archive' | 'restore' | 'complete' | 'incomplete';
  entity_type: 'board' | 'list' | 'card' | 'comment' | 'attachment' | 'member' | 'label' | 'checklist' | 'checklist_item';
  entity_id: string;
  details: any;
  created_at: string;
  users: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface BoardNotification {
  id: string;
  user_id: string;
  type: 'card_assigned' | 'card_due' | 'card_comment' | 'card_moved' | 'mention';
  title: string;
  message: string;
  is_read: boolean;
  related_card_id?: string;
  related_board_id?: string;
  created_at: string;
  cards?: Card;
  boards?: Board;
}

// Request/Response Types
interface CreateBoardData {
  project_id: string;
  name: string;
  description?: string;
  background_color?: string;
  background_image?: string;
  visibility?: 'private' | 'project' | 'public';
}

interface UpdateBoardData {
  name?: string;
  description?: string;
  background_color?: string;
  background_image?: string;
  visibility?: 'private' | 'project' | 'public';
  is_closed?: boolean;
}

interface CreateListData {
  board_id: string;
  name: string;
}

interface UpdateListData {
  name?: string;
  position?: number;
  is_archived?: boolean;
}

interface CreateCardData {
  list_id: string;
  title: string;
  description?: string;
  due_date?: string;
  cover_color?: string;
  cover_image?: string;
}

interface UpdateCardData {
  title?: string;
  description?: string;
  list_id?: string;
  position?: number;
  due_date?: string;
  is_completed?: boolean;
  is_archived?: boolean;
  cover_color?: string;
  cover_image?: string;
}

interface CreateLabelData {
  board_id: string;
  name: string;
  color: string;
}

interface UpdateLabelData {
  name?: string;
  color?: string;
}

interface CreateChecklistData {
  card_id: string;
  name: string;
  organizationId: string;
}

interface UpdateChecklistData {
  name?: string;
  position?: number;
}

interface CreateChecklistItemData {
  checklist_id: string;
  content: string;
  due_date?: string;
  assigned_to_project_member_id?: string;
  organizationId: string;
}

interface UpdateChecklistItemData {
  content?: string;
  is_completed?: boolean;
  position?: number;
  due_date?: string;
  assigned_to_project_member_id?: string;
  organizationId?: string;
}

interface CreateCommentData {
  card_id: string;
  content: string;
  organizationId: string;
}

interface CreateAttachmentData {
  card_id: string;
  file: File;
  organizationId: string;
}

interface UpdateCommentData {
  content: string;
  organizationId?: string;
}

interface BulkCardOperation {
  operation: 'move' | 'archive' | 'delete';
  card_ids: string[];
  target_list_id?: string;
  positions?: number[];
}

interface CardPosition {
  card_id: string;
  position: number;
}

interface ListPosition {
  list_id: string;
  position: number;
}

interface CreateNotificationData {
  user_id: string;
  type: 'card_assigned' | 'card_due' | 'card_comment' | 'card_moved' | 'mention';
  title: string;
  message: string;
  related_card_id?: string;
  related_board_id?: string;
}

// Response Types
interface BoardsResponse {
  boards: Board[];
}

interface BoardResponse {
  board: Board;
}

interface ListsResponse {
  lists: List[];
}

interface ListResponse {
  list: List;
}

interface CardsResponse {
  cards: Card[];
}

interface CardResponse {
  card: Card;
}

interface LabelsResponse {
  labels: Label[];
}

interface LabelResponse {
  label: Label;
}

interface ChecklistsResponse {
  checklists: Checklist[];
}

interface ChecklistResponse {
  checklist: Checklist;
}

interface ChecklistItemResponse {
  checklist_item: ChecklistItem;
}

interface CommentsResponse {
  comments: Comment[];
}

interface CommentResponse {
  comment: Comment;
}

interface AttachmentsResponse {
  attachments: Attachment[];
}

interface AttachmentResponse {
  attachment: Attachment;
}

interface AttachmentDownloadResponse {
  attachment: Attachment;
  download_url: string;
}

interface ActivitiesResponse {
  activities: Activity[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

interface NotificationsResponse {
  notifications: BoardNotification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

interface BulkOperationResponse {
  results: Array<{
    card_id: string;
    success: boolean;
    error?: string;
    card?: Card;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

interface ReorderResponse {
  results: Array<{
    card_id?: string;
    list_id?: string;
    success: boolean;
    error?: string;
    card?: Card;
    list?: List;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Kanban API
export const kanbanAPI = {
  // ===== BOARDS =====
  
  // Get boards by project
  getBoards: async (projectId: string, organizationId: string): Promise<BoardsResponse> => {
    const response = await fetch(`/api/kanban/boards?project_id=${projectId}&organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch boards');
    }
    const data = await response.json();
    return { boards: data.boards || [] };
  },

  // Get single board
  getBoard: async (id: string): Promise<BoardResponse> => {
    const response = await fetch(`/api/kanban/boards/${id}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch board');
    }
    const data = await response.json();
    return { board: data.board };
  },

  // Create board
  createBoard: async (data: CreateBoardData & { organizationId: string }): Promise<BoardResponse> => {
    const response = await fetch('/api/kanban/boards', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create board');
    }
    const result = await response.json();
    return { board: result.board };
  },

  // Update board
  updateBoard: async (id: string, data: UpdateBoardData & { organizationId: string }): Promise<BoardResponse> => {
    const response = await fetch(`/api/kanban/boards/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update board');
    }
    const result = await response.json();
    return { board: result.board };
  },

  // Delete board
  deleteBoard: async (id: string, organizationId: string): Promise<void> => {
    const response = await fetch(`/api/kanban/boards/${id}`, {
      method: 'DELETE',
      headers: {
        'x-organization-id': organizationId,
      }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete board');
    }
  },

  // ===== LISTS =====

  // Get lists by board
  getLists: async (boardId: string, organizationId: string): Promise<ListsResponse> => {
    const response = await fetch(`/api/kanban/lists?board_id=${boardId}&organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch lists');
    }
    const data = await response.json();
    return { lists: data.lists || [] };
  },

  // Get single list
  getList: async (id: string): Promise<ListResponse> => {
    const response = await fetch(`/api/kanban/lists/${id}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch list');
    }
    const data = await response.json();
    return { list: data.list };
  },

  // Create list
  createList: async (data: CreateListData & { organizationId: string }): Promise<ListResponse> => {
    const response = await fetch('/api/kanban/lists', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create list');
    }
    const result = await response.json();
    return { list: result.list };
  },

  // Update list
  updateList: async (id: string, data: UpdateListData & { organizationId: string }): Promise<ListResponse> => {
    const response = await fetch(`/api/kanban/lists/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update list');
    }
    const result = await response.json();
    return { list: result.list };
  },

  // Delete list
  deleteList: async (id: string, organizationId: string): Promise<void> => {
    const response = await fetch(`/api/kanban/lists/${id}`, {
      method: 'DELETE',
      headers: {
        'x-organization-id': organizationId,
      }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete list');
    }
  },

  // Reorder lists
  reorderLists: async (boardId: string, listPositions: ListPosition[], organizationId: string): Promise<ReorderResponse> => {
    const response = await fetch('/api/kanban/lists/reorder', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': organizationId,
      },
      body: JSON.stringify({ board_id: boardId, list_positions: listPositions })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to reorder lists');
    }
    return await response.json();
  },

  // ===== CARDS =====

  // Get cards by list
  getCardsByList: async (listId: string, organizationId: string): Promise<CardsResponse> => {
    const response = await fetch(`/api/kanban/cards?list_id=${listId}&organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch cards');
    }
    const data = await response.json();
    return { cards: data.cards || [] };
  },

  // Get cards by board
  getCardsByBoard: async (boardId: string, organizationId: string): Promise<CardsResponse> => {
    const response = await fetch(`/api/kanban/cards?board_id=${boardId}&organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch cards');
    }
    const data = await response.json();
    return { cards: data.cards || [] };
  },

  // Get single card
  getCard: async (id: string, organizationId: string): Promise<CardResponse> => {
    const response = await fetch(`/api/kanban/cards/${id}?organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch card');
    }
    const data = await response.json();
    return { card: data.card };
  },

  // Create card
  createCard: async (data: CreateCardData & { organizationId: string }): Promise<CardResponse> => {
    const response = await fetch('/api/kanban/cards', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create card');
    }
    const result = await response.json();
    return { card: result.card };
  },

  // Update card
  updateCard: async (id: string, data: UpdateCardData & { organizationId: string }): Promise<CardResponse> => {
    const response = await fetch(`/api/kanban/cards/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update card');
    }
    const result = await response.json();
    return { card: result.card };
  },

  // Delete card
  deleteCard: async (id: string, organizationId: string): Promise<void> => {
    const response = await fetch(`/api/kanban/cards/${id}`, {
      method: 'DELETE',
      headers: {
        'x-organization-id': organizationId,
      }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete card');
    }
  },

  // Bulk card operations
  bulkCardOperations: async (data: BulkCardOperation): Promise<BulkOperationResponse> => {
    const response = await fetch('/api/kanban/cards/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to perform bulk operation');
    }
    return await response.json();
  },

  // Reorder cards
  reorderCards: async (listId: string, cardPositions: CardPosition[]): Promise<ReorderResponse> => {
    const response = await fetch('/api/kanban/cards/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_id: listId, card_positions: cardPositions })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to reorder cards');
    }
    return await response.json();
  },

  // ===== CARD MEMBERS =====

  // Assign project member to card
  assignCardMember: async (cardId: string, projectMemberId: string, organizationId: string): Promise<{ card_member: CardMember }> => {
    const response = await fetch('/api/kanban/card-members', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': organizationId,
      },
      body: JSON.stringify({ card_id: cardId, project_member_id: projectMemberId, organizationId })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to assign card member');
    }
    return await response.json();
  },

  // Remove project member from card
  removeCardMember: async (cardId: string, projectMemberId: string, organizationId: string): Promise<void> => {
    const response = await fetch(`/api/kanban/card-members?card_id=${cardId}&project_member_id=${projectMemberId}&organizationId=${organizationId}`, {
      method: 'DELETE',
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to remove card member');
    }
  },

  // ===== LABELS =====

  // Get labels by board
  getLabels: async (boardId: string, organizationId: string): Promise<LabelsResponse> => {
    const response = await fetch(`/api/kanban/labels?board_id=${boardId}&organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch labels');
    }
    const data = await response.json();
    return { labels: data.labels || [] };
  },

  // Create label
  createLabel: async (data: CreateLabelData & { organizationId: string }): Promise<LabelResponse> => {
    const response = await fetch('/api/kanban/labels', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create label');
    }
    const result = await response.json();
    return { label: result.label };
  },

  // Update label
  updateLabel: async (id: string, data: UpdateLabelData): Promise<LabelResponse> => {
    const response = await fetch(`/api/kanban/labels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update label');
    }
    const result = await response.json();
    return { label: result.label };
  },

  // Delete label
  deleteLabel: async (id: string): Promise<void> => {
    const response = await fetch(`/api/kanban/labels/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete label');
    }
  },

  // ===== CARD LABELS =====

  // Assign label to card
  assignCardLabel: async (cardId: string, labelId: string, organizationId: string): Promise<{ card_label: CardLabel }> => {
    const response = await fetch('/api/kanban/card-labels', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': organizationId,
      },
      body: JSON.stringify({ card_id: cardId, label_id: labelId, organizationId })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to assign card label');
    }
    return await response.json();
  },

  // Remove label from card
  removeCardLabel: async (cardId: string, labelId: string, organizationId: string): Promise<void> => {
    const response = await fetch(`/api/kanban/card-labels?card_id=${cardId}&label_id=${labelId}&organizationId=${organizationId}`, {
      method: 'DELETE',
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to remove card label');
    }
  },

  // ===== CHECKLISTS =====

  // Get checklists by card
  getChecklists: async (cardId: string, organizationId: string): Promise<ChecklistsResponse> => {
    const response = await fetch(`/api/kanban/checklists?card_id=${cardId}&organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch checklists');
    }
    const data = await response.json();
    return { checklists: data.checklists || [] };
  },

  // Create checklist
  createChecklist: async (data: CreateChecklistData): Promise<ChecklistResponse> => {
    const response = await fetch('/api/kanban/checklists', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checklist');
    }
    const result = await response.json();
    return { checklist: result.checklist };
  },

  // Update checklist
  updateChecklist: async (id: string, data: UpdateChecklistData): Promise<ChecklistResponse> => {
    const response = await fetch(`/api/kanban/checklists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update checklist');
    }
    const result = await response.json();
    return { checklist: result.checklist };
  },

  // Delete checklist
  deleteChecklist: async (id: string): Promise<void> => {
    const response = await fetch(`/api/kanban/checklists/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete checklist');
    }
  },

  // ===== CHECKLIST ITEMS =====

  // Create checklist item
  createChecklistItem: async (data: CreateChecklistItemData): Promise<ChecklistItemResponse> => {
    const response = await fetch('/api/kanban/checklist-items', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checklist item');
    }
    const result = await response.json();
    return { checklist_item: result.checklist_item };
  },

  // Update checklist item
  updateChecklistItem: async (id: string, data: UpdateChecklistItemData): Promise<ChecklistItemResponse> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (data.organizationId) {
      headers['x-organization-id'] = data.organizationId;
    }
    
    const response = await fetch(`/api/kanban/checklist-items/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update checklist item');
    }
    const result = await response.json();
    return { checklist_item: result.checklist_item };
  },

  // Delete checklist item
  deleteChecklistItem: async (id: string): Promise<void> => {
    const response = await fetch(`/api/kanban/checklist-items/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete checklist item');
    }
  },

  // ===== COMMENTS =====

  // Get comments by card
  getComments: async (cardId: string, organizationId: string): Promise<CommentsResponse> => {
    const response = await fetch(`/api/kanban/comments?card_id=${cardId}&organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch comments');
    }
    const data = await response.json();
    return { comments: data.comments || [] };
  },

  // Create comment
  createComment: async (data: CreateCommentData): Promise<CommentResponse> => {
    const response = await fetch('/api/kanban/comments', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-organization-id': data.organizationId,
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create comment');
    }
    const result = await response.json();
    return { comment: result.comment };
  },

  // Update comment
  updateComment: async (id: string, data: UpdateCommentData): Promise<CommentResponse> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (data.organizationId) {
      headers['x-organization-id'] = data.organizationId;
    }
    
    const response = await fetch(`/api/kanban/comments/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update comment');
    }
    const result = await response.json();
    return { comment: result.comment };
  },

  // Delete comment
  deleteComment: async (id: string): Promise<void> => {
    const response = await fetch(`/api/kanban/comments/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete comment');
    }
  },

  // ===== ATTACHMENTS =====

  // Get attachments by card
  getAttachments: async (cardId: string, organizationId: string): Promise<AttachmentsResponse> => {
    const response = await fetch(`/api/kanban/attachments?card_id=${cardId}&organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch attachments');
    }
    const data = await response.json();
    return { attachments: data.attachments || [] };
  },

  // Create attachment (upload file)
  createAttachment: async (data: CreateAttachmentData): Promise<AttachmentResponse> => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('card_id', data.card_id);
    formData.append('organizationId', data.organizationId);

    const response = await fetch('/api/kanban/attachments', {
      method: 'POST',
      headers: {
        'x-organization-id': data.organizationId,
      },
      body: formData
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload attachment');
    }
    const result = await response.json();
    return { attachment: result.attachment };
  },

  // Get attachment download URL
  getAttachmentDownload: async (id: string): Promise<AttachmentDownloadResponse> => {
    const response = await fetch(`/api/kanban/attachments/${id}`, {
      method: 'GET'
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get attachment');
    }
    return await response.json();
  },

  // Delete attachment
  deleteAttachment: async (id: string): Promise<void> => {
    const response = await fetch(`/api/kanban/attachments/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete attachment');
    }
  },

  // ===== ACTIVITIES =====

  // Get activities by board
  getActivitiesByBoard: async (boardId: string, limit = 50, offset = 0): Promise<ActivitiesResponse> => {
    const response = await fetch(`/api/kanban/activities?board_id=${boardId}&limit=${limit}&offset=${offset}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch activities');
    }
    return await response.json();
  },

  // Get activities by card
  getActivitiesByCard: async (cardId: string, limit = 50, offset = 0, organizationId: string): Promise<ActivitiesResponse> => {
    const response = await fetch(`/api/kanban/activities?card_id=${cardId}&limit=${limit}&offset=${offset}&organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch activities');
    }
    return await response.json();
  },

  // ===== NOTIFICATIONS =====

  // Get user notifications
  getNotifications: async (isRead?: boolean, limit = 50, offset = 0): Promise<NotificationsResponse> => {
    let url = `/api/kanban/notifications?limit=${limit}&offset=${offset}`;
    if (isRead !== undefined) {
      url += `&is_read=${isRead}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch notifications');
    }
    return await response.json();
  },

  // Create notification
  createNotification: async (data: CreateNotificationData): Promise<{ notification: BoardNotification }> => {
    const response = await fetch('/api/kanban/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create notification');
    }
    return await response.json();
  }
};

// Export all types
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
  Attachment,
  Activity,
  BoardNotification,
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
  CreateNotificationData,
  BoardsResponse,
  BoardResponse,
  ListsResponse,
  ListResponse,
  CardsResponse,
  CardResponse,
  LabelsResponse,
  LabelResponse,
  ChecklistsResponse,
  ChecklistResponse,
  ChecklistItemResponse,
  CommentsResponse,
  CommentResponse,
  AttachmentsResponse,
  AttachmentResponse,
  AttachmentDownloadResponse,
  ActivitiesResponse,
  NotificationsResponse,
  BulkOperationResponse,
  ReorderResponse
};
