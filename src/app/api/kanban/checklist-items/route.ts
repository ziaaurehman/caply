import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      checklist_id,
      content,
      due_date,
      assigned_to_project_member_id,
      organizationId,
    } = body;
    const orgId = organizationId || req.headers.get("x-organization-id");

    if (!checklist_id || !content) {
      return NextResponse.json(
        { error: "Checklist ID and content are required" },
        { status: 400 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(orgId, {
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

    // Verify checklist exists and user has access through project organization
    const checklist = await prisma.checklist.findFirst({
      where: {
        id: checklist_id,
        card: {
          list: {
            board: {
              project: {
                organizationId: orgId,
              },
            },
          },
        },
      },
      include: {
        card: {
          include: {
            list: {
              select: {
                boardId: true,
              },
            },
          },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404 }
      );
    }

    // If assigned_to_project_member_id is provided, verify the project member exists
    if (assigned_to_project_member_id) {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          id: assigned_to_project_member_id,
          project: {
            organizationId: orgId,
          },
        },
      });

      if (!projectMember) {
        return NextResponse.json(
          { error: "Assigned project member not found" },
          { status: 404 }
        );
      }
    }

    // Get next position
    const lastItem = await prisma.checklistItem.findFirst({
      where: {
        checklistId: checklist_id,
      },
      orderBy: {
        position: "desc",
      },
      select: {
        position: true,
      },
    });

    const position = lastItem ? lastItem.position + 1 : 0;

    // Create checklist item and activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create checklist item
      const checklistItem = await tx.checklistItem.create({
        data: {
          checklistId: checklist_id,
          content,
          position,
          dueDate: due_date ? new Date(due_date) : null,
          assignedToProjectMemberId: assigned_to_project_member_id || null,
        },
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
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: session.user.id,
          boardId: checklist.card.list.boardId,
          cardId: checklist.cardId,
          actionType: "create",
          entityType: "checklist_item",
          entityId: checklistItem.id,
          details: {
            item_content: content,
            checklist_name: checklist.name,
            card_title: checklist.card.title,
          },
        },
      });

      return checklistItem;
    });

    // Transform to match expected format
    const transformedItem = {
      id: result.id,
      checklist_id: result.checklistId,
      content: result.content,
      is_completed: result.isCompleted,
      position: result.position,
      due_date: result.dueDate,
      assigned_to_project_member_id: result.assignedToProjectMemberId,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
      project_members: result.projectMember
        ? {
            id: result.projectMember.id,
            organization_member_id: result.projectMember.organizationMemberId,
            role: result.projectMember.role,
            joined_at: result.projectMember.joinedAt,
            organization_members: {
              id: result.projectMember.organizationMember.id,
              user_id: result.projectMember.organizationMember.userId,
              users: {
                id: result.projectMember.organizationMember.user.id,
                full_name:
                  result.projectMember.organizationMember.user.fullName,
                email: result.projectMember.organizationMember.user.email,
                avatar_url:
                  result.projectMember.organizationMember.user.avatarUrl,
              },
            },
          }
        : null,
    };

    return NextResponse.json({ checklist_item: transformedItem });
  } catch (error) {
    console.error("Error creating checklist item:", error);
    return NextResponse.json(
      { error: "Failed to create checklist item" },
      { status: 500 }
    );
  }
}
