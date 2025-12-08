import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get("card_id");
    const organizationId =
      searchParams.get("organizationId") ||
      req.headers.get("x-organization-id");

    if (!cardId) {
      return NextResponse.json(
        { error: "Card ID is required" },
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

    // Get comments for the card
    const comments = await prisma.comment.findMany({
      where: {
        cardId,
      },
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
    });

    // Transform to match expected format
    const transformedComments = comments.map((comment) => ({
      id: comment.id,
      card_id: comment.cardId,
      user_id: comment.userId,
      content: comment.content,
      created_at: comment.createdAt,
      updated_at: comment.updatedAt,
      users: {
        id: comment.user.id,
        full_name: comment.user.fullName,
        email: comment.user.email,
        avatar_url: comment.user.avatarUrl,
      },
    }));

    const result = { comments: transformedComments };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get session first (like other APIs)
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { card_id, content, organizationId } = body;
    const orgId = organizationId || req.headers.get("x-organization-id");

    if (!card_id || !content) {
      return NextResponse.json(
        { error: "Card ID and content are required" },
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

    // Create comment and activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create comment
      const comment = await tx.comment.create({
        data: {
          cardId: card_id,
          userId: session.user.id,
          content,
        },
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
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: session.user.id,
          boardId: card.list.boardId,
          cardId: card_id,
          actionType: "create",
          entityType: "comment",
          entityId: comment.id,
          details: {
            comment_content: content,
            card_title: card.title,
          },
        },
      });

      return comment;
    });

    // Transform to match expected format
    const transformedComment = {
      id: result.id,
      card_id: result.cardId,
      user_id: result.userId,
      content: result.content,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
      users: {
        id: result.user.id,
        full_name: result.user.fullName,
        email: result.user.email,
        avatar_url: result.user.avatarUrl,
      },
    };

    return NextResponse.json({ comment: transformedComment });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
