import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
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

    // Check if user has access to the card
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
              include: {
                project: {
                  select: {
                    id: true,
                    name: true,
                    organizationId: true,
                  },
                },
              },
            },
          },
        },
        cardMembers: {
          include: {
            projectMember: {
              include: {
                organizationMember: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        fullName: true,
                        email: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        cardLabels: {
          include: {
            label: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        checklists: {
          include: {
            items: {
              include: {
                projectMember: {
                  include: {
                    organizationMember: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            fullName: true,
                            email: true,
                            avatarUrl: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            position: "asc",
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        attachments: {
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
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Transform to match expected format
    const transformedCard = {
      id: card.id,
      list_id: card.listId,
      title: card.title,
      description: card.description,
      position: card.position,
      due_date: card.dueDate,
      is_completed: card.isCompleted,
      is_archived: card.isArchived,
      cover_color: card.coverColor,
      cover_image: card.coverImage,
      created_by: card.createdBy,
      created_at: card.createdAt,
      updated_at: card.updatedAt,
      lists: {
        id: card.list.id,
        name: card.list.name,
        board_id: card.list.boardId,
        boards: {
          id: card.list.board.id,
          name: card.list.board.name,
          project_id: card.list.board.projectId,
          projects: {
            id: card.list.board.project.id,
            name: card.list.board.project.name,
            organization_id: card.list.board.project.organizationId,
          },
        },
      },
      card_members: card.cardMembers.map((cm) => ({
        id: cm.id,
        project_member_id: cm.projectMemberId,
        assigned_at: cm.assignedAt,
        project_members: {
          id: cm.projectMember.id,
          organization_member_id: cm.projectMember.organizationMemberId,
          role: cm.projectMember.role,
          joined_at: cm.projectMember.joinedAt,
          organization_members: {
            id: cm.projectMember.organizationMember.id,
            user_id: cm.projectMember.organizationMember.userId,
            users: {
              id: cm.projectMember.organizationMember.user.id,
              full_name: cm.projectMember.organizationMember.user.fullName,
              email: cm.projectMember.organizationMember.user.email,
              avatar_url: cm.projectMember.organizationMember.user.avatarUrl,
            },
          },
        },
      })),
      labels:
        card.cardLabels?.map((cl) => cl.label).filter(Boolean) || [],
      card_labels: undefined, // Remove the original card_labels to avoid confusion
      checklists: card.checklists.map((checklist) => ({
        id: checklist.id,
        name: checklist.name,
        position: checklist.position,
        checklist_items: checklist.items.map((item) => ({
          id: item.id,
          content: item.content,
          is_completed: item.isCompleted,
          position: item.position,
          due_date: item.dueDate,
          assigned_to_project_member_id: item.assignedToProjectMemberId,
          project_members: item.projectMember
            ? {
                id: item.projectMember.id,
                organization_member_id: item.projectMember.organizationMemberId,
                role: item.projectMember.role,
                joined_at: item.projectMember.joinedAt,
                organization_members: {
                  id: item.projectMember.organizationMember.id,
                  user_id: item.projectMember.organizationMember.userId,
                  users: {
                    id: item.projectMember.organizationMember.user.id,
                    full_name: item.projectMember.organizationMember.user.fullName,
                    email: item.projectMember.organizationMember.user.email,
                    avatar_url: item.projectMember.organizationMember.user.avatarUrl,
                  },
                },
              }
            : null,
        })),
      })),
      comments: card.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.createdAt,
        updated_at: comment.updatedAt,
        user_id: comment.userId,
        users: {
          id: comment.user.id,
          full_name: comment.user.fullName,
          email: comment.user.email,
          avatar_url: comment.user.avatarUrl,
        },
      })),
      attachments: card.attachments.map((attachment) => ({
        id: attachment.id,
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
      })),
    };

    const result = { card: transformedCard };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/kanban/cards/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const body = await req.json();
    const {
      title,
      description,
      list_id,
      position,
      due_date,
      is_completed,
      is_archived,
      cover_color,
      cover_image,
    } = body;
    const organizationId =
      body.organizationId ||
      body.organization_id ||
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

    const { context: userContext } = validation;

    // Verify card exists and user has access through project organization
    const existingCard = await prisma.card.findFirst({
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
            id: true,
            name: true,
            boardId: true,
          },
        },
      },
    });

    if (!existingCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // If moving to a different list, verify access to target list
    if (list_id && list_id !== existingCard.listId) {
      const targetList = await prisma.list.findFirst({
        where: {
          id: list_id,
          board: {
            project: {
              organizationId,
            },
          },
        },
      });

      if (!targetList) {
        return NextResponse.json(
          { error: "Target list not found" },
          { status: 404 }
        );
      }
    }

    // Update card and create activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update card
      const card = await tx.card.update({
        where: { id: cardId },
        data: {
          title: title !== undefined ? title : undefined,
          description: description !== undefined ? description : undefined,
          listId: list_id !== undefined ? list_id : undefined,
          position: position !== undefined ? position : undefined,
          dueDate: due_date !== undefined ? (due_date ? new Date(due_date) : null) : undefined,
          isCompleted: is_completed !== undefined ? is_completed : undefined,
          isArchived: is_archived !== undefined ? is_archived : undefined,
          coverColor: cover_color !== undefined ? cover_color : undefined,
          coverImage: cover_image !== undefined ? cover_image : undefined,
        },
      });

      // Create activity log
      let actionType = "update";
      let details: any = { changes: body };

      if (list_id && list_id !== existingCard.listId) {
        actionType = "move";

        // Get list names for better activity description
        const fromList = await tx.list.findUnique({
          where: { id: existingCard.listId },
          select: { name: true },
        });

        const toList = await tx.list.findUnique({
          where: { id: list_id },
          select: { name: true },
        });

        details = {
          from_list_id: existingCard.listId,
          from_list_name: fromList?.name || "Unknown List",
          to_list_id: list_id,
          to_list_name: toList?.name || "Unknown List",
          card_title: title || existingCard.title,
        };
      }

      await tx.activity.create({
        data: {
          userId: userContext!.userId,
          boardId: existingCard.list.boardId,
          cardId: cardId,
          actionType,
          entityType: "card",
          entityId: cardId,
          details,
        },
      });

      return card;
    });

    // Transform to match expected format
    const transformedCard = {
      id: result.id,
      list_id: result.listId,
      title: result.title,
      description: result.description,
      position: result.position,
      due_date: result.dueDate,
      is_completed: result.isCompleted,
      is_archived: result.isArchived,
      cover_color: result.coverColor,
      cover_image: result.coverImage,
      created_by: result.createdBy,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
    };

    return NextResponse.json({ card: transformedCard });
  } catch (error) {
    console.error("Error in PATCH /api/kanban/cards/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
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
      action: "delete",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const { context: userContext } = validation;

    // Check if user has access to the card
    const existingCard = await prisma.card.findFirst({
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

    if (!existingCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Delete card and create activity log in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete card (CASCADE will handle related data)
      await tx.card.delete({
        where: { id: cardId },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: userContext!.userId,
          boardId: existingCard.list.boardId,
          cardId: cardId,
          actionType: "delete",
          entityType: "card",
          entityId: cardId,
          details: { card_title: existingCard.title },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/kanban/cards/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
