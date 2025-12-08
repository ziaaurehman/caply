import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendInvitationEmail } from "@/lib/email";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";

// Helper function to refresh team members cache
async function refreshTeamMembersCache(organizationId: string) {}

export { refreshTeamMembersCache };

// GET /api/team-members - List all team members in the organization with pagination
export async function GET(request: NextRequest) {
  console.log("🔍 GET /api/team-members - Starting request");

  try {
    // Get organization ID from query params or headers
    const url = new URL(request.url);
    const organizationId =
      url.searchParams.get("organizationId") ||
      request.headers.get("x-organization-id");

    // Get pagination parameters
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "active";

    if (!organizationId) {
      return NextResponse.json(
        {
          error: "Organization ID is required",
        },
        { status: 400 }
      );
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "users",
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

    console.log("✅ Organization access validated for:", organizationId);

    // Calculate offset for pagination
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      organizationId,
    };

    // Add status filter
    if (status !== "all") {
      where.status = status;
    }

    // Add search filter if search term provided
    if (search) {
      where.OR = [
        { department: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Get total count and members in parallel
    const [totalCount, members] = await Promise.all([
      prisma.organizationMember.count({ where }),
      prisma.organizationMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: { joinedAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              avatarUrl: true,
              position: true,
              phone: true,
              isActive: true,
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
      }),
    ]);

    console.log("📊 Members query result:", {
      membersCount: members?.length || 0,
      totalCount,
    });

    // Transform members to match expected format
    const transformedMembers = members.map((member) => ({
      id: member.id,
      user_id: member.userId,
      role_id: member.roleId,
      hourly_rate: member.hourlyRate,
      weekly_capacity: member.weeklyCapacity,
      department: member.department,
      hire_date: member.hireDate,
      status: member.status,
      joined_at: member.joinedAt,
      users: {
        id: member.user.id,
        email: member.user.email,
        full_name: member.user.fullName,
        avatar_url: member.user.avatarUrl,
        position: member.user.position,
        phone: member.user.phone,
        is_active: member.user.isActive,
      },
      roles: {
        id: member.role.id,
        name: member.role.name,
        display_name: member.role.displayName,
        description: member.role.description,
      },
    }));

    // Get pending invitations
    console.log(
      "🔍 Fetching pending invitations for organization:",
      organizationId
    );
    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        organizationId,
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
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform invitations to match expected format
    const transformedInvitations = invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role_id: invitation.roleId,
      status: invitation.status,
      expires_at: invitation.expiresAt,
      created_at: invitation.createdAt,
      roles: {
        id: invitation.role.id,
        name: invitation.role.name,
        display_name: invitation.role.displayName,
        description: invitation.role.description,
      },
    }));

    console.log("📊 Invitations query result:", {
      invitationsCount: transformedInvitations.length,
    });

    const totalPages = Math.ceil(totalCount / limit);

    const result = {
      members: transformedMembers,
      invitations: transformedInvitations,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("💥 Unexpected error in team members API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/team-members - Invite a new team member
export async function POST(request: NextRequest) {
  console.log("🔍 POST /api/team-members - Starting request");

  try {
    const body = await request.json();

    const {
      email,
      roleId,
      department,
      hourlyRate,
      weeklyCapacity,
      message,
      organizationId,
    } = body;

    if (!email || !roleId || !organizationId) {
      console.log("❌ Missing required fields:", {
        email: !!email,
        roleId: !!roleId,
        organizationId: !!organizationId,
      });
      return NextResponse.json(
        { error: "Email, role, and organization ID are required" },
        { status: 400 }
      );
    }

    // Get organization ID from headers for additional validation
    const headerOrgId = request.headers.get("x-organization-id");

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: "users",
      action: "create",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    // Additional validation: check if header organization ID matches (if provided)
    if (headerOrgId && headerOrgId !== organizationId) {
      return NextResponse.json(
        { error: "Organization ID mismatch" },
        { status: 403 }
      );
    }

    console.log("✅ Organization access validated for:", organizationId);

    // Permission check is already done in validateOrganizationAccessWithId
    // The validation context contains the user's role and membership info
    const userContext = validation.context!;
    const userRole = userContext.membership.role.name;
    console.log("🔒 User role in organization:", userRole);

    // Check if user already exists
    console.log("🔍 Checking if user exists:", email);
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    console.log("👤 Existing user check:", {
      exists: !!existingUser,
      userId: existingUser?.id,
    });

    // Check if user is already a member
    if (existingUser) {
      const existingMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId,
          userId: existingUser.id,
        },
      });

      console.log("👥 Existing member check:", {
        isAlreadyMember: !!existingMember,
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId,
        email,
        status: "pending",
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    console.log("📧 Existing invitation check:", {
      hasInvitation: !!existingInvitation,
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "Invitation already sent to this email" },
        { status: 400 }
      );
    }

    // Get role information for the invitation
    const roleInfo = await prisma.role.findUnique({
      where: { id: roleId },
      select: { name: true, displayName: true },
    });

    // Generate invitation token
    const token = crypto.randomUUID();
    console.log(
      "🎫 Generated invitation token:",
      token.substring(0, 8) + "..."
    );

    // Always create invitation (for both existing and new users)
    console.log("📧 Creating invitation for user:", email);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId,
        email,
        roleId,
        token,
        invitedBy: userContext.userId,
        message: message || null,
        expiresAt,
        userId: existingUser?.id || null, // Link to existing user if they exist
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
      },
    });

    console.log("✅ Invitation created successfully");

    // Send invitation email
    try {
      console.log("📧 Sending invitation email...");

      // Get organization info for email
      const orgInfo = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, logoUrl: true },
      });

      // Get inviter info
      const inviterInfo = await prisma.user.findUnique({
        where: { id: userContext.userId },
        select: { fullName: true },
      });

      const emailResult = await sendInvitationEmail({
        email,
        token,
        organizationName: orgInfo?.name || "Organization",
        organizationLogo: orgInfo?.logoUrl || undefined,
        roleName: roleInfo?.displayName || "Team Member",
        inviterName: inviterInfo?.fullName || "Team Admin",
        message: message || undefined,
        expiresAt: expiresAt.toISOString(),
      });

      if (emailResult.success) {
        console.log(
          `✅ Invitation email sent successfully via ${emailResult.provider}`
        );
        if (emailResult.fallback) {
          console.log("⚠️ Email sent using fallback method");
        }
      } else {
        console.error(
          "⚠️ Failed to send invitation email, but invitation was created:",
          emailResult.error
        );
      }
    } catch (emailError) {
      console.error(
        "⚠️ Failed to send invitation email, but invitation was created:",
        emailError
      );
      // Don't fail the request if email fails - invitation is still created
    }

    // Transform invitation to match expected format
    const transformedInvitation = {
      id: invitation.id,
      email: invitation.email,
      role_id: invitation.roleId,
      status: invitation.status,
      expires_at: invitation.expiresAt,
      created_at: invitation.createdAt,
      user_id: invitation.userId,
      roles: {
        id: invitation.role.id,
        name: invitation.role.name,
        display_name: invitation.role.displayName,
        description: invitation.role.description,
      },
    };

    return NextResponse.json({
      success: true,
      invitation: transformedInvitation,
      message: existingUser
        ? "Invitation sent to existing user"
        : "Invitation sent to new user",
    });
  } catch (error) {
    console.error("💥 Unexpected error in team members POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
