import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { card_id, label_id } = body;
  const organizationId =
    body.organizationId ||
    body.organization_id ||
    req.headers.get("x-organization-id");

  if (!card_id || !label_id) {
    return NextResponse.json(
      { error: "Card ID and Label ID are required" },
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

  // Check if card exists within the organization
  const card = await prisma.card.findFirst({
    where: {
      id: card_id,
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
        include: {
          board: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Verify the label belongs to the same board
  const boardId = card.list.board.id;
  const label = await prisma.label.findFirst({
    where: {
      id: label_id,
      boardId,
    },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });

  if (!label) {
    return NextResponse.json(
      { error: "Label not found on this board" },
      { status: 404 }
    );
  }

  // Check if label is already assigned to the card
  const existingCardLabel = await prisma.cardLabel.findFirst({
    where: {
      cardId: card_id,
      labelId: label_id,
    },
  });

  if (existingCardLabel) {
    return NextResponse.json(
      { error: "Label is already assigned to this card" },
      { status: 400 }
    );
  }

  // Assign label to card and create activity log in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Assign label to card
    const cardLabel = await tx.cardLabel.create({
      data: {
        cardId: card_id,
        labelId: label_id,
      },
      include: {
        label: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // Create activity log
    await tx.activity.create({
      data: {
        userId: validation.context!.userId,
        boardId: boardId,
        cardId: card_id,
        actionType: "create",
        entityType: "card_label",
        entityId: cardLabel.id,
        details: {
          label_name: label.name,
          label_color: label.color,
          card_title: card.title,
        },
      },
    });

    return cardLabel;
  });

  return NextResponse.json({ card_label: result });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get("card_id");
  const labelId = searchParams.get("label_id");
  const organizationId =
    searchParams.get("organizationId") || req.headers.get("x-organization-id");

  if (!cardId || !labelId) {
    return NextResponse.json(
      { error: "Card ID and Label ID are required" },
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

  // Check if card exists within the organization
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
        include: {
          board: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Get the card label to delete
  const cardLabel = await prisma.cardLabel.findFirst({
    where: {
      cardId,
      labelId,
    },
    include: {
      label: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  });

  if (!cardLabel) {
    return NextResponse.json(
      { error: "Card label not found" },
      { status: 404 }
    );
  }

  // Remove label from card and create activity log in a transaction
  await prisma.$transaction(async (tx) => {
    // Remove label from card
    await tx.cardLabel.deleteMany({
      where: {
        cardId,
        labelId,
      },
    });

    // Create activity log
    await tx.activity.create({
      data: {
        userId: validation.context!.userId,
        boardId: card.list.board.id,
        cardId: cardId,
        actionType: "delete",
        entityType: "card_label",
        entityId: cardLabel.id,
        details: {
          label_name: cardLabel.label.name,
          label_color: cardLabel.label.color,
          card_title: card.title,
        },
      },
    });
  });

  return NextResponse.json({ success: true });
}
