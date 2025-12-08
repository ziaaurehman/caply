import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("list_id");
    const boardId = searchParams.get("board_id");
    const search = searchParams.get("search");
    const includeArchived = searchParams.get("include_archived") === "true";
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    if (!listId && !boardId) {
      return NextResponse.json(
        { error: "List ID or Board ID is required" },
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

    // Build where clause
    const where: any = {
      list: {
        board: {
          project: {
            organizationId,
          },
        },
      },
    };

    // Only filter out archived items if includeArchived is false
    if (!includeArchived) {
      where.isArchived = false;
    }

    if (listId) {
      where.listId = listId;
    } else if (boardId) {
      where.list = {
        ...where.list,
        boardId,
      };
    }

    // Add search functionality if search term is provided
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const cards = await prisma.card.findMany({
      where,
      orderBy: {
        position: "asc",
      },
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

    // Transform cards to match expected format
    const transformedCards = cards.map((card) => ({
      id: card.id,
      list_id: card.listId,
      title: card.title,
      description: card.description,
      position: card.position,
      due_date: card.dueDate,
      cover_color: card.coverColor,
      cover_image: card.coverImage,
      is_archived: card.isArchived,
      created_by: card.createdBy,
      created_at: card.createdAt,
      updated_at: card.updatedAt,
      lists: {
        id: card.list.id,
        name: card.list.name,
        boards: {
          id: card.list.board.id,
          project_id: card.list.board.projectId,
          projects: {
            id: card.list.board.project.id,
            organization_id: card.list.board.project.organizationId,
          },
        },
      },
      card_members: card.cardMembers.map((cm) => ({
        project_member_id: cm.projectMemberId,
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
      labels: card.cardLabels?.map((cl) => cl.label).filter(Boolean) || [],
      card_labels: undefined, // Remove the original card_labels to avoid confusion
      cover: {
        color: card.coverColor,
        image: card.coverImage,
        size: card.coverColor || card.coverImage ? "small" : undefined,
      },
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
                    full_name:
                      item.projectMember.organizationMember.user.fullName,
                    email: item.projectMember.organizationMember.user.email,
                    avatar_url:
                      item.projectMember.organizationMember.user.avatarUrl,
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
    }));

    const result = { cards: transformedCards };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /api/kanban/cards:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { list_id, title, description, due_date, cover_color, cover_image } =
      body;
    const organizationId =
      body.organizationId ||
      body.organization_id ||
      req.headers.get("x-organization-id");

    if (!list_id || !title) {
      return NextResponse.json(
        { error: "List ID and title are required" },
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

    const { context: userContext } = validation;

    // Verify list exists and user has access through project organization
    const list = await prisma.list.findFirst({
      where: {
        id: list_id,
        board: {
          project: {
            organizationId,
          },
        },
      },
      include: {
        board: {
          select: {
            id: true,
            projectId: true,
            project: {
              select: {
                id: true,
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Get next position
    const lastCard = await prisma.card.findFirst({
      where: {
        listId: list_id,
      },
      orderBy: {
        position: "desc",
      },
      select: {
        position: true,
      },
    });

    const position = lastCard ? lastCard.position + 1 : 0;

    // Create card and activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create card
      const card = await tx.card.create({
        data: {
          listId: list_id,
          title,
          description: description || null,
          position,
          dueDate: due_date ? new Date(due_date) : null,
          coverColor: cover_color || null,
          coverImage: cover_image || null,
          createdBy: userContext!.userId,
        },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: userContext!.userId,
          boardId: list.board.id,
          cardId: card.id,
          actionType: "create",
          entityType: "card",
          entityId: card.id,
          details: { card_title: title, list_id },
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
      cover_color: result.coverColor,
      cover_image: result.coverImage,
      is_archived: result.isArchived,
      created_by: result.createdBy,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
    };

    return NextResponse.json({ card: transformedCard });
  } catch (error: any) {
    console.error("Error in POST /api/kanban/cards:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
