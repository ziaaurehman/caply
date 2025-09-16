import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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

    const supabase = await createClient();

    // Verify card exists and user has access through project organization
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select(
        `
        id,
        title,
        list_id,
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
      `
      )
      .eq("id", cardId)
      .eq("lists.boards.projects.organization_id", organizationId)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Get attachments for the card
    const { data: attachments, error } = await supabase
      .from("attachments")
      .select(
        `
        *,
        users (
          id,
          full_name,
          email,
          avatar_url
        )
      `
      )
      .eq("card_id", cardId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = { attachments: attachments || [] };
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

    const supabase = await createClient();

    // Verify card exists and user has access through project organization
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select(
        `
        id,
        title,
        list_id,
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
      `
      )
      .eq("id", cardId)
      .eq("lists.boards.projects.organization_id", organizationId)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Upload file to Supabase storage
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

    // Create attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from("attachments")
      .insert([
        {
          card_id: cardId,
          filename: fileName,
          original_filename: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: session.user.id,
        },
      ])
      .select(
        `
        *,
        users (
          id,
          full_name,
          email,
          avatar_url
        )
      `
      )
      .single();

    if (attachmentError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from("caply").remove([filePath]);
      return NextResponse.json(
        { error: attachmentError.message },
        { status: 500 }
      );
    }

    // Create activity log
    await supabase.from("activities").insert([
      {
        user_id: session.user.id,
        board_id: (card.lists as any).board_id,
        card_id: cardId,
        action_type: "create",
        entity_type: "attachment",
        entity_id: attachment.id,
        details: {
          filename: file.name,
          file_size: file.size,
          card_title: card.title,
        },
      },
    ]);

    return NextResponse.json({ attachment });
  } catch (error) {
    console.error("Error creating attachment:", error);
    return NextResponse.json(
      { error: "Failed to create attachment" },
      { status: 500 }
    );
  }
}
