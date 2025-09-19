"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  X,
  Calendar,
  CheckSquare,
  Paperclip,
  MessageSquare,
  User,
  Plus,
  Edit3,
  Tag,
  Copy,
  Archive,
  ArchiveRestore,
  Trash,
  Clock,
  Image,
  Eye,
  MoreHorizontal,
  ChevronDown,
  FileText,
  Download,
  Settings,
  Bell,
  Volume2,
  Save,
  EyeOff,
} from "lucide-react";
import { kanbanAPI } from "@/utils/api/kanban";
import {
  Card,
  Comment,
  Activity,
  Checklist,
  ChecklistItem,
  Attachment,
} from "@/utils/api/kanban";
import LabelsModal from "./LabelsModal";
import MembersModal from "./MembersModal";
import CoverModal from "./CoverModal";
import DatesModal from "./DatesModal";
import ChecklistModal from "./ChecklistModal";
import AttachmentsModal from "./AttachmentsModal";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { dateUtils } from "@/utils/dateUtils";

interface LabelsResponse {
  labels: any[];
}

interface MembersResponse {
  project_members: any[];
}

interface ProjectMember {
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

interface CardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  projectMembers: ProjectMember[];
  organizationId: string;
  boardId: string;
  projectId: string;
  onCardUpdate: (updatedCard: Card) => void;
}

