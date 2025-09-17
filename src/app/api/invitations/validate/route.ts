import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

    console.log("🗄️ Creating Supabase client");
    const supabase = await createClient();

    console.log("🔍 Finding invitation with token:", token);
    // Find the invitation - use .maybeSingle() instead of .single() to avoid errors
    const { data: invitations, error } = await supabase
      .from("organization_invitations")
      .select(
        `
        id,
        organization_id,
        email,
        role_id,
        status,
        expires_at,
        organizations:organization_id (
          id,
          name,
          logo_url
        ),
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `
      )
      .eq("token", token)
      .eq("status", "pending");

    // Check if we found any invitations
    if (error || !invitations || invitations.length === 0) {
      console.log("❌ No valid invitations found");
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Use the most recent invitation if multiple are found
    const invitation = invitations[0];

    // Check if invitation has expired
    const isExpired = new Date(invitation.expires_at) < new Date();
    console.log("⏰ Invitation expiration check:", {
      expiresAt: invitation.expires_at,
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
        organization: invitation.organizations,
        role: invitation.roles,
        expires_at: invitation.expires_at,
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

    console.log("🗄️ Creating Supabase client");
    const supabase = await createClient();

    console.log("🔍 Finding invitation with token:", token);
    // Find the invitation - use .maybeSingle() instead of .single() to avoid errors
    const { data: invitations, error: inviteError } = await supabase
      .from("organization_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending");

    if (inviteError || !invitations || invitations.length === 0) {
      console.log("❌ No valid invitations found");
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Use the most recent invitation if multiple are found
    const invitation = invitations[0];

    // Check if invitation has expired
    const isExpired = new Date(invitation.expires_at) < new Date();
    console.log("⏰ Invitation expiration check:", {
      expiresAt: invitation.expires_at,
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
    const { data: existingMember, error: memberCheckError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", invitation.organization_id)
      .eq("user_id", userId)
      .single();

    console.log("📊 Member check result:", {
      isAlreadyMember: !!existingMember,
      hasError: !!memberCheckError && memberCheckError.code !== "PGRST116",
    });

    if (existingMember) {
      console.log("❌ User is already a member");
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 400 }
      );
    }

    // Add user as organization member
    console.log("➕ Adding user as organization member");
    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: invitation.organization_id,
        user_id: userId,
        role_id: invitation.role_id,
        status: "active",
        invited_by: invitation.invited_by,
      })
      .select()
      .single();

    if (memberError) {
      console.error("❌ Error creating member:", memberError);
      return NextResponse.json(
        { error: "Failed to accept invitation" },
        { status: 500 }
      );
    }

    console.log("✅ Member added successfully");

    // Mark invitation as accepted
    console.log("✏️ Updating invitation status to accepted");
    const { error: updateError } = await supabase
      .from("organization_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("⚠️ Error updating invitation:", updateError);
      // Don't fail the request since member was created successfully
    } else {
      console.log("✅ Invitation marked as accepted");
    }

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      organizationId: invitation.organization_id,
    });
  } catch (error) {
    console.error("💥 Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
