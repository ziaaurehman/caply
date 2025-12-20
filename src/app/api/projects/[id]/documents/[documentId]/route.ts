import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server"; // Keep for file storage
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

    // Verify project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get document details
    const document = await prisma.projectDocument.findFirst({
      where: {
        id: documentId,
        projectId,
      },
    });

    if (!document) {
      console.error("Document not found:", {
        documentId,
        projectId,
      });
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check if file exists in storage with better debugging
    console.log("Checking storage for file path:", document.filePath);

    const supabase = await createClient(); // For file storage
    const { data: publicUrlObj } = supabase.storage
      .from("caply")
      .getPublicUrl(document.filePath);

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

    // Transform to match expected format
    // Convert BigInt to number for JSON serialization
    const transformedDocument = {
      id: document.id,
      project_id: document.projectId,
      filename: document.filename,
      original_filename: document.originalFilename,
      file_size: Number(document.fileSize), // Convert BigInt to number
      mime_type: document.mimeType,
      file_path: document.filePath,
      uploaded_at: document.uploadedAt,
      uploaded_by: document.uploadedBy,
    };

    const result = {
      document: transformedDocument,
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

    // Verify project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get document details
    const document = await prisma.projectDocument.findFirst({
      where: {
        id: documentId,
        projectId,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete document record from database and file from storage
    try {
      await prisma.projectDocument.delete({
        where: { id: documentId },
      });

      // Delete file from storage (after successful database deletion)
      const supabase = await createClient(); // For file storage
      const { error: storageError } = await supabase.storage
        .from("caply")
        .remove([document.filePath]);

      if (storageError) {
        console.error("Error deleting file from storage:", storageError);
        // Don't fail the request if storage deletion fails
      }
    } catch (dbError: any) {
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
