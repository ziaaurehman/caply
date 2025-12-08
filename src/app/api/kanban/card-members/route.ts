import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { card_id, project_member_id } = body;
    const organizationId =
      body.organizationId ||
      body.organization_id ||
      req.headers.get("x-organization-id");

    if (!card_id || !project_member_id) {
      return NextResponse.json(
        { error: "Card ID and Project Member ID are required" },
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

    // Verify card exists and user has access through project organization
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
          select: {
            boardId: true,
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Verify the project member exists and belongs to the same project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        id: project_member_id,
        organizationMember: {
          organizationId,
          status: "active",
        },
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

    if (!projectMember) {
      return NextResponse.json(
        { error: "Project member not found" },
        { status: 404 }
      );
    }

    // Check if project member is already assigned to the card
    const existingMember = await prisma.cardMember.findFirst({
      where: {
        cardId: card_id,
        projectMemberId: project_member_id,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "Project member is already assigned to this card" },
        { status: 400 }
      );
    }

    // Assign project member to card and create activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Assign project member to card
      const cardMember = await tx.cardMember.create({
        data: {
          cardId: card_id,
          projectMemberId: project_member_id,
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
          userId: userContext!.userId,
          boardId: card.list.boardId,
          cardId: card_id,
          actionType: "create",
          entityType: "member",
          entityId: cardMember.id,
          details: {
            assigned_project_member_id: project_member_id,
            assigned_user_name: projectMember.organizationMember.user.fullName,
            card_title: card.title,
          },
        },
      });

      return cardMember;
    });

    // Transform to match expected format
    const transformedCardMember = {
      id: result.id,
      card_id: result.cardId,
      project_member_id: result.projectMemberId,
      assigned_at: result.assignedAt,
      project_members: {
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
      },
    };

    return NextResponse.json({ card_member: transformedCardMember });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get("card_id");
    const projectMemberId = searchParams.get("project_member_id");
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    if (!cardId || !projectMemberId) {
      return NextResponse.json(
        { error: "Card ID and Project Member ID are required" },
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

    // Get the card member to delete
    const cardMember = await prisma.cardMember.findFirst({
      where: {
        cardId,
        projectMemberId,
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
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cardMember) {
      return NextResponse.json(
        { error: "Card member not found" },
        { status: 404 }
      );
    }

    // Remove project member from card and create activity log in a transaction
    await prisma.$transaction(async (tx) => {
      // Remove project member from card
      await tx.cardMember.deleteMany({
        where: {
          cardId,
          projectMemberId,
        },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: userContext!.userId,
          boardId: card.list.boardId,
          cardId: cardId,
          actionType: "delete",
          entityType: "member",
          entityId: cardMember.id,
          details: {
            removed_project_member_id: projectMemberId,
            removed_user_name:
              cardMember.projectMember.organizationMember.user.fullName,
            card_title: card.title,
          },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
