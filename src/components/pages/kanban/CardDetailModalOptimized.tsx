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

// Import our optimized hooks
import {
  useCard,
  useComments,
  useActivitiesByCard,
  useChecklists,
  useAttachments,
  useUpdateCard,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useCreateChecklist,
  useUpdateChecklist,
  useDeleteChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
  useCreateAttachment,
  useDeleteAttachment,
  useArchiveCard,
} from "@/lib/hooks/useKanban";

import LabelsModal from "./LabelsModal";
import MembersModal from "./MembersModal";
import CoverModal from "./CoverModal";
import DatesModal from "./DatesModal";
import ChecklistModal from "./ChecklistModal";
import AttachmentsModal from "./AttachmentsModal";

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

interface CardDetailModalOptimizedProps {
  isOpen: boolean;
  onClose: () => void;
  card: any; // Card type from API
  projectMembers: ProjectMember[];
  organizationId: string;
  boardId: string;
  projectId: string;
  onCardUpdate: (updatedCard: any) => void;
}

export default function CardDetailModalOptimized({
  isOpen,
  onClose,
  card,
  projectMembers,
  organizationId,
  boardId,
  projectId,
  onCardUpdate,
}: CardDetailModalOptimizedProps) {
  const { data: session } = useSession();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedCard, setEditedCard] = useState(card);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"activity" | "comments">(
    "activity"
  );
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);

  // TanStack Query hooks
  const { data: cardData, isLoading: cardLoading } = useCard(
    card.id,
    organizationId
  );
  const { data: commentsData, isLoading: commentsLoading } = useComments(
    card.id,
    organizationId
  );
  const { data: activitiesData, isLoading: activitiesLoading } =
    useActivitiesByCard(card.id, organizationId);
  const { data: checklistsData, isLoading: checklistsLoading } = useChecklists(
    card.id,
    organizationId
  );
  const { data: attachmentsData, isLoading: attachmentsLoading } =
    useAttachments(card.id, organizationId);

  // Mutations
  const updateCardMutation = useUpdateCard();
  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();
  const createChecklistMutation = useCreateChecklist();
  const updateChecklistMutation = useUpdateChecklist();
  const deleteChecklistMutation = useDeleteChecklist();
  const createChecklistItemMutation = useCreateChecklistItem();
  const updateChecklistItemMutation = useUpdateChecklistItem();
  const deleteChecklistItemMutation = useDeleteChecklistItem();
  const createAttachmentMutation = useCreateAttachment();
  const deleteAttachmentMutation = useDeleteAttachment();
  const archiveCardMutation = useArchiveCard();

  // Update local state when card data changes
  useEffect(() => {
    if (cardData) {
      setEditedCard(cardData);
    }
  }, [cardData]);

  // Event handlers
  const handleTitleSave = async () => {
    if (!editedCard.title.trim()) return;

    try {
      await updateCardMutation.mutateAsync({
        id: card.id,
        data: { title: editedCard.title, organizationId: organizationId },
      });
      setIsEditingTitle(false);
      toast.success("Title updated successfully");
    } catch (error) {
      toast.error("Failed to update title");
    }
  };

  const handleDescriptionSave = async () => {
    try {
      await updateCardMutation.mutateAsync({
        id: card.id,
        data: {
          description: editedCard.description,
          organizationId: organizationId,
        },
      });
      setIsEditingDescription(false);
      toast.success("Description updated successfully");
    } catch (error) {
      toast.error("Failed to update description");
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;

    try {
      await createCommentMutation.mutateAsync({
        card_id: card.id,
        content: newComment,
        organizationId: organizationId,
      });
      setNewComment("");
      toast.success("Comment added successfully");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const handleCommentUpdate = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;

    try {
      await updateCommentMutation.mutateAsync({
        id: commentId,
        data: {
          content: editingCommentContent,
          organizationId: organizationId,
        },
      });
      setEditingCommentId(null);
      setEditingCommentContent("");
      toast.success("Comment updated successfully");
    } catch (error) {
      toast.error("Failed to update comment");
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    try {
      await deleteCommentMutation.mutateAsync(commentId);
      toast.success("Comment deleted successfully");
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const handleArchiveCard = async () => {
    try {
      await archiveCardMutation.mutateAsync({
        cardId: card.id,
        isArchived: !card.is_archived,
        organizationId,
      });
      toast.success(
        `Card ${card.is_archived ? "restored" : "archived"} successfully`
      );
      onClose();
    } catch (error) {
      toast.error(`Failed to ${card.is_archived ? "restore" : "archive"} card`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Card Details
            </h2>
            {card.is_archived && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                Archived
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Title */}
            <div className="mb-6">
              {isEditingTitle ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editedCard.title}
                    onChange={(e) =>
                      setEditedCard({ ...editedCard, title: e.target.value })
                    }
                    className="flex-1 text-xl font-semibold border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                    autoFocus
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTitleSave();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                  />
                  <button
                    onClick={handleTitleSave}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Save className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              ) : (
                <h1
                  className="text-xl font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {editedCard.title}
                </h1>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Description
              </h3>
              {isEditingDescription ? (
                <div className="space-y-2">
                  <textarea
                    value={editedCard.description || ""}
                    onChange={(e) =>
                      setEditedCard({
                        ...editedCard,
                        description: e.target.value,
                      })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                    placeholder="Add a description..."
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleDescriptionSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingDescription(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="min-h-[60px] p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setIsEditingDescription(true)}
                >
                  {editedCard.description ? (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {editedCard.description}
                    </p>
                  ) : (
                    <p className="text-gray-400">Add a description...</p>
                  )}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Comments
              </h3>

              {/* Add Comment */}
              <div className="mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleCommentSubmit}
                    disabled={!newComment.trim() || isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? "Adding..." : "Add Comment"}
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {commentsLoading ? (
                  <div className="text-center py-4 text-gray-500">
                    Loading comments...
                  </div>
                ) : commentsData?.comments.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No comments yet
                  </div>
                ) : (
                  commentsData?.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {comment.users?.full_name?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {comment.users?.full_name || "Unknown User"}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(
                                comment.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingCommentContent}
                                onChange={(e) =>
                                  setEditingCommentContent(e.target.value)
                                }
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                rows={2}
                                autoFocus
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() =>
                                    handleCommentUpdate(comment.id)
                                  }
                                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentContent("");
                                  }}
                                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <p className="text-gray-700 whitespace-pre-wrap">
                                {comment.content}
                              </p>
                              {comment.user_id === session?.user?.id && (
                                <div className="flex space-x-1 ml-2">
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditingCommentContent(comment.content);
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Edit3 className="h-3 w-3 text-gray-500" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleCommentDelete(comment.id)
                                    }
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Trash className="h-3 w-3 text-gray-500" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-gray-200 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Actions */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={handleArchiveCard}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {card.is_archived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 text-gray-500" />
                        <span>Restore Card</span>
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 text-gray-500" />
                        <span>Archive Card</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Card Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Card Info
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    Created: {new Date(card.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    Updated: {new Date(card.updated_at).toLocaleDateString()}
                  </div>
                  <div>Position: {card.position}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
