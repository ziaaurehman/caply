import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server"; // Keep for file storage
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get("card_id");
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    if (!cardId) {
      return NextResponse.json(
        { error: "Card ID is required" },
        { status: 400 }
      );
    }

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

    // Verify card exists and user has access through project organization
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        list: {
          board: {
            project: {
              organizationId,
            },
          },
        },
      },
      select: {
        id: true,
        title: true,
        listId: true,
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Get attachments for the card
    const attachments = await prisma.attachment.findMany({
      where: {
        cardId,
      },
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    // Transform to match expected format
    const transformedAttachments = attachments.map((attachment) => ({
      id: attachment.id,
      card_id: attachment.cardId,
      filename: attachment.filename,
      original_filename: attachment.originalFilename,
      file_path: attachment.filePath,
      file_size: attachment.fileSize,
      mime_type: attachment.mimeType,
      uploaded_by: attachment.uploadedBy,
      uploaded_at: attachment.uploadedAt,
      users: {
        id: attachment.uploader.id,
        full_name: attachment.uploader.fullName,
        email: attachment.uploader.email,
        avatar_url: attachment.uploader.avatarUrl,
      },
    }));

    const result = { attachments: transformedAttachments };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const cardId = formData.get("card_id") as string;
    const organizationId =
      (formData.get("organizationId") as string) ||
      req.headers.get("x-organization-id");

    if (!file || !cardId) {
      return NextResponse.json(
        { error: "File and card ID are required" },
        { status: 400 }
      );
    }

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

    // Verify card exists and user has access through project organization
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        list: {
          board: {
            project: {
              organizationId,
            },
          },
        },
      },
      include: {
        list: {
          select: {
            boardId: true,
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Upload file to Supabase storage (keeping Supabase for file storage)
    const supabase = await createClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `card-attachments/${cardId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("caply")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Create attachment record and activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create attachment record
      const attachment = await tx.attachment.create({
        data: {
          cardId,
          filename: fileName,
          originalFilename: file.name,
          filePath: uploadData.path,
          fileSize: BigInt(file.size),
          mimeType: file.type,
          uploadedBy: session.user.id,
        },
        include: {
          uploader: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: session.user.id,
          boardId: card.list.boardId,
          cardId: cardId,
          actionType: "create",
          entityType: "attachment",
          entityId: attachment.id,
          details: {
            filename: file.name,
            file_size: file.size,
            card_title: card.title,
          },
        },
      });

      return attachment;
    }).catch(async (error) => {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from("caply").remove([filePath]);
      throw error;
    });

    // Transform to match expected format
    const transformedAttachment = {
      id: result.id,
      card_id: result.cardId,
      filename: result.filename,
      original_filename: result.originalFilename,
      file_path: result.filePath,
      file_size: result.fileSize,
      mime_type: result.mimeType,
      uploaded_by: result.uploadedBy,
      uploaded_at: result.uploadedAt,
      users: {
        id: result.uploader.id,
        full_name: result.uploader.fullName,
        email: result.uploader.email,
        avatar_url: result.uploader.avatarUrl,
      },
    };

    return NextResponse.json({ attachment: transformedAttachment });
  } catch (error) {
    console.error("Error creating attachment:", error);
    return NextResponse.json(
      { error: "Failed to create attachment" },
      { status: 500 }
    );
  }
}
