import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { redisGetJSON, redisSetJSON } from "@/utils/redis";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    // Fix for Next.js 15 - await params before using
    const { id: projectId, documentId } = await params;
    const organizationId = req.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "projects",
      action: "read",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const supabase = await createClient();

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .eq("organization_id", organizationId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Try cache first (15 days TTL)
    const cacheKey = `project:document:${projectId}:${documentId}:${organizationId}`;
    const cached = await redisGetJSON<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get document details
    const { data: document, error: documentError } = await supabase
      .from("project_documents")
      .select("*")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .single();

    if (documentError || !document) {
      console.error("Document not found:", {
        documentId,
        projectId,
        documentError,
      });
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Debug logging
    console.log("Document found:", {
      id: document.id,
      filename: document.filename,
      file_path: document.file_path,
      project_id: document.project_id,
    });

    // Check if file exists in storage with better debugging
    console.log("Checking storage for file path:", document.file_path);

    // First, try to list all files in the project directory
    const { data: projectFiles, error: projectListError } =
      await supabase.storage.from("caply").list(`projects/${projectId}`);

    if (projectListError) {
      console.error("Error listing project files:", projectListError);
    } else {
      console.log("All files in project directory:", projectFiles);
    }

    // Also try to list the entire projects directory
    const { data: allProjects, error: allProjectsError } =
      await supabase.storage.from("caply").list("projects");

    if (allProjectsError) {
      console.error("Error listing projects directory:", allProjectsError);
    } else {
      console.log("All project directories:", allProjects);
    }

    // Try to get file info directly
    const { data: fileInfo, error: fileInfoError } = await supabase.storage
      .from("caply")
      .list(document.file_path.split("/").slice(0, -1).join("/"), {
        search: document.filename,
      });

    if (fileInfoError) {
      console.error("Error getting file info:", fileInfoError);
    } else {
      console.log("File info search result:", fileInfo);
    }

    // Generate signed URL for download
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from("caply")
      .createSignedUrl(document.file_path, 60); // 60 seconds expiry

    console.log("Signed URL:", signedUrl);

    if (urlError) {
      console.error("Error generating signed URL:", {
        error: urlError,
        file_path: document.file_path,
        filename: document.filename,
        projectId: projectId,
      });

      return NextResponse.json(
        {
          error: `File not found in storage. The file may have been deleted or never uploaded properly. Database record has been cleaned up.`,
        },
        { status: 404 }
      );
    }

    const result = {
      document,
      download_url: signedUrl.signedUrl,
    };

    // Cache the result (15 days)
    try {
      await redisSetJSON(cacheKey, result, 1296000);
    } catch (e) {
      console.warn("Failed to cache document:", e);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error in GET /api/projects/[id]/documents/[documentId]:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    // Fix for Next.js 15 - await params before using
    const { id: projectId, documentId } = await params;
    const organizationId = req.headers.get("x-organization-id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "projects",
      action: "update",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const supabase = await createClient();

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .eq("organization_id", organizationId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get document details
    const { data: document, error: documentError } = await supabase
      .from("project_documents")
      .select("*")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from("caply")
      .remove([document.file_path]);

    if (storageError) {
      console.error("Error deleting file from storage:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete document record from database
    const { error: dbError } = await supabase
      .from("project_documents")
      .delete()
      .eq("id", documentId)
      .eq("project_id", projectId);

    if (dbError) {
      console.error("Error deleting document record:", dbError);
      return NextResponse.json(
        { error: "Failed to delete document record" },
        { status: 500 }
      );
    }

    // Refresh project documents cache after deletion (15 days)
    try {
      const { data: freshDocuments } = await supabase
        .from("project_documents")
        .select(
          `
          id,
          filename,
          original_filename,
          file_size,
          mime_type,
          file_path,
          uploaded_at,
          uploaded_by
        `
        )
        .eq("project_id", projectId)
        .order("uploaded_at", { ascending: false });

      const documentsCacheKey = `project:documents:${projectId}:${organizationId}`;
      await redisSetJSON(
        documentsCacheKey,
        {
          documents: freshDocuments || [],
        },
        1296000
      );

      // Clear individual document cache
      const documentCacheKey = `project:document:${projectId}:${documentId}:${organizationId}`;
      // Note: Redis cache will expire naturally, no need to manually delete
    } catch (e) {
      console.warn(
        "Failed to refresh project documents cache after delete:",
        e
      );
    }

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error(
      "Error in DELETE /api/projects/[id]/documents/[documentId]:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
