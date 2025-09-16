import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const attachmentId = params.id;

    // First get the attachment to find the organization and file path
    const { data: existingAttachment, error: attachmentError } = await supabase
      .from("attachments")
      .select(
        `
        *,
        cards!inner (
          id,
          title,
          lists!inner (
            id,
            board_id,
            boards!inner (
              id,
              project_id,
              projects!inner (
                id,
                organization_id
              )
            )
          )
        )
      `
      )
      .eq("id", attachmentId)
      .single();

    if (attachmentError || !existingAttachment) {
      console.log("Attachment not found:", attachmentError);
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Get the organization ID from the attachment
    const attachmentOrgId = (existingAttachment.cards as any).lists.boards
      .projects.organization_id;

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

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from("caply")
      .remove([existingAttachment.file_path]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete attachment record
    const { error } = await supabase
      .from("attachments")
      .delete()
      .eq("id", attachmentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create activity log
    await supabase.from("activities").insert([
      {
        user_id: session.user.id,
        board_id: (existingAttachment.cards as any).lists.board_id,
        card_id: existingAttachment.card_id,
        action_type: "delete",
        entity_type: "attachment",
        entity_id: attachmentId,
        details: {
          filename: existingAttachment.original_filename,
          card_title: (existingAttachment.cards as any).title,
        },
      },
    ]);

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const attachmentId = params.id;

    // Get the attachment with organization validation
    const { data: attachment, error: attachmentError } = await supabase
      .from("attachments")
      .select(
        `
        *,
        cards!inner (
          id,
          title,
          lists!inner (
            id,
            board_id,
            boards!inner (
              id,
              project_id,
              projects!inner (
                id,
                organization_id
              )
            )
          )
        )
      `
      )
      .eq("id", attachmentId)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Get the organization ID from the attachment
    const attachmentOrgId = (attachment.cards as any).lists.boards.projects
      .organization_id;

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

    // Get download URL from storage
    const { data: urlData } = await supabase.storage
      .from("caply")
      .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry

    if (!urlData?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attachment,
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
