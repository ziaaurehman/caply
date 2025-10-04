import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const labelId = (await params).id;
    const body = await req.json();
    const { name, color, organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "projects",
      action: "update",
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const supabase = await createClient();

    // Validate color format if provided
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json(
        { error: "Color must be a valid hex color (e.g., #FF0000)" },
        { status: 400 }
      );
    }

    // Check if label exists and belongs to the organization
    const { data: existingLabel, error: labelError } = await supabase
      .from("labels")
      .select(
        `
        *,
        boards!inner (
          id,
          project_id,
          projects!inner (
            id,
            organization_id
          )
        )
      `
      )
      .eq("id", labelId)
      .eq("boards.projects.organization_id", organizationId)
      .single();

    if (labelError || !existingLabel) {
      console.error("Label query error:", labelError);
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Update label
    const { data: label, error } = await supabase
      .from("labels")
      .update({
        name,
        color,
      })
      .eq("id", labelId)
      .select()
      .single();

    if (error) {
      console.error("Label update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create activity log
    await supabase.from("activities").insert([
      {
        user_id: validation.context!.userId,
        board_id: existingLabel.board_id,
        action_type: "update",
        entity_type: "label",
        entity_id: labelId,
        details: { changes: { name, color } },
      },
    ]);

    return NextResponse.json({ label });
  } catch (error) {
    console.error("Error in PATCH /api/kanban/labels/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const labelId = (await params).id;
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "projects",
      action: "delete",
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const supabase = await createClient();

    // Check if label exists and belongs to the organization
    const { data: existingLabel, error: labelError } = await supabase
      .from("labels")
      .select(
        `
        *,
        boards!inner (
          id,
          project_id,
          projects!inner (
            id,
            organization_id
          )
        )
      `
      )
      .eq("id", labelId)
      .eq("boards.projects.organization_id", organizationId)
      .single();

    if (labelError || !existingLabel) {
      console.error("Label query error:", labelError);
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Delete label (CASCADE will handle card_labels)
    const { error } = await supabase.from("labels").delete().eq("id", labelId);

    if (error) {
      console.error("Label delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create activity log
    await supabase.from("activities").insert([
      {
        user_id: validation.context!.userId,
        board_id: existingLabel.board_id,
        action_type: "delete",
        entity_type: "label",
        entity_id: labelId,
        details: {
          label_name: existingLabel.name,
          label_color: existingLabel.color,
        },
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/kanban/labels/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
