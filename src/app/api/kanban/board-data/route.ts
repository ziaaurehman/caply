import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/utils/serializeBigInt";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const organizationId = searchParams.get("organizationId");
    const boardId = searchParams.get("board_id");
    const includeArchived = searchParams.get("include_archived") === "true";
    const search = searchParams.get("search") || "";

    if (!projectId || !organizationId) {
      return NextResponse.json(
        { error: "Project ID and Organization ID are required" },
        { status: 400 }
      );
    }

    // Step 1: Get project details
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Step 2: Get project members
    const projectMembers = await prisma.projectMember.findMany({
      where: {
        projectId,
      },
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
    });

    // Step 3: Get boards
    let boards = await prisma.board.findMany({
      where: {
        projectId,
      },
      orderBy: {
        position: "asc",
      },
    });

    // Create default board if none exists
    let currentBoard = boards[0];
    if (boards.length === 0) {
      const newBoard = await prisma.board.create({
        data: {
          projectId,
          name: `${project.name} Board`,
          description: `Kanban board for ${project.name}`,
          backgroundColor: "#0079bf",
          visibility: "project",
          position: 0,
          createdBy: project.createdBy || "",
        },
      });
      currentBoard = newBoard;
      boards = [newBoard];
    } else {
      // Use specified board or first board
      currentBoard = boardId
        ? boards.find((b: { id: string }) => b.id === boardId) || boards[0]
        : boards[0];
    }

    if (!currentBoard) {
      return NextResponse.json(
        { error: "No board available" },
        { status: 404 }
      );
    }

    // Step 4: Get lists
    const listsWhere: any = {
      boardId: currentBoard.id,
    };

    if (!includeArchived) {
      listsWhere.isArchived = false;
    }

    const lists = await prisma.list.findMany({
      where: listsWhere,
      orderBy: {
        position: "asc",
      },
    });

    // Step 5: Get cards
    const listIds = lists.map((list: { id: string }) => list.id);
    let cards: any[] = [];

    if (listIds.length > 0) {
      const cardsWhere: any = {
        listId: {
          in: listIds,
        },
      };

      if (!includeArchived) {
        cardsWhere.isArchived = false;
      }

      if (search.trim()) {
        cardsWhere.OR = [
          { title: { contains: search.trim(), mode: "insensitive" } },
          { description: { contains: search.trim(), mode: "insensitive" } },
        ];
      }

      cards = await prisma.card.findMany({
        where: cardsWhere,
        orderBy: {
          position: "asc",
        },
      });
    }

    // Step 6: Get all related data for cards
    const cardIds = cards.map((card: any) => card.id);

    const [cardMembers, cardLabels, checklists, comments, attachments]: [
      any[],
      any[],
      any[],
      any[],
      any[],
    ] = await Promise.all([
      cardIds.length > 0
        ? prisma.cardMember.findMany({
            where: { cardId: { in: cardIds } },
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
          })
        : [],
      cardIds.length > 0
        ? prisma.cardLabel.findMany({
            where: { cardId: { in: cardIds } },
            include: {
              label: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  boardId: true,
                },
              },
            },
          })
        : [],
      cardIds.length > 0
        ? prisma.checklist.findMany({
            where: { cardId: { in: cardIds } },
            orderBy: {
              position: "asc",
            },
          })
        : [],
      cardIds.length > 0
        ? prisma.comment.findMany({
            where: { cardId: { in: cardIds } },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          })
        : [],
      cardIds.length > 0
        ? prisma.attachment.findMany({
            where: { cardId: { in: cardIds } },
            include: {
              uploader: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: {
              uploadedAt: "asc",
            },
          })
        : [],
    ]);

    // Get checklist items after checklists are fetched
    const checklistItems =
      checklists.length > 0
        ? await prisma.checklistItem.findMany({
            where: {
              checklistId: {
                in: checklists.map((cl: any) => cl.id),
              },
            },
            orderBy: {
              position: "asc",
            },
          })
        : [];

    // Step 7: Get board labels
    const boardLabels = await prisma.label.findMany({
      where: {
        boardId: currentBoard.id,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Step 8 & 9: Organize and enrich the data
    const enrichedCards = cards.map((card: any) => {
      // Attach card members
      const cardMembersList = cardMembers
        .filter((cm: any) => cm.cardId === card.id)
        .map((cm: any) => ({
          id: cm.id,
          card_id: cm.cardId,
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
        }));

      // Attach card labels
      const cardLabelsList = cardLabels
        .filter((cl: any) => cl.cardId === card.id)
        .map((cl: any) => cl.label);

      // Attach checklists with items
      const cardChecklists = checklists
        .filter((cl: any) => cl.cardId === card.id)
        .map((checklist: any) => ({
          id: checklist.id,
          card_id: checklist.cardId,
          name: checklist.name,
          position: checklist.position,
          created_at: checklist.createdAt,
          checklist_items: checklistItems
            .filter((ci: any) => ci.checklistId === checklist.id)
            .map((item: any) => ({
              id: item.id,
              checklist_id: item.checklistId,
              content: item.content,
              is_completed: item.isCompleted,
              position: item.position,
              due_date: item.dueDate,
              assigned_to_project_member_id: item.assignedToProjectMemberId,
              created_at: item.createdAt,
              updated_at: item.updatedAt,
            })),
        }));

      // Attach comments with user info
      const cardComments = comments
        .filter((c: any) => c.cardId === card.id)
        .map((comment: any) => ({
          id: comment.id,
          card_id: comment.cardId,
          user_id: comment.userId,
          content: comment.content,
          created_at: comment.createdAt,
          updated_at: comment.updatedAt,
          users: {
            id: comment.user.id,
            full_name: comment.user.fullName,
            avatar_url: comment.user.avatarUrl,
          },
        }));

      // Attach attachments with user info
      const cardAttachments = attachments
        .filter((a: any) => a.cardId === card.id)
        .map((attachment: any) => ({
          id: attachment.id,
          card_id: attachment.cardId,
          filename: attachment.filename,
          original_filename: attachment.originalFilename,
          file_path: attachment.filePath,
          file_size: Number(attachment.fileSize),
          mime_type: attachment.mimeType,
          uploaded_by: attachment.uploadedBy,
          uploaded_at: attachment.uploadedAt,
          users: {
            id: attachment.uploader.id,
            full_name: attachment.uploader.fullName,
            avatar_url: attachment.uploader.avatarUrl,
          },
        }));

      return {
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
        card_members: cardMembersList,
        labels: cardLabelsList,
        checklists: cardChecklists,
        comments: cardComments,
        attachments: cardAttachments,
      };
    });

    // Step 10: Organize cards by list
    const listsWithCards = lists.map((list: any) => ({
      id: list.id,
      board_id: list.boardId,
      name: list.name,
      position: list.position,
      is_archived: list.isArchived,
      created_at: list.createdAt,
      updated_at: list.updatedAt,
      cards: enrichedCards.filter((card: any) => card.list_id === list.id),
    }));

    // Transform project and boards to match expected format
    const transformedProject = {
      ...project,
      project_members: projectMembers.map((pm: any) => ({
        id: pm.id,
        organization_member_id: pm.organizationMemberId,
        role: pm.role,
        joined_at: pm.joinedAt,
        organization_members: {
          id: pm.organizationMember.id,
          user_id: pm.organizationMember.userId,
          users: {
            id: pm.organizationMember.user.id,
            full_name: pm.organizationMember.user.fullName,
            email: pm.organizationMember.user.email,
            avatar_url: pm.organizationMember.user.avatarUrl,
          },
        },
      })),
    };

    const transformedBoards = boards.map((board: any) => ({
      id: board.id,
      project_id: board.projectId,
      name: board.name,
      description: board.description,
      background_color: board.backgroundColor,
      background_image: board.backgroundImage,
      is_closed: board.isClosed,
      visibility: board.visibility,
      position: board.position,
      created_by: board.createdBy,
      created_at: board.createdAt,
      updated_at: board.updatedAt,
    }));

    const transformedCurrentBoard = {
      id: currentBoard.id,
      project_id: currentBoard.projectId,
      name: currentBoard.name,
      description: currentBoard.description,
      background_color: currentBoard.backgroundColor,
      background_image: currentBoard.backgroundImage,
      is_closed: currentBoard.isClosed,
      visibility: currentBoard.visibility,
      position: currentBoard.position,
      created_by: currentBoard.createdBy,
      created_at: currentBoard.createdAt,
      updated_at: currentBoard.updatedAt,
    };

    const responseData = {
      success: true,
      data: {
        project: transformedProject,
        boards: transformedBoards,
        currentBoard: transformedCurrentBoard,
        lists: listsWithCards,
        cards: enrichedCards,
        labels: boardLabels,
      },
    };

    return NextResponse.json(serializeBigInt(responseData))
  } catch (error) {
    console.error("Error fetching board data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
