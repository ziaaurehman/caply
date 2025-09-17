import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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

    const supabase = await createClient();

    // Get the invitation
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
        user_id,
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
        )
      `
      )
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
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
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", invitation.organization_id)
      .eq("user_id", session.user.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this organization" },
        { status: 400 }
      );
    }

    // Add user to organization
    const { data: newMember, error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: invitation.organization_id,
        user_id: session.user.id,
        role_id: invitation.role_id,
        status: "active",
        invited_by: invitation.invited_by,
        joined_at: new Date().toISOString(),
      })
      .select(
        `
        id,
        user_id,
        role_id,
        status,
        joined_at,
        users:user_id (
          id,
          email,
          full_name,
          avatar_url,
          position
        ),
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `
      )
      .single();

    if (memberError) {
      return NextResponse.json(
        { error: "Failed to join organization" },
        { status: 500 }
      );
    }

    // Update invitation status to accepted
    const { error: updateError } = await supabase
      .from("organization_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      // Don't fail the request if invitation update fails
    }

    return NextResponse.json({
      success: true,
      member: newMember,
      organization: invitation.organizations,
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
        )
      `
      )
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.roles,
        organization: invitation.organizations,
        expires_at: invitation.expires_at,
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
