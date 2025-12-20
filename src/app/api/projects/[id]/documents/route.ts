import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server"; // Keep for file storage
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Fix for Next.js 15 - await params before using
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

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

    // Fetch project documents
    const documents = await prisma.projectDocument.findMany({
      where: {
        projectId,
      },
      orderBy: {
        uploadedAt: "desc",
      },
      select: {
        id: true,
        filename: true,
        originalFilename: true,
        fileSize: true,
        mimeType: true,
        filePath: true,
        uploadedAt: true,
        uploadedBy: true,
      },
    });

    // Transform to match expected format
    // Convert BigInt to number for JSON serialization
    const transformedDocuments = documents.map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      original_filename: doc.originalFilename,
      file_size: Number(doc.fileSize), // Convert BigInt to number
      mime_type: doc.mimeType,
      file_path: doc.filePath,
      uploaded_at: doc.uploadedAt,
      uploaded_by: doc.uploadedBy,
    }));

    const result = {
      documents: transformedDocuments,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/projects/[id]/documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Fix for Next.js 15 - await params before using
    const { id: projectId } = await params;
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

    if (!validation.success || !validation.context) {
      return NextResponse.json(
        {
          error: validation.error || "Unauthorized",
        },
        { status: validation.status || 401 }
      );
    }

    const userId = validation.context.userId;

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

    const supabase = supabaseAdmin; 
    // const supabase = await createClient(); // For file storage

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: "File size exceeds 10MB limit",
        },
        { status: 400 }
      );
    }

    // Validate file type - check both MIME type and file extension
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/gif",
      "text/plain",
    ];

    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".txt",
    ];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));

    const isValidMimeType = allowedTypes.includes(file.type);
    const isValidExtension = allowedExtensions.includes(fileExtension);

    if (!isValidMimeType && !isValidExtension) {
      return NextResponse.json(
        {
          error: `File type not allowed. File: ${file.name}, Type: ${file.type}. Supported types: PDF, Word, Excel, Images, Text`,
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `projects/${projectId}/${uniqueFilename}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("caply")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return NextResponse.json(
        {
          error: `Failed to upload file: ${uploadError.message || "Storage error"}`,
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("caply")
      .getPublicUrl(filePath);

    // Save document record to database
    try {
      const document = await prisma.projectDocument.create({
        data: {
          projectId,
          filename: uniqueFilename,
          originalFilename: file.name,
          fileSize: file.size,
          mimeType: file.type,
          filePath,
          uploadedBy: userId,
        },
      });

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

      return NextResponse.json({
        document: transformedDocument,
        message: "Document uploaded successfully",
      });
    } catch (dbError: any) {
      console.error("Error saving document record:", dbError);
      // Try to clean up uploaded file
      await supabase.storage.from("caply").remove([filePath]);

      return NextResponse.json(
        {
          error: `Failed to save document record: ${dbError.message || "Database error"}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in POST /api/projects/[id]/documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
