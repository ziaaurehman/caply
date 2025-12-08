import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commentId = params.id;
    const body = await req.json();
    const { content, organizationId } = body;
    const orgId = organizationId || req.headers.get("x-organization-id");

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // First, get the comment and verify ownership
    const existingComment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        userId: session.user.id, // Only the author can edit their comment
      },
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

    if (!existingComment) {
      return NextResponse.json(
        {
          error:
            "Comment not found or you are not authorized to edit it",
        },
        { status: 404 }
      );
    }

    // Get organization ID from the comment's card
    const commentOrgId =
      existingComment.card.list.board.project.organizationId;

    // If organizationId was provided, validate it matches
    if (orgId && orgId !== commentOrgId) {
      return NextResponse.json(
        { error: "Organization ID mismatch" },
        { status: 400 }
      );
    }

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(commentOrgId, {
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

    // Update comment and create activity log in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update comment
      const comment = await tx.comment.update({
        where: { id: commentId },
        data: {
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
          boardId: existingComment.card.list.boardId,
          cardId: existingComment.cardId,
          actionType: "update",
          entityType: "comment",
          entityId: commentId,
          details: {
            old_content: existingComment.content,
            new_content: content,
            card_title: existingComment.card.title,
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
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commentId = params.id;
    const organizationId = req.headers.get("x-organization-id");

    // First, get the comment and verify ownership
    const existingComment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        userId: session.user.id, // Only the author can delete their comment
      },
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

    if (!existingComment) {
      return NextResponse.json(
        {
          error:
            "Comment not found or you are not authorized to delete it",
        },
        { status: 404 }
      );
    }

    // Get organization ID from the comment's card
    const commentOrgId =
      existingComment.card.list.board.project.organizationId;

    // If organizationId was provided, validate it matches
    if (organizationId && organizationId !== commentOrgId) {
      return NextResponse.json(
        { error: "Organization ID mismatch" },
        { status: 400 }
      );
    }

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(commentOrgId, {
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

    // Delete comment and create activity log in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete comment
      await tx.comment.delete({
        where: { id: commentId },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          userId: session.user.id,
          boardId: existingComment.card.list.boardId,
          cardId: existingComment.cardId,
          actionType: "delete",
          entityType: "comment",
          entityId: commentId,
          details: {
            comment_content: existingComment.content,
            card_title: existingComment.card.title,
          },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
