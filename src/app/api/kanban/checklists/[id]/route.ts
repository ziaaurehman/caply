import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: checklistId } = await params;
  const body = await req.json();
  const { name, position } = body;

  // Check if user has access to the checklist
  const existingChecklist = await prisma.checklist.findFirst({
    where: {
      id: checklistId,
      card: {
        list: {
          board: {
            project: {
              projectMembers: {
                some: {
                  organizationMember: {
                    userId: session.user.id,
                    status: "active",
                  },
                },
              },
            },
          },
        },
      },
    },
    include: {
      card: {
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
      },
    },
  });

  if (!existingChecklist) {
    return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
  }

  // Update checklist and create activity log in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update checklist
    const checklist = await tx.checklist.update({
      where: { id: checklistId },
      data: {
        name: name !== undefined ? name : undefined,
        position: position !== undefined ? position : undefined,
      },
    });

    // Create activity log
    await tx.activity.create({
      data: {
        userId: session.user.id,
        boardId: existingChecklist.card.list.board.id,
        cardId: existingChecklist.cardId,
        actionType: "update",
        entityType: "checklist",
        entityId: checklistId,
        details: { changes: body },
      },
    });

    return checklist;
  });

  // Transform to match expected format
  const transformedChecklist = {
    id: result.id,
    card_id: result.cardId,
    name: result.name,
    position: result.position,
    created_at: result.createdAt,
    updated_at: result.updatedAt,
  };

  return NextResponse.json({ checklist: transformedChecklist });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: checklistId } = await params;

  // First, get the checklist with basic card info
  const checklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
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

  if (!checklist) {
    return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
  }

  // Check if user has access to the project
  const organizationId =
    checklist.card.list.board.project.organizationId;

  const organizationMember = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
      status: "active",
    },
  });

  if (!organizationMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Delete checklist and create activity log in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete checklist (CASCADE will handle checklist_items)
    await tx.checklist.delete({
      where: { id: checklistId },
    });

    // Create activity log
    try {
      await tx.activity.create({
        data: {
          userId: session.user.id,
          boardId: checklist.card.list.board.id,
          cardId: checklist.cardId,
          actionType: "delete",
          entityType: "checklist",
          entityId: checklistId,
          details: {
            checklist_name: checklist.name,
            card_title: checklist.card.title,
          },
        },
      });
    } catch (activityError) {
      console.error("Error creating activity log:", activityError);
      // Don't fail the request if activity log fails
    }
  });

  return NextResponse.json({ success: true });
}
