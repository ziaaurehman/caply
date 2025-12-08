import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/invitations/validate?token=xxx - Validate an invitation token
export async function GET(request: NextRequest) {
  console.log("🔍 GET /api/invitations/validate - Starting request");
  console.log("📝 Request URL:", request.url);

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    console.log("🎫 Token:", token);

    if (!token) {
      console.log("❌ Token is missing");
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    console.log("🔍 Finding invitation with token:", token);
    // Find the invitation
    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        token,
        status: "pending",
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Check if we found any invitations
    if (!invitations || invitations.length === 0) {
      console.log("❌ No valid invitations found");
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Use the most recent invitation if multiple are found
    const invitation = invitations[0];

    // Check if invitation has expired
    const isExpired = invitation.expiresAt < new Date();
    console.log("⏰ Invitation expiration check:", {
      expiresAt: invitation.expiresAt,
      isExpired,
    });

    if (isExpired) {
      console.log("⌛ Invitation has expired");
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    console.log("✅ Returning valid invitation");
    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          logo_url: invitation.organization.logoUrl,
        },
        role: {
          id: invitation.role.id,
          name: invitation.role.name,
          display_name: invitation.role.displayName,
          description: invitation.role.description,
        },
        expires_at: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("💥 Error validating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/invitations/validate - Accept an invitation
export async function POST(request: NextRequest) {
  console.log("🔍 POST /api/invitations/validate - Starting request");

  try {
    const body = await request.json();
    const { token, userId } = body;

    if (!token || !userId) {
      console.log("❌ Missing required fields");
      return NextResponse.json(
        { error: "Token and user ID are required" },
        { status: 400 }
      );
    }

    console.log("🔍 Finding invitation with token:", token);
    // Find the invitation
    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        token,
        status: "pending",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!invitations || invitations.length === 0) {
      console.log("❌ No valid invitations found");
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Use the most recent invitation if multiple are found
    const invitation = invitations[0];

    // Check if invitation has expired
    const isExpired = invitation.expiresAt < new Date();
    console.log("⏰ Invitation expiration check:", {
      expiresAt: invitation.expiresAt,
      isExpired,
    });

    if (isExpired) {
      console.log("⌛ Invitation has expired");
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    // Check if user is already a member
    console.log("👥 Checking if user is already a member");
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId,
      },
    });

    console.log("📊 Member check result:", {
      isAlreadyMember: !!existingMember,
    });

    if (existingMember) {
      console.log("❌ User is already a member");
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 400 }
      );
    }

    // Add user as organization member and update invitation in a transaction
    console.log("➕ Adding user as organization member");
    await prisma.$transaction(async (tx) => {
      // Add user as organization member
      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          roleId: invitation.roleId,
          status: "active",
          joinedAt: new Date(),
        },
      });

      console.log("✅ Member added successfully");

      // Mark invitation as accepted
      console.log("✏️ Updating invitation status to accepted");
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "accepted",
          acceptedAt: new Date(),
        },
      });

      console.log("✅ Invitation marked as accepted");
    });

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      organizationId: invitation.organizationId,
    });
  } catch (error) {
    console.error("💥 Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
