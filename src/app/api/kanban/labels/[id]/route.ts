import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    // Validate color format if provided
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json(
        { error: "Color must be a valid hex color (e.g., #FF0000)" },
        { status: 400 }
      );
    }

    // Check if label exists and belongs to the organization
    const existingLabel = await prisma.label.findFirst({
      where: {
        id: labelId,
        board: {
          project: {
            organizationId,
          },
        },
      },
      select: {
        id: true,
        boardId: true,
      },
    });

    if (!existingLabel) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Update label and create activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update label
      const label = await tx.label.update({
        where: { id: labelId },
        data: {
          name: name !== undefined ? name : undefined,
          color: color !== undefined ? color : undefined,
        },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: validation.context!.userId,
          boardId: existingLabel.boardId,
          actionType: "update",
          entityType: "label",
          entityId: labelId,
          details: { changes: { name, color } },
        },
      });

      return label;
    });

    return NextResponse.json({ label: result });
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

    // Check if label exists and belongs to the organization
    const existingLabel = await prisma.label.findFirst({
      where: {
        id: labelId,
        board: {
          project: {
            organizationId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
        boardId: true,
      },
    });

    if (!existingLabel) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Delete label and create activity log in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete label (CASCADE will handle card_labels)
      await tx.label.delete({
        where: { id: labelId },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: validation.context!.userId,
          boardId: existingLabel.boardId,
          actionType: "delete",
          entityType: "label",
          entityId: labelId,
          details: {
            label_name: existingLabel.name,
            label_color: existingLabel.color,
          },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/kanban/labels/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
