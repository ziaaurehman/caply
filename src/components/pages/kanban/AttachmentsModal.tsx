// Update your AttachmentsModal.tsx to properly layer the preview modal

"use client";

import { useState, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  Image,
  Download,
  Trash2,
  Eye,
  File,
} from "lucide-react";
import { kanbanAPI } from "@/utils/api/kanban";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Attachment {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  uploaded_at: string;
  users?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  preview_url?: string;
}

interface AttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  organizationId: string;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  projectId: string;
  boardId: string;
}

export default function AttachmentsModal({
  isOpen,
  onClose,
  cardId,
  organizationId,
  attachments,
  onAttachmentsChange,
  projectId,
  boardId,
}: AttachmentsModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Function to invalidate board queries
  const invalidateBoardQueries = () => {
    if (projectId && organizationId) {
      // Invalidate all board data queries
      queryClient.invalidateQueries({
        queryKey: ["kanban-board-data", projectId, organizationId],
      });

      // Also invalidate specific board if provided
      if (boardId) {
        queryClient.invalidateQueries({
          queryKey: ["kanban-board-data", projectId, organizationId, boardId],
        });
      }
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      // Upload files one by one
      const newAttachments: Attachment[] = [];

      for (const file of Array.from(files)) {
        const response = await kanbanAPI.createAttachment({
          card_id: cardId,
          file: file,
          organizationId,
        });
        newAttachments.push(response.attachment);
      }

      onAttachmentsChange([...attachments, ...newAttachments]);
      invalidateBoardQueries();

      toast.success(`${newAttachments.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files) {
      await uploadFiles(files);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    setDeletingIds((prev) => new Set(prev).add(attachmentId));

    try {
      await kanbanAPI.deleteAttachment(attachmentId);
      onAttachmentsChange(attachments.filter((a) => a.id !== attachmentId));
      invalidateBoardQueries();
      toast.success("File deleted successfully!");
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast.error("Failed to delete file");
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(attachmentId);
        return newSet;
      });
    }
  };

  const handleDownloadAttachment = async (
    attachmentId: string,
    filename: string,
    mimeTypes?: string
  ) => {
    try {
      const response = await kanbanAPI.getAttachmentDownload(attachmentId);

      const mimeType = response.attachment.mime_type;

      if (response.download_url) {
        // For images and PDFs, fetch as blob to force download
        if (mimeType.startsWith("image/") || mimeType.includes("pdf")) {
          const fileResponse = await fetch(response.download_url);
          const blob = await fileResponse.blob();

          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename;
          link.style.display = "none";

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          URL.revokeObjectURL(blobUrl);
        } else {
          // For other files, use direct link
          const link = document.createElement("a");
          link.href = response.download_url;
          link.download = filename;
          link.target = "_blank";
          link.style.display = "none";

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        toast.success("File downloaded successfully!");
      } else {
        throw new Error("No download URL available");
      }
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast.error("Failed to download file");
    }
  };

  const handlePreviewAttachment = async (attachment: Attachment) => {
    try {
      console.log("Getting preview for attachment:", attachment.id);

      const response = await kanbanAPI.getAttachmentDownload(attachment.id);
      console.log("Preview response:", response);

      if (response.download_url) {
        setPreviewAttachment({
          ...attachment,
          preview_url: response.download_url,
        });
      } else {
        toast.error("No preview URL available");
      }
    } catch (error) {
      console.error("Error getting preview:", error);
      toast.error("Failed to load preview");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    if (mimeType.includes("pdf")) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (mimeType.includes("word") || mimeType.includes("document")) {
      return <FileText className="h-5 w-5 text-blue-600" />;
    }
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) {
      return <FileText className="h-5 w-5 text-green-600" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const canPreview = (mimeType: string) => {
    return (
      mimeType.startsWith("image/") ||
      mimeType.includes("pdf") ||
      mimeType.includes("text/")
    );
  };

  // Preview Modal Component - Higher z-index
  const renderPreviewModal = () => {
    if (!previewAttachment) return null;

    const { mime_type, preview_url, original_filename } = previewAttachment;

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-6xl max-h-[95vh] w-full flex flex-col">
          {/* Preview Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {original_filename}
            </h3>
            <button
              onClick={() => setPreviewAttachment(null)}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-4">
            {mime_type.startsWith("image/") ? (
              <div className="flex justify-center">
                <img
                  src={preview_url}
                  alt={original_filename}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    console.error("Image failed to load:", e);
                    toast.error("Failed to load image preview");
                  }}
                  onLoad={() => {
                    console.log("Image loaded successfully");
                  }}
                />
              </div>
            ) : mime_type.includes("pdf") ? (
              <div className="w-full h-full">
                <iframe
                  src={preview_url}
                  className="w-full h-full min-h-[700px] rounded-lg border shadow-lg"
                  title={original_filename}
                  onError={(e) => {
                    console.error("PDF failed to load:", e);
                    toast.error("Failed to load PDF preview");
                  }}
                />
              </div>
            ) : mime_type.includes("text/") ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <iframe
                  src={preview_url}
                  className="w-full h-full min-h-[500px] rounded-lg border shadow-lg"
                  title={original_filename}
                  onError={(e) => {
                    console.error("Text file failed to load:", e);
                    toast.error("Failed to load text preview");
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <File className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">Preview not available</p>
                <p className="text-sm">This file type cannot be previewed</p>
                <button
                  onClick={() =>
                    handleDownloadAttachment(
                      previewAttachment.id,
                      original_filename,
                      previewAttachment.mime_type
                    )
                  }
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Download File
                </button>
              </div>
            )}
          </div>

          {/* Preview Footer with actions */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 flex-shrink-0">
            <div className="text-sm text-gray-500">
              {formatFileSize(previewAttachment.file_size)} •{" "}
              {previewAttachment.mime_type}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  handleDownloadAttachment(
                    previewAttachment.id,
                    original_filename,
                    previewAttachment.mime_type
                  )
                }
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Download
              </button>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Attachments Modal - Lower z-index */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Attachments</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Upload Area with Drag and Drop */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
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
                <Upload
                  className={`h-8 w-8 ${isDragOver ? "text-blue-500" : "text-gray-400"}`}
                />
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isDragOver ? "text-blue-700" : "text-gray-700"
                    }`}
                  >
                    {isUploading
                      ? "Uploading..."
                      : isDragOver
                        ? "Drop files here!"
                        : "Drop files here or click to upload"}
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
                <h3 className="text-sm font-medium text-gray-700">
                  Attachments
                </h3>
                <div className="space-y-2">
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
                          {formatFileSize(attachment.file_size)} •{" "}
                          {new Date(
                            attachment.uploaded_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Preview Button */}
                        {canPreview(attachment.mime_type) && (
                          <button
                            onClick={() => handlePreviewAttachment(attachment)}
                            className="p-1 text-gray-400 hover:text-blue-500"
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}

                        {/* Download Button */}
                        <button
                          onClick={() =>
                            handleDownloadAttachment(
                              attachment.id,
                              attachment.original_filename
                            )
                          }
                          className="p-1 text-gray-400 hover:text-blue-500"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          disabled={deletingIds.has(attachment.id)}
                          className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          {deletingIds.has(attachment.id) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal - Higher z-index, appears on top */}
      {renderPreviewModal()}
    </>
  );
}
