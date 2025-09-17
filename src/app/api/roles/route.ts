import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  validateOrganizationAccess,
  validateOrganizationAccessWithId,
} from "@/utils/organizationUtils";

// GET /api/roles - Get organization-specific roles with pagination
export async function GET(request: NextRequest) {
  try {
    // Get organization ID from headers or use session-based validation
    const headerOrgId = request.headers.get("x-organization-id");
    const url = new URL(request.url);

    // Get pagination parameters
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const search = url.searchParams.get("search") || "";

    let validation;
    if (headerOrgId) {
      // Use header-based validation if organization ID is provided
      validation = await validateOrganizationAccessWithId(headerOrgId, {
        resource: "roles",
        action: "read",
      });
    } else {
      // Fallback to session-based validation
      validation = await validateOrganizationAccess({
        resource: "roles",
        action: "read",
      });
    }

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const organizationId = validation.context!.organizationId;

    console.log("User organization:", organizationId);

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // First, get total count for pagination
    let countQuery = supabase
      .from("roles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("is_system_role", false);

    // Add search filter to count query if search term provided
    if (search) {
      countQuery = countQuery.or(
        `name.ilike.%${search}%,display_name.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error("Error counting roles:", countError);
      return NextResponse.json(
        { error: "Failed to count roles" },
        { status: 500 }
      );
    }

    // Build main query for data
    let query = supabase
      .from("roles")
      .select(
        `
        id,
        name,
        display_name,
        description,
        is_system_role,
        organization_id,
        created_at,
        updated_at,
        role_permissions:role_permissions(
          permissions:permission_id(
            id,
            name,
            display_name,
            description,
            module,
            action
          )
        )
      `
      )
      .eq("organization_id", organizationId)
      .eq("is_system_role", false);

    // Add search filter if search term provided
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,display_name.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // Add pagination and ordering
    const { data: roles, error } = await query
      .order("name")
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching roles:", error);
      return NextResponse.json(
        { error: "Failed to fetch roles" },
        { status: 500 }
      );
    }

    console.log(
      `Found ${roles?.length || 0} roles for organization ${organizationId}`
    );

    // Transform the data to flatten permissions
    const transformedRoles =
      roles?.map((role: any) => ({
        id: role.id,
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        is_system_role: role.is_system_role,
        organization_id: role.organization_id,
        created_at: role.created_at,
        updated_at: role.updated_at,
        permissions:
          role.role_permissions
            ?.map((rp: any) => rp.permissions)
            .filter(Boolean) || [],
      })) || [];

    const totalPages = Math.ceil((totalCount || 0) / limit);

    const result = {
      roles: transformedRoles,
      organization_id: organizationId,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in roles API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/roles - Create a new organization-specific role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, display_name, description, permission_ids, organizationId } =
      body;

    // Get organization ID from body, headers, or use session-based validation
    const headerOrgId = request.headers.get("x-organization-id");
    const orgId = organizationId || headerOrgId;

    let validation;
    if (orgId) {
      // Use header/body-based validation if organization ID is provided
      validation = await validateOrganizationAccessWithId(orgId, {
        resource: "roles",
        action: "create",
      });
    } else {
      // Fallback to session-based validation
      validation = await validateOrganizationAccess({
        resource: "roles",
        action: "create",
      });
    }

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const supabase = await createClient();
    const finalOrganizationId = validation.context!.organizationId;
    const userId = validation.context!.userId;

    console.log("Creating role with data:", {
      name,
      display_name,
      description,
      permission_ids,
      organizationId: finalOrganizationId,
    });

    if (
      !name ||
      !display_name ||
      !permission_ids ||
      !Array.isArray(permission_ids)
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields: name, display_name, permission_ids",
        },
        { status: 400 }
      );
    }

    // Check if role name already exists in this organization
    const { data: existingRole, error: checkError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", name)
      .eq("organization_id", finalOrganizationId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing role:", checkError);
      return NextResponse.json(
        { error: "Failed to validate role name" },
        { status: 500 }
      );
    }

    if (existingRole) {
      return NextResponse.json(
        {
          error: "Role name already exists in this organization",
        },
        { status: 400 }
      );
    }

    // Create the role
    const { data: newRole, error: roleError } = await supabase
      .from("roles")
      .insert({
        name: name,
        display_name: display_name,
        description: description || null,
        organization_id: finalOrganizationId,
        is_system_role: false,
      })
      .select()
      .single();

    if (roleError) {
      console.error("Error creating role:", roleError);
      return NextResponse.json(
        { error: "Failed to create role" },
        { status: 500 }
      );
    }

    console.log("Role created:", newRole);

    // Create role-permission relationships
    if (permission_ids.length > 0) {
      const rolePermissions = permission_ids.map((permissionId: string) => ({
        role_id: newRole.id,
        permission_id: permissionId,
      }));

      const { error: permissionsError } = await supabase
        .from("role_permissions")
        .insert(rolePermissions);

      if (permissionsError) {
        console.error("Error creating role permissions:", permissionsError);
        // Try to clean up the created role
        await supabase.from("roles").delete().eq("id", newRole.id);
        return NextResponse.json(
          { error: "Failed to assign permissions to role" },
          { status: 500 }
        );
      }

      console.log("Role permissions created:", rolePermissions.length);
    }

    return NextResponse.json({
      role: newRole,
      message: "Role created successfully",
    });
  } catch (error) {
    console.error("Error in POST roles API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
