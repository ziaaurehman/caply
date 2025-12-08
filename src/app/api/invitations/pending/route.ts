import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

// GET /api/invitations/pending - Get pending invitations for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pending invitations for the current user's email
    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        email: session.user.email!,
        status: "pending",
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        inviter: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform to match expected format
    const transformedInvitations = invitations.map((invitation) => ({
      id: invitation.id,
      organization_id: invitation.organizationId,
      email: invitation.email,
      role_id: invitation.roleId,
      status: invitation.status,
      expires_at: invitation.expiresAt,
      created_at: invitation.createdAt,
      message: invitation.message,
      token: invitation.token,
      roles: {
        id: invitation.role.id,
        name: invitation.role.name,
        display_name: invitation.role.displayName,
        description: invitation.role.description,
      },
      organizations: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        logo_url: invitation.organization.logoUrl,
      },
      invited_by_user: invitation.inviter
        ? {
            id: invitation.inviter.id,
            full_name: invitation.inviter.fullName,
            email: invitation.inviter.email,
          }
        : null,
    }));

    return NextResponse.json({
      invitations: transformedInvitations,
      count: transformedInvitations.length,
    });
  } catch (error) {
    console.error("Error in pending invitations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