export default function CardDetailModal({
  isOpen,
  onClose,
  card,
  projectMembers,
  organizationId,
  boardId,
  projectId,
  onCardUpdate,
}: CardDetailModalProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedCard, setEditedCard] = useState<Card>(card);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"activity" | "comments">(
    "activity"
  );
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);

  // Modal states
  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);

  const [deletingChecklistId, setDeletingChecklistId] = useState<string | null>(
    null
  );
  const [updatingChecklistItemId, setUpdatingChecklistItemId] = useState<
    string | null
  >(null);

  // Checklist item states
  const [addingItemToChecklist, setAddingItemToChecklist] = useState<
    string | null
  >(null);
  const [newItemContent, setNewItemContent] = useState("");
  const [addingItemSubmitting, setAddingItemSubmitting] = useState(false);

  const invalidateKanbanBoard = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["kanban-board-data", projectId, organizationId],
    });
  }, [queryClient, projectId, organizationId]);

  useEffect(() => {
    if (isOpen) {
      // Ensure card has the expected structure and remove any unexpected properties
      const cleanCard = {
        ...card,
        labels: card.labels || [],
        card_members: card.card_members || [],
        checklists: card.checklists || [],
        comments: card.comments || [],
        attachments: card.attachments || [],
      };
      // Remove any unexpected properties that might cause rendering issues
      delete (cleanCard as any).card_title;
      setEditedCard(cleanCard);
      loadComments();
      loadActivities();
    }
  }, [isOpen, card]);

  const { data: labelsData, isLoading: labelsLoading } =
    useQuery<LabelsResponse>({
      queryKey: ["board-labels", boardId, organizationId],
      queryFn: async () => {
        const response = await kanbanAPI.getLabels(boardId, organizationId);
        return response;
      },
      enabled: !!boardId && !!organizationId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const dropdown = document.querySelector("[data-dropdown-menu]");

      if (showDropdownMenu && dropdown && !dropdown.contains(target)) {
        setShowDropdownMenu(false);
      }
    };

    if (showDropdownMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdownMenu]);

  const loadComments = async () => {
    try {
      const response = await kanbanAPI.getComments(card.id, organizationId);
      setComments(response.comments || []);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await kanbanAPI.getActivitiesByCard(
        card.id,
        50,
        0,
        organizationId
      );
      setActivities(response.activities || []);
    } catch (error) {
      console.error("Error loading activities:", error);
    }
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      const response = await kanbanAPI.updateCard(card.id, {
        title: editedCard.title,
        description: editedCard.description,
        due_date: editedCard.due_date,
        cover_color: editedCard.cover?.color || editedCard.cover_color,
        cover_image: editedCard.cover?.image || editedCard.cover_image,
        organizationId,
      });
      invalidateKanbanBoard();
      onCardUpdate(response.card);

      // Reset edit states based on what was being edited
      if (isEditingTitle) {
        setIsEditingTitle(false);
        toast.success("Title updated successfully!");
      }
      if (isEditingDescription) {
        setIsEditingDescription(false);
        toast.success("Description updated successfully!");
      }
    } catch (error) {
      console.error("Error updating card:", error);
      toast.error("Failed to update card");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await kanbanAPI.createComment({
        card_id: card.id,
        content: newComment,
        organizationId,
      });
      setComments((prev) => [response.comment, ...prev]);
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    try {
      setIsSubmitting(true);
      const response = await kanbanAPI.updateComment(commentId, {
        content: newContent,
        organizationId,
      });
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? response.comment : comment
        )
      );
    } catch (error) {
      console.error("Error updating comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      setIsSubmitting(true);
      await kanbanAPI.deleteComment(commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditingCommentContent(currentContent);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  const saveEditingComment = async () => {
    if (!editingCommentId || !editingCommentContent.trim()) return;

    await handleEditComment(editingCommentId, editingCommentContent);
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  const handleArchiveCard = async () => {
    try {
      console.log("Archiving card:", card.id);
      setIsSubmitting(true);
      const response = await kanbanAPI.updateCard(card.id, {
        is_archived: true,
        organizationId,
      });

      // Update the card state
      invalidateKanbanBoard();
      const archivedCard = { ...response.card, is_archived: true };
      setEditedCard(archivedCard);

      // Call the parent callback to update the card in the main view
      onCardUpdate(archivedCard);

      toast.success("Card archived successfully!");
      setShowDropdownMenu(false);
      onClose(); // Close modal after archiving
    } catch (error) {
      console.error("Error archiving card:", error);
      toast.error("Failed to archive card");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnarchiveCard = async () => {
    try {
      setIsSubmitting(true);
      const response = await kanbanAPI.updateCard(card.id, {
        is_archived: false,
        organizationId,
      });

      // Update the card state
      const unarchivedCard = { ...response.card, is_archived: false };
      setEditedCard(unarchivedCard);
      invalidateKanbanBoard();

      // Call the parent callback to update the card in the main view
      onCardUpdate(unarchivedCard);

      toast.success("Card unarchived successfully!");
      setShowDropdownMenu(false);
    } catch (error) {
      console.error("Error unarchiving card:", error);
      toast.error("Failed to unarchive card");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLabelsChange = async (labelIds: string[]) => {
    try {
      setIsSubmitting(true);
      console.log("Labels change requested:", labelIds);

      // Get current label IDs
      const currentLabelIds = editedCard.labels?.map((label) => label.id) || [];
      console.log("Current label IDs:", currentLabelIds);

      // Find labels to add (new labels that aren't currently assigned)
      const labelsToAdd = labelIds.filter(
        (id) => !currentLabelIds.includes(id)
      );
      console.log("Labels to add:", labelsToAdd);

      // Find labels to remove (current labels that aren't in the new selection)
      const labelsToRemove = currentLabelIds.filter(
        (id) => !labelIds.includes(id)
      );
      console.log("Labels to remove:", labelsToRemove);

      // Add new labels
      for (const labelId of labelsToAdd) {
        console.log("Adding label:", labelId);
        await kanbanAPI.assignCardLabel(card.id, labelId, organizationId);
      }

      // Remove labels
      for (const labelId of labelsToRemove) {
        console.log("Removing label:", labelId);
        await kanbanAPI.removeCardLabel(card.id, labelId, organizationId);
      }

      // Update the local state with the new labels
      // We need to fetch the updated card to get the new labels
      console.log("Fetching updated card...");
      const updatedCardResponse = await kanbanAPI.getCard(
        card.id,
        organizationId
      );
      const updatedCard = updatedCardResponse.card;
      console.log("Updated card labels:", updatedCard.labels);

      // Update both the edited card state and the original card
      setEditedCard((prev) => ({
        ...prev,
        labels: updatedCard.labels || [],
      }));
      invalidateKanbanBoard();

      // Call the parent callback to update the card in the main view
      onCardUpdate(updatedCard);

      // Show success feedback
      console.log("Labels updated successfully!");
      toast.success("Labels updated successfully!");
    } catch (error) {
      console.error("Error updating labels:", error);
      toast.error("Failed to update labels");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMembersChange = async (memberIds: string[]) => {
    try {
      setIsSubmitting(true);
      console.log("Members change requested:", memberIds);

      // Get current member IDs
      const currentMemberIds =
        editedCard.card_members?.map((cm) => cm.project_member_id) || [];
      console.log("Current member IDs:", currentMemberIds);

      // Find members to add (new members that aren't currently assigned)
      const membersToAdd = memberIds.filter(
        (id) => !currentMemberIds.includes(id)
      );
      console.log("Members to add:", membersToAdd);

      // Find members to remove (current members that aren't in the new selection)
      const membersToRemove = currentMemberIds.filter(
        (id) => !memberIds.includes(id)
      );
      console.log("Members to remove:", membersToRemove);

      // Add new members
      for (const memberId of membersToAdd) {
        console.log("Adding member:", memberId);
        await kanbanAPI.assignCardMember(card.id, memberId, organizationId);
      }

      // Remove members
      for (const memberId of membersToRemove) {
        console.log("Removing member:", memberId);
        await kanbanAPI.removeCardMember(card.id, memberId, organizationId);
      }

      // Update the local state with the new members
      // We need to fetch the updated card to get the new members
      console.log("Fetching updated card...");
      const updatedCardResponse = await kanbanAPI.getCard(
        card.id,
        organizationId
      );
      const updatedCard = updatedCardResponse.card;
      console.log("Updated card members:", updatedCard.card_members);

      // Update both the edited card state and the original card
      setEditedCard((prev) => ({
        ...prev,
        card_members: updatedCard.card_members || [],
      }));
      invalidateKanbanBoard();

      // Call the parent callback to update the card in the main view
      onCardUpdate(updatedCard);

      // Show success feedback
      console.log("Members updated successfully!");
      toast.success("Members updated successfully!");
    } catch (error) {
      console.error("Error updating members:", error);
      toast.error("Failed to update members");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCoverChange = async (cover: {
    color?: string;
    image?: string;
    size?: "small" | "large";
  }) => {
    try {
      setIsSubmitting(true);
      console.log("Cover change requested:", cover);

      // Update the card via API
      const response = await kanbanAPI.updateCard(card.id, {
        cover_color: cover.color,
        cover_image: cover.image,
        organizationId,
      });
      invalidateKanbanBoard();
      // Update both the edited card state and the original card
      setEditedCard((prev) => ({
        ...prev,
        cover: cover,
        cover_color: cover.color,
        cover_image: cover.image,
      }));

      // Call the parent callback to update the card in the main view
      onCardUpdate(response.card);

      // Show success feedback
      console.log("Cover updated successfully!");
      toast.success("Cover updated successfully!");
    } catch (error) {
      console.error("Error updating cover:", error);
      toast.error("Failed to update cover");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDatesChange = async (dates: { due_date?: string }) => {
    try {
      setIsSubmitting(true);
      console.log("Dates change requested:", dates);

      // Update the card via API
      const response = await kanbanAPI.updateCard(card.id, {
        due_date: dates.due_date,
        organizationId,
      });

      // Update both the edited card state and the original card
      setEditedCard((prev) => ({
        ...prev,
        due_date: dates.due_date,
      }));
      invalidateKanbanBoard();
      // Call the parent callback to update the card in the main view
      onCardUpdate(response.card);

      // Show success feedback
      console.log("Dates updated successfully!");
      toast.success("Due date updated successfully!");
    } catch (error) {
      console.error("Error updating dates:", error);
      toast.error("Failed to update due date");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChecklistsChange = (checklists: any[]) => {
    setEditedCard((prev) => ({
      ...prev,
      checklists,
    }));

    // Call the parent callback to update the card in the main view
    onCardUpdate({ ...editedCard, checklists });
  };

  const handleToggleChecklistItem = async (
    checklistId: string,
    itemId: string,
    isCompleted: boolean
  ) => {
    try {
      await kanbanAPI.updateChecklistItem(itemId, {
        is_completed: isCompleted,
        organizationId,
      });
      invalidateKanbanBoard();
      // Update local state
      const updatedChecklists =
        editedCard.checklists?.map((checklist) => {
          if (checklist.id === checklistId) {
            return {
              ...checklist,
              checklist_items: checklist.checklist_items?.map((item) =>
                item.id === itemId
                  ? { ...item, is_completed: isCompleted }
                  : item
              ),
            };
          }
          return checklist;
        }) || [];

      setEditedCard((prev) => ({
        ...prev,
        checklists: updatedChecklists,
      }));

      // Update parent component
      onCardUpdate({ ...editedCard, checklists: updatedChecklists });
    } catch (error) {
      console.error("Error updating checklist item:", error);
      toast.error("Failed to update checklist item");
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    try {
      setDeletingChecklistId(checklistId);
      await kanbanAPI.deleteChecklist(checklistId);
      invalidateKanbanBoard();
      // Update local state - remove the deleted checklist
      const updatedChecklists =
        editedCard.checklists?.filter(
          (checklist) => checklist.id !== checklistId
        ) || [];

      setEditedCard((prev) => ({
        ...prev,
        checklists: updatedChecklists,
      }));

      // Update parent component
      onCardUpdate({ ...editedCard, checklists: updatedChecklists });
      toast.success("Checklist deleted successfully!");
    } catch (error) {
      console.error("Error deleting checklist:", error);
      toast.error("Failed to delete checklist");
    } finally {
      setDeletingChecklistId(null);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      setUpdatingChecklistItemId(itemId);

      await kanbanAPI.deleteChecklistItem(itemId);
      invalidateKanbanBoard();
      // Update local state - remove the deleted item
      const updatedChecklists =
        editedCard.checklists?.map((checklist) => ({
          ...checklist,
          checklist_items:
            checklist.checklist_items?.filter((item) => item.id !== itemId) ||
            [],
        })) || [];

      setEditedCard((prev) => ({
        ...prev,
        checklists: updatedChecklists,
      }));

      // Update parent component
      onCardUpdate({ ...editedCard, checklists: updatedChecklists });
      toast.success("Item deleted successfully!");
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      toast.error("Failed to delete item");
    } finally {
      setUpdatingChecklistItemId(null);
    }
  };

  const handleAddChecklistItem = async (checklistId: string) => {
    if (!newItemContent.trim()) return;

    setAddingItemSubmitting(true);
    try {
      const response = await kanbanAPI.createChecklistItem({
        checklist_id: checklistId,
        content: newItemContent,
        organizationId,
      });
      invalidateKanbanBoard();
      // Update local state - add the new item
      const updatedChecklists =
        editedCard.checklists?.map((checklist) => {
          if (checklist.id === checklistId) {
            return {
              ...checklist,
              checklist_items: [
                ...(checklist.checklist_items || []),
                response.checklist_item,
              ],
            };
          }
          return checklist;
        }) || [];

      setEditedCard((prev) => ({
        ...prev,
        checklists: updatedChecklists,
      }));

      // Update parent component
      onCardUpdate({ ...editedCard, checklists: updatedChecklists });

      // Reset form
      setNewItemContent("");
      setAddingItemToChecklist(null);
      toast.success("Item added successfully!");
    } catch (error) {
      console.error("Error adding checklist item:", error);
      toast.error("Failed to add item");
    } finally {
      setAddingItemSubmitting(false);
    }
  };

  const handleAttachmentsChange = (attachments: any[]) => {
    setEditedCard((prev) => ({
      ...prev,
      attachments,
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatActivityDetails = (activity: Activity) => {
    if (typeof activity.details === "string") {
      return activity.details;
    }

    if (typeof activity.details === "object" && activity.details !== null) {
      const details = activity.details as any;

      switch (activity.action_type) {
        case "create":
          if (details.card_title) {
            return `created card "${details.card_title}"`;
          }
          return "created this card";

        case "update":
          // Check for member assignment/removal
          if (details.assigned_user_name) {
            return `assigned ${details.assigned_user_name} to this card`;
          }
          if (details.removed_user_name) {
            return `removed ${details.removed_user_name} from this card`;
          }
          if (details.card_title) {
            return `updated card "${details.card_title}"`;
          }
          return "updated this card";

        case "move":
          if (
            details.card_title &&
            details.to_list_name &&
            details.from_list_name
          ) {
            return `moved "${details.card_title}" from ${details.from_list_name} to ${details.to_list_name}`;
          }
          return "moved this card";

        case "archive":
          return "archived this card";

        case "restore":
          return "restored this card";

        case "complete":
          return "marked this card as complete";

        case "incomplete":
          return "marked this card as incomplete";

        default:
          return "performed an action on this card";
      }
    }

    return "performed an action on this card";
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Card Details
              </h2>
              <p className="text-sm text-gray-500">
                in {card.lists?.name || "List"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Three-dot menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdownMenu(!showDropdownMenu);
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {/* Dropdown Menu */}
                {showDropdownMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editedCard.is_archived) {
                            handleUnarchiveCard();
                          } else {
                            handleArchiveCard();
                          }
                        }}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {editedCard.is_archived ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                        {editedCard.is_archived
                          ? "Unarchive Card"
                          : "Archive Card"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex h-[calc(90vh-80px)]">
            {/* Left Column - Card Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Cover */}
              {editedCard.cover_color && (
                <div
                  className={`w-full rounded-lg mb-6 ${editedCard.cover?.size === "large" ? "h-32" : "h-4"}`}
                  style={{ backgroundColor: editedCard.cover_color }}
                />
              )}

              {/* Title */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Title</h3>
                  {!isEditingTitle && (
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      title="Edit title"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {isEditingTitle ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editedCard.title}
                      onChange={(e) =>
                        setEditedCard((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full text-xl font-semibold text-gray-900 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                      placeholder="Enter card title..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditedCard((prev) => ({
                            ...prev,
                            title: card.title,
                          }));
                          setIsEditingTitle(false);
                        }}
                        disabled={isSubmitting}
                        className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <h1 className="text-xl font-semibold text-gray-900">
                    {editedCard.title}
                  </h1>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setShowCoverModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  <Image className="h-4 w-4" />
                  Cover
                </button>
                <button
                  onClick={() => setShowLabelsModal(true)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Tag className="h-4 w-4" />
                  Labels
                  {editedCard.labels && editedCard.labels.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {editedCard.labels.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowMembersModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  <User className="h-4 w-4" />
                  Members
                </button>
                <button
                  onClick={() => setShowDatesModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  <Calendar className="h-4 w-4" />
                  Dates
                </button>
                <button
                  onClick={() => setShowChecklistModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  <CheckSquare className="h-4 w-4" />
                  Checklist
                </button>
                <button
                  onClick={() => setShowAttachmentsModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  <Paperclip className="h-4 w-4" />
                  Attachments
                </button>
              </div>
              {/* Card Info Bar - Members, Labels, Due Date */}
              <div className="flex flex-wrap items-center gap-6 mb-6 pb-4 border-b border-gray-100">
                {/* Members */}
                {editedCard.card_members &&
                  editedCard.card_members.length > 0 && (
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-700">
                        Members
                      </h3>
                      <div className="flex items-center gap-1">
                        {editedCard.card_members
                          .slice(0, 3)
                          .map((member, index) => (
                            <div
                              key={member.id || `member-${index}`}
                              className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                              title={
                                member.project_members.organization_members
                                  .users.full_name
                              }
                            >
                              {member.project_members.organization_members.users.full_name
                                ?.split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase() || "ZR"}
                            </div>
                          ))}
                        {editedCard.card_members.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium">
                            +{editedCard.card_members.length - 3}
                          </div>
                        )}
                        <button
                          onClick={() => setShowMembersModal(true)}
                          className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                {/* Labels */}
                {editedCard.labels && editedCard.labels.length > 0 && (
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-700">
                      Labels
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {editedCard.labels.map((label, index) => (
                        <div
                          key={label.id || `label-${index}`}
                          className="px-3 py-1 rounded text-sm font-medium text-white"
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                        </div>
                      ))}
                      <button
                        onClick={() => setShowLabelsModal(true)}
                        className="px-2 py-1 border-2 border-dashed border-gray-300 rounded text-gray-400 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Due Date */}
                {editedCard.due_date && (
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-700">
                      Due date
                    </h3>
                    <div className="flex items-center gap-1">
                      <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
                        {dateUtils.formatForDisplay(
                          editedCard.due_date,
                          "MMM d, yyyy h:mm a"
                        )}
                        <span className="ml-1 bg-yellow-200 text-yellow-900 px-1.5 py-0.5 rounded text-xs">
                          Due soon
                        </span>
                      </div>
                      <button
                        onClick={() => setShowDatesModal(true)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Add buttons for empty states */}
                {(!editedCard.card_members ||
                  editedCard.card_members.length === 0) && (
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-700">
                      Members
                    </h3>
                    <button
                      onClick={() => setShowMembersModal(true)}
                      className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {(!editedCard.labels || editedCard.labels.length === 0) && (
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-700">
                      Labels
                    </h3>
                    <button
                      onClick={() => setShowLabelsModal(true)}
                      className="px-2 py-1 border-2 border-dashed border-gray-300 rounded text-gray-400 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {!editedCard.due_date && (
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-700">
                      Due date
                    </h3>
                    <button
                      onClick={() => setShowDatesModal(true)}
                      className="px-2 py-1 border-2 border-dashed border-gray-300 rounded text-gray-400 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-medium text-gray-700">
                      Description
                    </h3>
                  </div>
                  {!isEditingDescription && (
                    <button
                      onClick={() => setIsEditingDescription(true)}
                      className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                      title="Edit description"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedCard.description || ""}
                      onChange={(e) =>
                        setEditedCard((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={4}
                      placeholder="Add a more detailed description..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditedCard((prev) => ({
                            ...prev,
                            description: card.description,
                          }));
                          setIsEditingDescription(false);
                        }}
                        disabled={isSubmitting}
                        className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded min-h-[100px]">
                    {editedCard.description || (
                      <p className="text-gray-500 italic">No description</p>
                    )}
                  </div>
                )}
              </div>

              {/* Checklists */}
              {editedCard.checklists &&
                editedCard.checklists.length > 0 &&
                editedCard.checklists.map((checklist, checklistIndex) => (
                  <div
                    key={checklist.id || `checklist-${checklistIndex}`}
                    className="mb-6"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-gray-600" />
                        <h3 className="text-sm font-medium text-gray-700">
                          {checklist.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {deletingChecklistId === checklist.id && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        )}
                        <button
                          onClick={() => handleDeleteChecklist(checklist.id)}
                          disabled={deletingChecklistId === checklist.id}
                          className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-red-200 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      {(() => {
                        const totalItems =
                          checklist.checklist_items?.length || 0;
                        const completedItems =
                          checklist.checklist_items?.filter(
                            (item) => item.is_completed
                          ).length || 0;
                        const percentage =
                          totalItems > 0
                            ? Math.round((completedItems / totalItems) * 100)
                            : 0;

                        return (
                          <>
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>{percentage}%</span>
                              <span>
                                {completedItems}/{totalItems}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Checklist Items */}
                    <div className="space-y-2 mb-3">
                      {checklist.checklist_items?.map((item, itemIndex) => (
                        <div
                          key={item.id || `item-${checklistIndex}-${itemIndex}`}
                          className="flex items-center gap-2 group"
                        >
                          <button
                            onClick={() =>
                              handleToggleChecklistItem(
                                checklist.id,
                                item.id,
                                !item.is_completed
                              )
                            }
                            disabled={updatingChecklistItemId === item.id}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              item.is_completed
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-gray-300 hover:border-blue-400"
                            }`}
                          >
                            {item.is_completed && (
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>
                          <span
                            className={`text-sm flex-1 ${item.is_completed ? "line-through text-gray-500" : "text-gray-700"}`}
                          >
                            {item.content}
                          </span>
                          {updatingChecklistItemId === item.id && (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
                          )}
                          <button
                            onClick={() => handleDeleteChecklistItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Item Button/Form */}
                    {addingItemToChecklist === checklist.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newItemContent}
                          onChange={(e) => setNewItemContent(e.target.value)}
                          placeholder="Add an item"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleAddChecklistItem(checklist.id);
                            } else if (e.key === "Escape") {
                              setAddingItemToChecklist(null);
                              setNewItemContent("");
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddChecklistItem(checklist.id)}
                            disabled={addingItemSubmitting}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addingItemSubmitting ? "Adding..." : "Add"}
                          </button>
                          <button
                            onClick={() => {
                              setAddingItemToChecklist(null);
                              setNewItemContent("");
                            }}
                            disabled={addingItemSubmitting}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingItemToChecklist(checklist.id)}
                        className="w-full text-left px-2 py-2 text-sm text-gray-600 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                      >
                        Add an item
                      </button>
                    )}
                  </div>
                ))}

              {/* Attachments */}
              {editedCard.attachments && editedCard.attachments.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-gray-600" />
                      <h3 className="text-sm font-medium text-gray-700">
                        Attachments
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {editedCard.attachments.map((attachment, index) => (
                      <div
                        key={attachment.id || `attachment-${index}`}
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {attachment.mime_type?.startsWith("image/") ? (
                            <Image className="h-5 w-5 text-blue-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.original_filename ||
                              attachment.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {((attachment.file_size || 0) / 1024).toFixed(1)} KB
                            •{" "}
                            {new Date(
                              attachment.uploaded_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              try {
                                const response =
                                  await kanbanAPI.getAttachmentDownload(
                                    attachment.id
                                  );
                                const link = document.createElement("a");
                                link.href = response.download_url;
                                link.download =
                                  attachment.original_filename ||
                                  attachment.filename;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              } catch (error) {
                                console.error(
                                  "Error downloading attachment:",
                                  error
                                );
                                toast.error("Failed to download file");
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-blue-500"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await kanbanAPI.deleteAttachment(attachment.id);
                                const updatedAttachments =
                                  editedCard.attachments?.filter(
                                    (a) => a.id !== attachment.id
                                  ) || [];
                                setEditedCard((prev) => ({
                                  ...prev,
                                  attachments: updatedAttachments,
                                }));
                                onCardUpdate({
                                  ...editedCard,
                                  attachments: updatedAttachments,
                                });
                                toast.success("File deleted successfully!");
                              } catch (error) {
                                console.error(
                                  "Error deleting attachment:",
                                  error
                                );
                                toast.error("Failed to delete file");
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Activity & Comments */}
            <div className="w-80 border-l border-gray-200 flex flex-col">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("activity")}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${
                    activeTab === "activity"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Activity
                </button>
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${
                    activeTab === "comments"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Comments
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "activity" ? (
                  <div className="space-y-4">
                    {activities.map((activity, index) => (
                      <div
                        key={activity.id || `activity-${index}`}
                        className="flex gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                          {activity.users.full_name
                            ?.split(" ")
                            .map((n: string, i: number) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">
                              {activity.users.full_name}
                            </span>{" "}
                            {formatActivityDetails(activity)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Add Comment */}
                    <div className="space-y-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                      >
                        Comment
                      </button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-4">
                      {comments.map((comment, index) => (
                        <div
                          key={comment.id || `comment-${index}`}
                          className="flex gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                            {comment.users.full_name
                              ?.split(" ")
                              .map((n: string, i: number) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="flex-1">
                            {editingCommentId === comment.id ? (
                              // Edit mode
                              <div className="space-y-2">
                                <textarea
                                  value={editingCommentContent}
                                  onChange={(e) =>
                                    setEditingCommentContent(e.target.value)
                                  }
                                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={saveEditingComment}
                                    disabled={
                                      !editingCommentContent.trim() ||
                                      isSubmitting
                                    }
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditingComment}
                                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-medium"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <div>
                                <div className="bg-gray-50 rounded-lg p-3 group">
                                  <div className="flex justify-between items-start">
                                    <p className="text-sm text-gray-900 flex-1">
                                      {comment.content}
                                    </p>
                                    {session?.user?.id === comment.user_id && (
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
                                        <button
                                          onClick={() =>
                                            startEditingComment(
                                              comment.id,
                                              comment.content
                                            )
                                          }
                                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                          title="Edit comment"
                                        >
                                          <Edit3 className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeleteComment(comment.id)
                                          }
                                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                                          title="Delete comment"
                                        >
                                          <Trash className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  <p className="text-xs text-gray-500">
                                    {formatDate(comment.created_at)}
                                  </p>
                                  {comment.updated_at !==
                                    comment.created_at && (
                                    <p className="text-xs text-gray-400 italic">
                                      (edited)
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {console.log("LabelsModal props:", {
        boardId,
        organizationId,
        selectedLabels: editedCard.labels?.map((l) => l.id) || [],
        labels: editedCard.labels,
      })}
      <LabelsModal
        isOpen={showLabelsModal}
        onClose={() => setShowLabelsModal(false)}
        boardId={boardId}
        organizationId={organizationId}
        selectedLabels={editedCard.labels?.map((label) => label.id) || []}
        onLabelsChange={handleLabelsChange}
        labels={labelsData?.labels || []}
        isLoading={labelsLoading}
      />

      <MembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        projectId={projectId}
        organizationId={organizationId}
        selectedMembers={
          editedCard.card_members?.map((m) => m.project_member_id) || []
        }
        onMembersChange={handleMembersChange}
        members={projectMembers}
      />

      <CoverModal
        isOpen={showCoverModal}
        onClose={() => setShowCoverModal(false)}
        currentCover={editedCard.cover || {}}
        onCoverChange={handleCoverChange}
      />

      <DatesModal
        isOpen={showDatesModal}
        onClose={() => setShowDatesModal(false)}
        currentDates={{
          due_date: editedCard.due_date,
        }}
        onDatesChange={handleDatesChange}
      />

      <ChecklistModal
        isOpen={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        cardId={card.id}
        organizationId={organizationId}
        checklists={(editedCard.checklists || []).map((checklist) => ({
          ...checklist,
          checklist_items: checklist.checklist_items || [],
        }))}
        onChecklistsChange={handleChecklistsChange}
      />

      <AttachmentsModal
        isOpen={showAttachmentsModal}
        onClose={() => setShowAttachmentsModal(false)}
        cardId={card.id}
        organizationId={organizationId}
        attachments={(editedCard.attachments || []).map((attachment) => ({
          id: attachment.id,
          filename: attachment.filename,
          original_filename: attachment.original_filename,
          file_size: attachment.file_size,
          mime_type: attachment.mime_type,
          file_path: attachment.file_path,
          uploaded_at: attachment.uploaded_at,
          users: attachment.users,
        }))}
        onAttachmentsChange={handleAttachmentsChange}
        projectId={projectId}
        boardId={boardId}
      />
    </>
  );
}
