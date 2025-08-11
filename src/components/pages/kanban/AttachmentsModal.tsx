"use client"

import { useState, useRef } from "react"
import { X, Upload, FileText, Image, Download, Trash2 } from "lucide-react"
import { kanbanAPI } from "@/utils/api/kanban"
import { toast } from "sonner"

interface Attachment {
  id: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  file_path: string
  uploaded_at: string
  users?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
}

interface AttachmentsModalProps {
  isOpen: boolean
  onClose: () => void
  cardId: string
  organizationId: string
  attachments: Attachment[]
  onAttachmentsChange: (attachments: Attachment[]) => void
}

export default function AttachmentsModal({
  isOpen,
  onClose,
  cardId,
  organizationId,
  attachments,
  onAttachmentsChange
}: AttachmentsModalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    
    try {
      // Upload files one by one
      const newAttachments: Attachment[] = []
      
      for (const file of Array.from(files)) {
        const response = await kanbanAPI.createAttachment({
          card_id: cardId,
          file: file,
          organizationId
        })
        newAttachments.push(response.attachment)
      }

      onAttachmentsChange([...attachments, ...newAttachments])
      toast.success(`${newAttachments.length} file(s) uploaded successfully!`)
    } catch (error) {
      console.error("Error uploading files:", error)
      toast.error('Failed to upload files')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    setDeletingIds(prev => new Set(prev).add(attachmentId))
    
    try {
      await kanbanAPI.deleteAttachment(attachmentId)
      onAttachmentsChange(attachments.filter(a => a.id !== attachmentId))
      toast.success('File deleted successfully!')
    } catch (error) {
      console.error("Error deleting attachment:", error)
      toast.error('Failed to delete file')
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(attachmentId)
        return newSet
      })
    }
  }

  const handleDownloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const response = await kanbanAPI.getAttachmentDownload(attachmentId)
      // Create a temporary link to download the file
      const link = document.createElement('a')
      link.href = response.download_url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading attachment:", error)
      toast.error('Failed to download file')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <Image className="h-5 w-5 text-blue-500" />
    }
    return <FileText className="h-5 w-5 text-gray-500" />
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Attachments</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex flex-col items-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isUploading ? "Uploading..." : "Drop files here or click to upload"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports: Images, PDFs, Documents, Spreadsheets
                </p>
              </div>
            </button>
          </div>

          {/* Attachments List */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Attachments</h3>
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(attachment.mime_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.original_filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownloadAttachment(attachment.id, attachment.original_filename)}
                      className="p-1 text-gray-400 hover:text-blue-500"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      disabled={deletingIds.has(attachment.id)}
                      className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}


        </div>
      </div>
    </div>
  )
}
