import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    const userId = params.id;
    const currentUserId = session.user.id;

    // Check if user is requesting their own data or has permission to view other users
    if (userId !== currentUserId) {
      // Check if current user has permission to view other users
      const { data: hasPermission } = await supabase.rpc('user_has_permission', {
        user_id: currentUserId,
        permission_name: 'users.read'
      });

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // Get user's role and permissions
    const { data: userRoleData, error: roleError } = await supabase
      .from('organization_members')
      .select(`
        role_id,
        organization_id,
        status,
        roles (
          id,
          name,
          display_name,
          description,
          is_system_role
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (roleError || !userRoleData) {
      return NextResponse.json(
        { error: 'User role not found' },
        { status: 404 }
      );
    }

    // Get all permissions for the user's role
    const { data: permissions, error: permissionsError } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          id,
          name,
          display_name,
          description,
          module,
          action
        )
      `)
      .eq('role_id', userRoleData.role_id);

    if (permissionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 }
      );
    }

    // Check if user is super admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', userId)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    const userPermissions = permissions?.map((p: any) => p.permissions).filter(Boolean) || [];

    return NextResponse.json({
      userId,
      organizationId: userRoleData.organization_id,
      role: userRoleData.roles,
      permissions: userPermissions,
      isSuperAdmin: userData.is_super_admin || false,
      status: userRoleData.status
    });

  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 