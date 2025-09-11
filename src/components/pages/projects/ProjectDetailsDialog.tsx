"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  DollarSign,
  Users,
  Settings,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import { projectAPI, type Project } from "@/utils/api";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import { formatCurrency, cn } from "@/lib/utils";

interface ProjectDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
}

interface ProjectDocument {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  uploaded_at: string;
  uploaded_by: string;
}

const ProjectDetailsDialog: React.FC<ProjectDetailsDialogProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(
    new Set()
  );
  const { currentOrganization } = useOrganizationStore();

  useEffect(() => {
    if (isOpen && projectId && currentOrganization?.id) {
      fetchProjectDetails();
    }
  }, [isOpen, projectId, currentOrganization?.id]);

  const fetchProjectDetails = async () => {
    if (!projectId || !currentOrganization?.id) return;

    setLoading(true);
    setError(null);
    try {
      // Fetch project details
      const projectData = await projectAPI.getProject(
        projectId,
        currentOrganization.id
      );
      setProject(projectData.project);

      // Fetch project documents
      try {
        const response = await fetch(
          `/api/projects/${projectId}/documents?organizationId=${currentOrganization.id}`,
          {
            headers: {
              "x-organization-id": currentOrganization.id,
            },
          }
        );
        if (response.ok) {
          const docsData = await response.json();
          setDocuments(docsData.documents || []);
        }
      } catch (docError) {
        console.error("Error fetching documents:", docError);
        // Continue without documents
      }
    } catch (err: any) {
      console.error("Error fetching project details:", err);
      setError(err.message || "Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "on_hold":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDownloadDocument = async (doc: ProjectDocument) => {
    if (!projectId || !currentOrganization?.id) return;

    setDownloadingFiles((prev) => new Set(prev).add(doc.id));

    try {
      const response = await projectAPI.getProjectDocumentDownload(
        projectId,
        doc.id,
        currentOrganization.id
      );

      // Create a temporary link element to trigger download
      const link = document.createElement("a");
      link.href = response.download_url;
      link.download = doc.original_filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading document:", error);
      // You might want to show a toast notification here
    } finally {
      setDownloadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />;
      case "on_hold":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Project Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-gray-600">
                  Loading project details...
                </span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">{error}</div>
                <button
                  onClick={fetchProjectDetails}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
                >
                  Try Again
                </button>
              </div>
            ) : project ? (
              <div className="space-y-6">
                {/* Project Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">
                      {project.name}
                    </h4>
                    {project.code && (
                      <p className="text-sm text-gray-500 mt-1">
                        Code: {project.code}
                      </p>
                    )}
                    {project.description && (
                      <p className="text-gray-600 mt-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(project.status || "active")}
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        getStatusColor(project.status || "active")
                      )}
                    >
                      {project.status
                        ? project.status.replace("_", " ").toUpperCase()
                        : "ACTIVE"}
                    </span>
                  </div>
                </div>

                {/* Project Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Timeline */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Calendar className="h-5 w-5 text-gray-600 mr-2" />
                      <h5 className="font-medium text-gray-900">Timeline</h5>
                    </div>
                    <div className="space-y-1 text-sm">
                      {project.start_date && (
                        <p>
                          <span className="text-gray-600">Start:</span>{" "}
                          {new Date(project.start_date).toLocaleDateString()}
                        </p>
                      )}
                      {project.end_date && (
                        <p>
                          <span className="text-gray-600">End:</span>{" "}
                          {new Date(project.end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Budget & Billing */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <DollarSign className="h-5 w-5 text-gray-600 mr-2" />
                      <h5 className="font-medium text-gray-900">
                        Budget & Billing
                      </h5>
                    </div>
                    <div className="space-y-1 text-sm">
                      {project.project_type && (
                        <p>
                          <span className="text-gray-600">Type:</span>{" "}
                          {project.project_type}
                        </p>
                      )}
                      {project.billing_rate && (
                        <p>
                          <span className="text-gray-600">Rate:</span>{" "}
                          {formatCurrency(project.billing_rate)}/hr
                        </p>
                      )}
                      {project.budget_amount && (
                        <p>
                          <span className="text-gray-600">Budget:</span>{" "}
                          {formatCurrency(project.budget_amount)}
                        </p>
                      )}
                      {project.budget_hours && (
                        <p>
                          <span className="text-gray-600">Hours:</span>{" "}
                          {project.budget_hours}h
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Settings className="h-5 w-5 text-gray-600 mr-2" />
                      <h5 className="font-medium text-gray-900">Features</h5>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-gray-600">Kanban:</span>{" "}
                        {project.kanban_enabled ? "Enabled" : "Disabled"}
                      </p>
                      <p>
                        <span className="text-gray-600">Timesheet:</span>{" "}
                        {project.timesheet_enabled ? "Enabled" : "Disabled"}
                      </p>
                      <p>
                        <span className="text-gray-600">
                          Team Availability:
                        </span>{" "}
                        {project.team_availability_enabled
                          ? "Enabled"
                          : "Disabled"}
                      </p>
                      <p>
                        <span className="text-gray-600">
                          Capacity Planning:
                        </span>{" "}
                        {project.capacity_planning_enabled
                          ? "Enabled"
                          : "Disabled"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                {documents.length > 0 && (
                  <div>
                    <div className="flex items-center mb-4">
                      <FileText className="h-5 w-5 text-gray-600 mr-2" />
                      <h5 className="font-medium text-gray-900">
                        Documents ({documents.length})
                      </h5>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="space-y-3">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between py-2 px-3 bg-white rounded border"
                          >
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 text-gray-500 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {doc.original_filename}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(doc.file_size)} •{" "}
                                  {new Date(
                                    doc.uploaded_at
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownloadDocument(doc)}
                              disabled={downloadingFiles.has(doc.id)}
                              className="flex items-center cursor-pointer text-orange-600 hover:text-orange-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              {downloadingFiles.has(doc.id)
                                ? "Downloading..."
                                : "Download"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Members Section */}
                {project.project_members &&
                  project.project_members.length > 0 && (
                    <div>
                      <div className="flex items-center mb-4">
                        <Users className="h-5 w-5 text-gray-600 mr-2" />
                        <h5 className="font-medium text-gray-900">
                          Team Members ({project.project_members.length})
                        </h5>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {project.project_members.map((member: any) => (
                            <div
                              key={member.id}
                              className="flex items-center py-2 px-3 bg-white rounded border"
                            >
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                                {member.organization_members?.users
                                  ?.avatar_url ? (
                                  <img
                                    src={
                                      member.organization_members.users
                                        .avatar_url
                                    }
                                    alt={
                                      member.organization_members?.users
                                        ?.full_name || "User"
                                    }
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-medium text-gray-600">
                                    {(
                                      member.organization_members?.users
                                        ?.full_name || "?"
                                    )
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {member.organization_members?.users
                                    ?.full_name || "Unknown User"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {member.organization_members?.users?.email ||
                                    "No email"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsDialog;
