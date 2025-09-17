import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
import { createClient } from "@/utils/supabase/server";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { sendInvitationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from("organization_invitations")
      .select(
        `
        id,
        organization_id,
        email,
        role_id,
        status,
        expires_at,
        created_at,
        message,
        token,
        invited_by,
        roles:role_id (
          id,
          name,
          display_name,
          description
        ),
        organizations:organization_id (
          id,
          name,
          logo_url
        ),
        invited_by_user:invited_by (
          id,
          full_name,
          email
        )
      `
      )
      .eq("id", invitationId)
      .single();

    if (inviteError || !invitation) {
      console.error("Error fetching invitation:", inviteError);
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Validate organization access
    const validation = await validateOrganizationAccessWithId(
      invitation.organization_id,
      { resource: "users", action: "create" }
    );

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation is not pending" },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Generate new token and expiry
    const newToken = crypto.randomUUID();
    const newExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Update the invitation with new token and expiry
    const { error: updateError } = await supabase
      .from("organization_invitations")
      .update({
        token: newToken,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      return NextResponse.json(
        { error: "Failed to update invitation" },
        { status: 500 }
      );
    }

    // Send the new invitation email
    try {
      await sendInvitationEmail({
        email: invitation.email,
        organizationName: invitation.organizations.name,
        roleName: invitation.roles.display_name || invitation.roles.name,
        inviterName: invitation.invited_by_user.full_name,
        token: newToken,
        message: invitation.message,
        organizationLogo: invitation.organizations.logo_url,
      });
    } catch (emailError) {
      console.error("Error sending invitation email:", emailError);
      return NextResponse.json(
        { error: "Failed to send invitation email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation resent successfully",
      expiresAt: newExpiresAt,
    });
  } catch (error) {
    console.error("Error resending invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
