import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationCodeEmail } from "@/lib/email";

/**
 * POST /api/auth/send-verification-code
 * Sends a verification code to the user's email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    console.log("email received",email)

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
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

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(code)

    // Set expiration to 15 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Delete any existing unused codes for this user
    await prisma.emailVerificationCode.deleteMany({
      where: {
        userId: user.id,
        used: false,
      },
    });

    // Create new verification code
    await prisma.emailVerificationCode.create({
      data: {
        userId: user.id,
        email: user.email,
        code,
        expiresAt,
      },
    });

    // Send verification code email
    const emailResult = await sendVerificationCodeEmail({
      email: user.email,
      name: user.fullName,
      code,
    });

    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
    });
  } catch (error: any) {
    console.error("Error sending verification code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}

