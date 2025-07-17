"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { X, Calendar, CheckSquare, Paperclip, MessageSquare, User, Plus, Edit3, Tag, Copy, Archive, Trash } from "lucide-react"
import { kanbanAPI } from "@/utils/api/kanban"
import { Card, Comment, Activity, Checklist, ChecklistItem } from "@/utils/api/kanban"

interface ProjectMember {
  user_id: string;
  role?: string;
  joined_at?: string;
  users: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface CardDetailModalProps {
  card: Card
  isOpen: boolean
  onClose: () => void
  projectMembers: ProjectMember[]
  boardId?: string
  onCardUpdate: () => void
}

// Combined type for activity feed
type ActivityFeedItem = (Activity & { type: 'activity' }) | (Comment & { type: 'comment' })

export default function CardDetailModal({
  card,
  isOpen,
  onClose,
  projectMembers,
  boardId,
  onCardUpdate
}: CardDetailModalProps) {
  const { data: session } = useSession()
  const [cardData, setCardData] = useState<Card>(card)
  const [activities, setActivities] = useState<Activity[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState(card.description || "")
  const [newComment, setNewComment] = useState("")
  const [listNames, setListNames] = useState<Record<string, string>>({})

  const loadCardDetails = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Load full card details
      const cardResponse = await kanbanAPI.getCard(card.id)
      setCardData(cardResponse.card)
      
      // Load activities for this specific card
      const activitiesResponse = await kanbanAPI.getActivitiesByCard(card.id)
      setActivities(activitiesResponse.activities)

      // Load comments
      const commentsResponse = await kanbanAPI.getComments(card.id)
      setComments(commentsResponse.comments)

      // Load checklists
      const checklistsResponse = await kanbanAPI.getChecklists(card.id)
      setChecklists(checklistsResponse.checklists)

    } catch (error) {
      console.error("Error loading card details:", error)
    } finally {
      setIsLoading(false)
    }
  }, [card.id])

  useEffect(() => {
    if (isOpen && card.id) {
      loadCardDetails()
    }
  }, [isOpen, card.id, loadCardDetails])

  // Fetch list names for better activity descriptions
  useEffect(() => {
    const fetchListNames = async () => {
      try {
        if (!boardId) return;
        const response = await kanbanAPI.getLists(boardId);
        // Handle the response structure properly
        const lists = Array.isArray(response) ? response : (response as any)?.data || [];
        const nameMap = lists.reduce((acc: Record<string, string>, list: any) => {
          acc[list.id] = list.name;
          return acc;
        }, {});
        setListNames(nameMap);
        console.log('Fetched list names:', nameMap); // Debug log
      } catch (error) {
        console.error('Error fetching list names:', error);
      }
    };
    
    fetchListNames();
  }, [boardId]);

  const getActivityDescription = (activity: any) => {
    const details = activity.details;
    
    switch (activity.action_type) {
      case 'create':
        return 'added this card';
      case 'move':
        if (details?.from_list_name && details?.to_list_name) {
          // Use stored list names (new format)
          return `moved this card from "${details.from_list_name}" to "${details.to_list_name}"`;
        } else if (details?.from_list_id && details?.to_list_id && listNames[details.from_list_id] && listNames[details.to_list_id]) {
          // Use fetched list names (fallback for old format)
          return `moved this card from "${listNames[details.from_list_id]}" to "${listNames[details.to_list_id]}"`;
        } else if (details?.from_list_id && details?.to_list_id) {
          // Show shortened IDs as fallback
          const fromId = details.from_list_id.slice(0, 8);
          const toId = details.to_list_id.slice(0, 8);
          return `moved this card from "List ${fromId}..." to "List ${toId}..."`;
        }
        return 'moved this card';
      case 'update':
        if (details?.action === 'reorder_lists') {
          return 'reordered lists on this board';
        }
        if (details?.changes) {
          const changes = details.changes;
          if (changes.title) return 'updated the title';
          if (changes.description !== undefined) return 'updated the description';
          if (changes.due_date) return 'updated the due date';
          if (changes.completed !== undefined) return changes.completed ? 'marked this card complete' : 'marked this card incomplete';
        }
        return 'updated this card';
      case 'delete':
        return 'deleted this card';
      case 'archive':
        return 'archived this card';
      case 'restore':
        return 'restored this card';
      case 'comment':
        return 'commented on this card';
      case 'member_add':
        return `added ${details?.added_user_name || 'a member'} to this card`;
      case 'member_remove':
        return `removed ${details?.removed_user_name || 'a member'} from this card`;
      case 'checklist_add':
        return `added checklist "${details?.checklist_name || 'checklist'}"`;
      case 'checklist_complete':
        return `completed checklist "${details?.checklist_name || 'checklist'}"`;
      case 'checklist_item_add':
        return `added item "${details?.item_text || 'item'}" to checklist`;
      case 'checklist_item_complete':
        return `completed "${details?.item_text || 'item'}" on checklist`;
      default:
        return 'performed an action on this card';
    }
  };

  const handleSaveDescription = async () => {
    try {
      await kanbanAPI.updateCard(card.id, { description: editedDescription })
      setCardData(prev => ({ ...prev, description: editedDescription }))
      setIsEditingDescription(false)
      onCardUpdate()
    } catch (error) {
      console.error("Error updating description:", error)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      await kanbanAPI.createComment({
        card_id: card.id,
        content: newComment
      })
      setNewComment("")
      loadCardDetails() // Reload to get the new comment
    } catch (error) {
      console.error("Error adding comment:", error)
    }
  }

  const handleAssignMember = async (userId: string) => {
    try {
      await kanbanAPI.assignCardMember(card.id, userId)
      loadCardDetails()
      onCardUpdate()
    } catch (error) {
      console.error("Error assigning member:", error)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      await kanbanAPI.removeCardMember(card.id, userId)
      loadCardDetails()
      onCardUpdate()
    } catch (error) {
      console.error("Error removing member:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'create':
        return <Plus className="h-4 w-4" />
      case 'update':
        return <Edit3 className="h-4 w-4" />
      case 'comment':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 px-8 py-6 border-b border-orange-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-orange-100">
                  <CheckSquare className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{cardData.title}</h1>
                  <p className="text-sm text-gray-600">
                    in list <span className="font-semibold text-orange-600">List</span>
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/80 rounded-2xl transition-all duration-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-140px)]">
          {/* Main Content Area */}
          <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-gray-50/50 to-orange-50/30">
            {/* Members Section */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
                  <User className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Members</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {cardData.card_members?.map((member) => {
                  const projectMember = projectMembers.find(pm => pm.user_id === member.user_id)
                  return (
                    <div 
                      key={member.user_id} 
                      className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-orange-200 hover:border-orange-300 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                        {projectMember?.users.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">
                          {projectMember?.users.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">{projectMember?.role || 'Member'}</p>
                      </div>
                      <button className="ml-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all duration-200">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
                <button className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 text-orange-600 rounded-xl border-2 border-dashed border-orange-300 hover:border-orange-400 transition-all duration-200 text-sm">
                  <div className="w-7 h-7 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="font-medium">Add member</span>
                </button>
              </div>
            </div>

            {/* Description Section */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                    <Edit3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Description</h3>
                </div>
                <button
                  onClick={() => setIsEditingDescription(!isEditingDescription)}
                  className="px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-xl transition-all duration-200"
                >
                  {isEditingDescription ? 'Cancel' : 'Edit'}
                </button>
              </div>
              
              {isEditingDescription ? (
                <div className="space-y-4">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full p-4 border border-orange-200 rounded-2xl resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm shadow-sm transition-all duration-200"
                    rows={6}
                    placeholder="Add a detailed description..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveDescription}
                      className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl hover:from-orange-700 hover:to-amber-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      Save Description
                    </button>
                    <button
                      onClick={() => setIsEditingDescription(false)}
                      className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-2xl font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl border border-orange-200 min-h-[120px] shadow-sm">
                  {cardData.description ? (
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{cardData.description}</p>
                  ) : (
                    <div className="flex items-center justify-center h-20">
                      <p className="text-gray-500 italic">No description added yet. Click Edit to add one.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Activity Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Activity</h3>
              </div>
              
              {/* Add Comment */}
              <div className="mb-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {session?.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ME'}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="w-full p-4 border border-orange-200 rounded-2xl resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm shadow-sm transition-all duration-200"
                      rows={3}
                    />
                    {newComment.trim() && (
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={handleAddComment}
                          className="px-6 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl hover:from-orange-700 hover:to-amber-700 font-medium shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          Save Comment
                        </button>
                        <button
                          onClick={() => setNewComment("")}
                          className="px-6 py-2 text-gray-600 hover:bg-orange-50 rounded-2xl font-medium transition-all duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments and Activities Timeline */}
              <div className="space-y-6">
                {/* Show comments first */}
                {comments.map((comment, index) => (
                  <div key={`comment-${comment.id}`} className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold shadow-lg">
                      {comment.users.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-orange-600">
                          {comment.users.full_name}
                        </span>
                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <div className="bg-white border border-orange-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                        <p className="text-gray-700 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Show activities */}
                {activities.map((activity, index) => (
                  <div key={`activity-${activity.id}`} className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                      {getActivityIcon(activity.action_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-green-600">
                          {activity.users.full_name}
                        </span>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          {formatDate(activity.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-600">
                        {getActivityDescription(activity)}
                      </p>
                    </div>
                  </div>
                ))}

                {comments.length === 0 && activities.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-10 w-10 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-500 mb-2">No activity yet</h4>
                    <p className="text-gray-400">Comments and updates will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-gradient-to-br from-orange-50/80 to-amber-50/80 border-l border-orange-100 p-6 space-y-8">
            <div>
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Add to card</h4>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-white hover:text-orange-700 rounded-2xl transition-all duration-200 border border-orange-200 hover:border-orange-300 shadow-sm hover:shadow-md">
                  <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
                    <User className="h-4 w-4 text-orange-600" />
                  </div>
                  Members
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-white hover:text-orange-700 rounded-2xl transition-all duration-200 border border-orange-200 hover:border-orange-300 shadow-sm hover:shadow-md">
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                    <Tag className="h-4 w-4 text-green-600" />
                  </div>
                  Labels
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-white hover:text-orange-700 rounded-2xl transition-all duration-200 border border-orange-200 hover:border-orange-300 shadow-sm hover:shadow-md">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                  </div>
                  Checklist
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-white hover:text-orange-700 rounded-2xl transition-all duration-200 border border-orange-200 hover:border-orange-300 shadow-sm hover:shadow-md">
                  <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                  Due date
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-white hover:text-orange-700 rounded-2xl transition-all duration-200 border border-orange-200 hover:border-orange-300 shadow-sm hover:shadow-md">
                  <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Paperclip className="h-4 w-4 text-indigo-600" />
                  </div>
                  Attachment
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Actions</h4>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-white hover:text-orange-700 rounded-2xl transition-all duration-200 border border-orange-200 hover:border-orange-300 shadow-sm hover:shadow-md">
                  <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Copy className="h-4 w-4 text-gray-600" />
                  </div>
                  Copy
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-white hover:text-orange-700 rounded-2xl transition-all duration-200 border border-orange-200 hover:border-orange-300 shadow-sm hover:shadow-md">
                  <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Archive className="h-4 w-4 text-amber-600" />
                  </div>
                  Archive
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-2xl transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm hover:shadow-md">
                  <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                    <Trash className="h-4 w-4 text-red-600" />
                  </div>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
