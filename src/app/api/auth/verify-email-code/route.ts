import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/verify-email-code
 * Verifies the email verification code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "Email and code are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Find the verification code
    const verificationCode = await prisma.emailVerificationCode.findFirst({
      where: {
        userId: user.id,
        email: user.email,
        code,
        used: false,
        expiresAt: {
          gte: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: "desc", // Get the most recent code
      },
    });

    if (!verificationCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired verification code",
        },
        { status: 400 }
      );
    }

    // Mark code as used and verify email in a transaction
    await prisma.$transaction(async (tx) => {
      // Mark code as used
      await tx.emailVerificationCode.update({
        where: { id: verificationCode.id },
        data: { used: true },
      });

      // Verify user's email
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error: any) {
    console.error("Error verifying email code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify email code" },
      { status: 500 }
    );
  }
}

