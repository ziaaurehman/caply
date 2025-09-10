import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
import { sendInvitationEmail } from "@/lib/email";
import { validateOrganizationAccessWithId } from "@/utils/organizationUtils";
import { redisSetJSON, redisGetJSON } from "@/utils/redis";

// Cache TTL - 7 days for page 1 only (most frequently accessed)
const PAGE_ONE_CACHE_TTL = 604800; // 7 days in seconds

// Helper function to refresh team members cache
async function refreshTeamMembersCache(organizationId: string, supabase: any) {
  const cacheKeysToInvalidate = [
    `team_members:page1:${organizationId}::`, // Empty search, no status filter
    `team_members:page1:${organizationId}::active`, // Active status filter
  ];

  for (const key of cacheKeysToInvalidate) {
    try {
      const isActiveFilter = key.includes("active");

      // Get team members with proper status filtering
      const { data: members } = await supabase
        .from("organization_members")
        .select(
          `
          id,
          user_id,
          role_id,
          hourly_rate,
          weekly_capacity,
          department,
          hire_date,
          status,
          joined_at,
          users:user_id (
            id,
            email,
            full_name,
            avatar_url,
            position,
            phone,
            is_active
          ),
          roles:role_id (
            id,
            name,
            display_name,
            description
          )
        `
        )
        .eq("organization_id", organizationId)
        .eq("status", isActiveFilter ? "active" : undefined)
        .order("joined_at", { ascending: false })
        .range(0, 9); // First 10 items for page 1

      // Get pending invitations (no caching needed - they're temporary)
      const { data: invitations } = await supabase
        .from("organization_invitations")
        .select(
          `
          id,
          email,
          role_id,
          status,
          expires_at,
          created_at,
          user_id,
          roles:role_id (
            id,
            name,
            display_name,
            description
          )
        `
        )
        .eq("organization_id", organizationId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .range(0, 9); // First 10 items

      // Get total count for members only (invitations are separate)
      const { count: totalMembers } = await supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", isActiveFilter ? "active" : undefined);

      const totalPages = Math.ceil((totalMembers || 0) / 10);

      const refreshedResult = {
        members: members || [],
        invitations: invitations || [], // Fresh data, not cached
        pagination: {
          page: 1,
          limit: 10,
          total: totalMembers || 0,
          totalPages,
          hasNext: 1 < totalPages,
          hasPrev: false,
        },
      };

      await redisSetJSON(key, refreshedResult, PAGE_ONE_CACHE_TTL);
      console.log("🔄 Refreshed team members page 1 cache:", {
        key,
        membersCount: members?.length || 0,
        invitationsCount: invitations?.length || 0,
        totalMembers,
      });
    } catch (cacheError) {
      console.warn("Failed to refresh specific cache key:", key, cacheError);
    }
  }
}

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

    // Only cache page 1 with 10 items for 7 days (most frequently accessed)
    const shouldCache = page === 1 && limit === 10;
    const cacheKey = shouldCache
      ? `team_members:page1:${organizationId}:${search}:${status}`
      : null;

    // Try to get cached result first (only for page 1)
    if (shouldCache && cacheKey) {
      try {
        const cached = await redisGetJSON<any>(cacheKey);
        if (cached) {
          console.log("📋 Returning cached team members page 1 result");
          return NextResponse.json(cached);
        }
      } catch (cacheError) {
        console.log(
          "⚠️ Cache read failed, proceeding with database query:",
          cacheError
        );
      }
    }

    const supabase = await createClient();
    console.log("✅ Organization access validated for:", organizationId);

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // For search queries, we need to get the actual count after filtering
    // because count queries with complex joins don't work well with head: true
    let totalCount = 0;
    let countError = null;

    if (search) {
      console.log("🔍 Running optimized search count query for term:", search);

      // Single optimized query with joins for counting
      let searchCountQuery = supabase
        .from("organization_members")
        .select(
          `
          id,
          users!inner(email, full_name)
        `,
          { count: "exact", head: true }
        )
        .eq("organization_id", organizationId);

      // Add status filter
      if (status !== "all") {
        searchCountQuery = searchCountQuery.eq("status", status);
      }

      // Use PostgreSQL's text search for better performance
      const searchPattern = `%${search.toLowerCase()}%`;
      // searchCountQuery = searchCountQuery.or(
      //   `department.ilike.${searchPattern},users.email.ilike.${searchPattern},users.full_name.ilike.${searchPattern}`
      // );
      searchCountQuery = searchCountQuery.or(
        `(department.ilike.${searchPattern},users.email.ilike.${searchPattern},users.full_name.ilike.${searchPattern})`
      );

      const { count, error: searchCountError } = await searchCountQuery;
      totalCount = count || 0;
      countError = searchCountError?.message ?? "";

      console.log("📊 Optimized search count result:", {
        searchTerm: search,
        totalCount,
        hasError: !!searchCountError,
        errorMessage: searchCountError?.message,
      });
    } else {
      console.log("📊 Running simple count query (no search)");
      // For non-search queries, use simple count
      let countQuery = supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);

      // Add status filter
      if (status !== "all") {
        countQuery = countQuery.eq("status", status);
      }

      const { count, error } = await countQuery;
      totalCount = count || 0;
      countError = error;

      console.log("📊 Simple count result:", {
        totalCount,
        hasError: !!error,
        errorMessage: error?.message,
      });
    }

    if (countError) {
      console.error("Error counting team members:", countError);
      return NextResponse.json(
        { error: "Failed to count team members" },
        { status: 500 }
      );
    }

    // Get team members with their roles and user info
    console.log("🔍 Fetching team members for organization:", organizationId);
    let membersQuery = supabase
      .from("organization_members")
      .select(
        `
        id,
        user_id,
        role_id,
        hourly_rate,
        weekly_capacity,
        department,
        hire_date,
        status,
        joined_at,
        users:user_id (
          id,
          email,
          full_name,
          avatar_url,
          position,
          phone,
          is_active
        ),
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `
      )
      .eq("organization_id", organizationId);

    // Add status filter
    if (status !== "all") {
      membersQuery = membersQuery.eq("status", status);
    }

    // Add search filter if search term provided
    if (search) {
      console.log(
        "🔍 Applying optimized search filter to members query for term:",
        search
      );

      // Use the same optimized search pattern as count query
      const searchPattern = `%${search.toLowerCase()}%`;
      membersQuery = membersQuery.ilike("users.email", searchPattern);
      // .ilike("department", searchPattern)
      // .ilike("users.full_name", searchPattern);
      // .or(
      //   `department.ilike.${searchPattern}, users.email.ilike.${searchPattern}, users.full_name.ilike.${searchPattern}`
      // );
    }

    // Add pagination and ordering
    const { data: members, error } = await membersQuery
      .order("joined_at", { ascending: false })
      .range(offset, offset + limit - 1);

    console.log("📊 Members query result:", {
      membersCount: members?.length || 0,
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code,
    });

    if (error) {
      console.error("❌ Error fetching team members:", error);
      return NextResponse.json(
        { error: "Failed to fetch team members" },
        { status: 500 }
      );
    }

    // Get pending invitations (no caching needed - they're temporary)
    console.log(
      "🔍 Fetching pending invitations for organization:",
      organizationId
    );
    const { data: invitations, error: inviteError } = await supabase
      .from("organization_invitations")
      .select(
        `
        id,
        email,
        role_id,
        status,
        expires_at,
        created_at,
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `
      )
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    console.log("📊 Invitations query result:", {
      invitationsCount: invitations?.length || 0,
      hasError: !!inviteError,
      errorMessage: inviteError?.message,
    });

    const totalPages = Math.ceil((totalCount || 0) / limit);

    const result = {
      members: members || [],
      invitations: invitations || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    console.log("✅ Returning successful response:", {
      membersCount: result.members.length,
      invitationsCount: result.invitations.length,
      pagination: result.pagination,
    });

    // Cache the result for future requests (only page 1 for 7 days)
    if (shouldCache && cacheKey) {
      try {
        await redisSetJSON(cacheKey, result, PAGE_ONE_CACHE_TTL);
        console.log("💾 Cached team members page 1 result for 7 days");
      } catch (cacheError) {
        console.log("⚠️ Failed to cache result:", cacheError);
      }
    }

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
    console.log("📝 Request body:", body);

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

    const supabase = await createClient();
    console.log("✅ Organization access validated for:", organizationId);

    // Permission check is already done in validateOrganizationAccessWithId
    // The validation context contains the user's role and membership info
    const userContext = validation.context!;
    const userRole = userContext.membership.role.name;
    console.log("🔒 User role in organization:", userRole);

    // Check if user already exists
    console.log("🔍 Checking if user exists:", email);
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    console.log("👤 Existing user check:", {
      exists: !!existingUser,
      userId: existingUser?.id,
    });

    // Check if user is already a member
    if (existingUser) {
      const { data: existingMember } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", existingUser.id)
        .single();

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
    const { data: existingInvitation } = await supabase
      .from("organization_invitations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .eq("status", "pending")
      .single();

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
    const { data: roleInfo } = await supabase
      .from("roles")
      .select("name, display_name")
      .eq("id", roleId)
      .single();

    // Generate invitation token
    const token = crypto.randomUUID();
    console.log(
      "🎫 Generated invitation token:",
      token.substring(0, 8) + "..."
    );

    // Always create invitation (for both existing and new users)
    console.log("📧 Creating invitation for user:", email);
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: invitation, error: inviteError } = await supabase
      .from("organization_invitations")
      .insert({
        organization_id: organizationId,
        email,
        role_id: roleId,
        token,
        invited_by: userContext.userId,
        message: message || null,
        expires_at: expiresAt,
        user_id: existingUser?.id || null, // Link to existing user if they exist
      })
      .select(
        `
        id,
        email,
        role_id,
        status,
        expires_at,
        created_at,
        user_id,
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `
      )
      .single();

    if (inviteError) {
      console.error("❌ Error creating invitation:", inviteError);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    console.log("✅ Invitation created successfully");

    // Send invitation email
    try {
      console.log("📧 Sending invitation email...");

      // Get organization info for email
      const { data: orgInfo } = await supabase
        .from("organizations")
        .select("name, logo_url")
        .eq("id", organizationId)
        .single();

      // Get inviter info
      const { data: inviterInfo } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", userContext.userId)
        .single();

      const emailResult = await sendInvitationEmail({
        email,
        token,
        organizationName: orgInfo?.name || "Organization",
        organizationLogo: orgInfo?.logo_url,
        roleName: roleInfo?.display_name || "Team Member",
        inviterName: inviterInfo?.full_name || "Team Admin",
        message: message || undefined,
        expiresAt,
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

    // Refresh organizations cache for the invited user if they already exist
    try {
      if (existingUser?.id) {
        const { data: orgs } = await supabase
          .from("organization_members")
          .select(
            `
            id,
            organization_id,
            user_id,
            role_id,
            status,
            hourly_rate,
            weekly_capacity,
            department,
            hire_date,
            joined_at,
            organizations!inner(
              id,
              name,
              slug,
              description,
              logo_url,
              owner_id,
              created_at
            ),
            roles!inner(
              id,
              name,
              display_name,
              description,
              role_permissions!inner(
                permissions!inner(
                  module,
                  action
                )
              )
            )
          `
          )
          .eq("user_id", existingUser.id)
          .eq("status", "active");

        const transformed = (orgs || []).map((org: any) => ({
          id: org.organizations.id,
          name: org.organizations.name,
          slug: org.organizations.slug,
          description: org.organizations.description,
          logo_url: org.organizations.logo_url,
          is_owner: org.organizations.owner_id === existingUser.id,
          created_at: org.organizations.created_at,
          membership_status: org.status,
          membership: {
            id: org.id,
            organization_id: org.organization_id,
            user_id: org.user_id,
            role_id: org.role_id,
            status: org.status,
            hourly_rate: org.hourly_rate,
            weekly_capacity: org.weekly_capacity,
            department: org.department,
            hire_date: org.hire_date,
            joined_at: org.joined_at,
            role: {
              id: org.roles.id,
              name: org.roles.name,
              display_name: org.roles.display_name,
              description: org.roles.description,
              permissions:
                org.roles.role_permissions?.map((rp: any) => ({
                  resource: rp.permissions.module,
                  action: rp.permissions.action,
                })) || [],
            },
          },
        }));

        await redisSetJSON(
          `user:organizations:${existingUser.id}`,
          transformed,
          1296000
        );
      }
    } catch (e) {
      console.warn("Failed to refresh invited user organizations cache:", e);
    }

    // Invalidate page 1 cache after creating invitation
    try {
      await refreshTeamMembersCache(organizationId, supabase);
    } catch (e) {
      console.warn(
        "Failed to refresh team members page 1 cache after invitation:",
        e
      );
    }

    return NextResponse.json({
      success: true,
      invitation,
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
