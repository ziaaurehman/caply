import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server"; // Keep for file storage
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const attachmentId = (await params).id;

    // First get the attachment to find the organization and file path
    const existingAttachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        card: {
          include: {
            list: {
              include: {
                board: {
                  include: {
                    project: {
                      select: {
                        id: true,
                        organizationId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!existingAttachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Get the organization ID from the attachment
    const attachmentOrgId =
      existingAttachment.card.list.board.project.organizationId;

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(attachmentOrgId, {
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

    // Delete file from storage and database record in a transaction
    const supabase = await createClient();
    await prisma
      .$transaction(async (tx) => {
        // Delete attachment record
        await tx.attachment.delete({
          where: { id: attachmentId },
        });

        // Create activity log
        await tx.activity.create({
          data: {
            userId: session.user.id,
            boardId: existingAttachment.card.list.boardId,
            cardId: existingAttachment.cardId,
            actionType: "delete",
            entityType: "attachment",
            entityId: attachmentId,
            details: {
              filename: existingAttachment.originalFilename,
              card_title: existingAttachment.card.title,
            },
          },
        });
      })
      .catch(async (error) => {
        // If database deletion fails, don't delete from storage
        throw error;
      });

    // Delete file from storage (after successful database deletion)
    const { error: storageError } = await supabase.storage
      .from("caply")
      .remove([existingAttachment.filePath]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
      // Don't fail the request if storage deletion fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const attachmentId = (await params).id;

    // Get the attachment with organization validation
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        card: {
          include: {
            list: {
              include: {
                board: {
                  include: {
                    project: {
                      select: {
                        id: true,
                        organizationId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Get the organization ID from the attachment
    const attachmentOrgId = attachment.card.list.board.project.organizationId;

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(attachmentOrgId, {
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

    // Get download URL from storage (keeping Supabase for file storage)
    const supabase = await createClient();
    const { data: urlData } = await supabase.storage
      .from("caply")
      .createSignedUrl(attachment.filePath, 3600); // 1 hour expiry

    if (!urlData?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    // Transform to match expected format
    const transformedAttachment = {
      id: attachment.id,
      card_id: attachment.cardId,
      filename: attachment.filename,
      original_filename: attachment.originalFilename,
      file_path: attachment.filePath,
      file_size: attachment.fileSize,
      mime_type: attachment.mimeType,
      uploaded_by: attachment.uploadedBy,
      uploaded_at: attachment.uploadedAt,
    };

    return NextResponse.json({
      attachment: transformedAttachment,
      download_url: urlData.signedUrl,
    });
  } catch (error) {
    console.error("Error getting attachment:", error);
    return NextResponse.json(
      { error: "Failed to get attachment" },
      { status: 500 }
    );
  }
}
