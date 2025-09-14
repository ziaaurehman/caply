import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

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

    // Check if file exists in storage with better debugging
    console.log("Checking storage for file path:", document.file_path);

    const { data: publicUrlObj } = await supabase.storage
      .from("caply")
      .getPublicUrl(document.file_path);

    const publicUrl = publicUrlObj.publicUrl;

    if (!publicUrl) {
      return NextResponse.json(
        {
          error: `File not found in storage. The file may have been deleted or never uploaded properly. Database record has been cleaned up.`,
        },
        { status: 404 }
      );
    }

    console.log("here is the public url", publicUrl);

    const result = {
      document,
      download_url: publicUrl,
    };

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
