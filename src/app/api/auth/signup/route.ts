import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  createOrganizationWithRoles,
  addUserAsAdmin,
  generateOrgSlug,
} from "@/utils/rbac/organizationSetup";

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  organization_name?: string;
}

export interface SignupResponse {
  success: boolean;
  user?: any;
  organization?: any;
  error?: string;
}

/**
 * POST /api/auth/signup
 * Handles user signup with organization creation
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<SignupResponse>> {
  try {
    const body: SignupRequest = await request.json();
    const { email, password, full_name, organization_name } = body;

    // Validate required fields
    if (!email || !password || !full_name) {
      return NextResponse.json(
        {
          success: false,
          error: "Email, password, and full name are required",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters long.",
        },
        { status: 400 }
      );
    }

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A user with this email address already exists. Please try logging in instead.",
        },
        { status: 400 }
      );
    }

    // 2. Hash the password
    const hashedPassword = await hashPassword(password);

    // 3. Create user in database
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName: full_name,
          emailVerified: false, // Email verification can be implemented later
        },
      });
    } catch (error: any) {
      // Handle duplicate email error (shouldn't happen due to check above, but just in case)
      if (error.code === "P2002" && error.meta?.target?.includes("email")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A user with this email address already exists. Please try logging in instead.",
          },
          { status: 400 }
        );
      }

      console.error("Error creating user:", error);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create user: ${error.message}`,
        },
        { status: 500 }
      );
    }

    const userId = user.id;

    // 3. Create organization with default roles
    const orgName = organization_name || `${full_name}'s Organization`;
    const orgSlug = generateOrgSlug(orgName, userId);

    const organizationResult = await createOrganizationWithRoles({
      name: orgName,
      slug: orgSlug,
      owner_id: userId,
    });

    if (organizationResult.error) {
      return NextResponse.json(
        { success: false, error: organizationResult.error },
        { status: 500 }
      );
    }

    // 4. Add user as admin to the organization
    const adminResult = await addUserAsAdmin(
      userId,
      organizationResult.organization.id
    );

    if (adminResult.error) {
      console.error("Failed to add user as admin:", adminResult.error);
      return NextResponse.json(
        { success: false, error: adminResult.error },
        { status: 500 }
      );
    }

    // Verify membership was created
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: organizationResult.organization.id,
      },
      include: {
        role: true,
        organization: true,
      },
    });

    if (!membership) {
      console.error("Membership was not created after addUserAsAdmin call");
      return NextResponse.json(
        { success: false, error: "Failed to create organization membership" },
        { status: 500 }
      );
    }

    console.log("✅ Organization membership created successfully:", {
      userId,
      organizationId: organizationResult.organization.id,
      roleId: membership.roleId,
      roleName: membership.role.name,
    });

    // 5. Fetch complete user data with organization info
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationMembers: {
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userData?.id,
        email: userData?.email,
        full_name: userData?.fullName,
        email_verified: userData?.emailVerified,
      },
      organization: organizationResult.organization,
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
