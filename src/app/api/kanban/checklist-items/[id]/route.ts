import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      content,
      is_completed,
      position,
      due_date,
      assigned_to_project_member_id,
      organizationId,
    } = body;
    const orgId = organizationId || req.headers.get("x-organization-id");

    // First get the checklist item to find the organization
    const existingItem = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: {
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
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Checklist item not found" },
        { status: 404 }
      );
    }

    // Get the organization ID from the item
    const itemOrgId =
      existingItem.checklist.card.list.board.project.organizationId;

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(itemOrgId, {
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

    // If assigned_to_project_member_id is provided, verify the project member exists
    if (assigned_to_project_member_id) {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          id: assigned_to_project_member_id,
          project: {
            organizationId: itemOrgId,
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

    // Update checklist item and create activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update checklist item
      const checklistItem = await tx.checklistItem.update({
        where: { id: itemId },
        data: {
          content: content !== undefined ? content : undefined,
          isCompleted: is_completed !== undefined ? is_completed : undefined,
          position: position !== undefined ? position : undefined,
          dueDate:
            due_date !== undefined
              ? due_date
                ? new Date(due_date)
                : null
              : undefined,
          assignedToProjectMemberId:
            assigned_to_project_member_id !== undefined
              ? assigned_to_project_member_id || null
              : undefined,
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
      let actionType = "update";
      let details: any = { changes: body };

      if (body.hasOwnProperty("is_completed")) {
        actionType = is_completed ? "complete" : "incomplete";
        details = {
          item_content: existingItem.content,
          completed: is_completed,
          checklist_name: existingItem.checklist.name,
          card_title: existingItem.checklist.card.title,
        };
      }

      await tx.activity.create({
        data: {
          userId: session.user.id,
          boardId: existingItem.checklist.card.list.board.id,
          cardId: existingItem.checklist.cardId,
          actionType,
          entityType: "checklist_item",
          entityId: itemId,
          details,
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
                full_name: result.projectMember.organizationMember.user.fullName,
                email: result.projectMember.organizationMember.user.email,
                avatar_url: result.projectMember.organizationMember.user.avatarUrl,
              },
            },
          }
        : null,
    };

    return NextResponse.json({ checklist_item: transformedItem });
  } catch (error) {
    console.error("Error updating checklist item:", error);
    return NextResponse.json(
      { error: "Failed to update checklist item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: itemId } = await params;

    // First get the checklist item to find the organization
    const existingItem = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: {
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
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Checklist item not found" },
        { status: 404 }
      );
    }

    // Get the organization ID from the item
    const itemOrgId =
      existingItem.checklist.card.list.board.project.organizationId;

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(itemOrgId, {
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

    // Delete checklist item and create activity log in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete checklist item
      await tx.checklistItem.delete({
        where: { id: itemId },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: session.user.id,
          boardId: existingItem.checklist.card.list.board.id,
          cardId: existingItem.checklist.cardId,
          actionType: "delete",
          entityType: "checklist_item",
          entityId: itemId,
          details: {
            item_content: existingItem.content,
            checklist_name: existingItem.checklist.name,
            card_title: existingItem.checklist.card.title,
          },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting checklist item:", error);
    return NextResponse.json(
      { error: "Failed to delete checklist item" },
      { status: 500 }
    );
  }
}
