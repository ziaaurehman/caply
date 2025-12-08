import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get('card_id');
    const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

    if (!cardId) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      organizationId,
      { resource: 'projects', action: 'read' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

    // Verify card exists and user has access through project organization
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
      select: {
        id: true,
        title: true,
        listId: true,
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Get checklists for the card
    const checklists = await prisma.checklist.findMany({
      where: {
        cardId,
      },
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
          orderBy: {
            position: "asc",
          },
        },
      },
      orderBy: {
        position: "asc",
      },
    });

    // Transform to match expected format
    const transformedChecklists = checklists.map((checklist) => ({
      id: checklist.id,
      card_id: checklist.cardId,
      name: checklist.name,
      position: checklist.position,
      created_at: checklist.createdAt,
      updated_at: checklist.updatedAt,
      checklist_items: checklist.items.map((item) => ({
        id: item.id,
        content: item.content,
        is_completed: item.isCompleted,
        position: item.position,
        due_date: item.dueDate,
        assigned_to_project_member_id: item.assignedToProjectMemberId,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
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
    }));

    return NextResponse.json({ checklists: transformedChecklists });
  } catch (error) {
    console.error('Error fetching checklists:', error);
    return NextResponse.json({ error: 'Failed to fetch checklists' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { card_id, name, organizationId } = body;
    const orgId = organizationId || req.headers.get("x-organization-id");

    if (!card_id || !name) {
      return NextResponse.json(
        { error: "Card ID and name are required" },
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

    // Verify card exists and user has access through project organization
    const card = await prisma.card.findFirst({
      where: {
        id: card_id,
        list: {
          board: {
            project: {
              organizationId: orgId,
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

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Get next position
    const lastChecklist = await prisma.checklist.findFirst({
      where: {
        cardId: card_id,
      },
      orderBy: {
        position: "desc",
      },
      select: {
        position: true,
      },
    });

    const position = lastChecklist ? lastChecklist.position + 1 : 0;

    // Create checklist and activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create checklist
      const checklist = await tx.checklist.create({
        data: {
          cardId: card_id,
          name,
          position,
        },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: session.user.id,
          boardId: card.list.boardId,
          cardId: card_id,
          actionType: "create",
          entityType: "checklist",
          entityId: checklist.id,
          details: {
            checklist_name: name,
            card_title: card.title,
          },
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
  } catch (error) {
    console.error('Error creating checklist:', error);
    return NextResponse.json({ error: 'Failed to create checklist' }, { status: 500 });
  }
}
