import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

// POST /api/invitations/accept - Accept an invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Get the invitation
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        token,
        status: "pending",
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
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Verify the user's email matches the invitation (for security)
    if (invitation.email !== session.user.email) {
      return NextResponse.json({ error: "Email mismatch" }, { status: 403 });
    }

    // Check if user is already a member of this organization
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId: session.user.id,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this organization" },
        { status: 400 }
      );
    }

    // Add user to organization and update invitation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Add user to organization
      const newMember = await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: session.user.id,
          roleId: invitation.roleId,
          status: "active",
          joinedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              avatarUrl: true,
              position: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              displayName: true,
              description: true,
            },
          },
        },
      });

      // Update invitation status to accepted
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "accepted",
          acceptedAt: new Date(),
        },
      });

      return newMember;
    });

    // Transform to match expected format
    const transformedMember = {
      id: result.id,
      user_id: result.userId,
      role_id: result.roleId,
      status: result.status,
      joined_at: result.joinedAt,
      users: {
        id: result.user.id,
        email: result.user.email,
        full_name: result.user.fullName,
        avatar_url: result.user.avatarUrl,
        position: result.user.position,
      },
      roles: {
        id: result.role.id,
        name: result.role.name,
        display_name: result.role.displayName,
        description: result.role.description,
      },
    };

    return NextResponse.json({
      success: true,
      member: transformedMember,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        logo_url: invitation.organization.logoUrl,
      },
      message: "Successfully joined organization",
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/invitations/accept - Get invitation details (for verification)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Get the invitation details
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        token,
        status: "pending",
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
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: {
          id: invitation.role.id,
          name: invitation.role.name,
          display_name: invitation.role.displayName,
          description: invitation.role.description,
        },
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          logo_url: invitation.organization.logoUrl,
        },
        expires_at: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error getting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
