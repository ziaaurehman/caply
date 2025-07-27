import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  createOrganizationWithRoles, 
  addUserAsAdmin, 
  generateOrgSlug 
} from '@/utils/rbac/organizationSetup';

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
export async function POST(request: NextRequest): Promise<NextResponse<SignupResponse>> {
  try {
    const body: SignupRequest = await request.json();
    const { email, password, full_name, organization_name } = body;

    // Validate required fields
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        },
      },
    });

    if (authError) {
      return NextResponse.json(
        { success: false, error: `Authentication error: ${authError.message}` },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 2. Create user profile in users table
    const { error: userProfileError } = await supabase
      .from('users')
      .insert([{
        id: userId,
        email,
        full_name,
        email_verified: authData.user.email_confirmed_at !== null,
      }]);

    if (userProfileError) {
      return NextResponse.json(
        { success: false, error: `Failed to create user profile: ${userProfileError.message}` },
        { status: 500 }
      );
    }

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
    const adminResult = await addUserAsAdmin(userId, organizationResult.organization.id);
    
    if (adminResult.error) {
      return NextResponse.json(
        { success: false, error: adminResult.error },
        { status: 500 }
      );
    }

    // 5. Fetch complete user data with organization info
    const { data: userData, error: userFetchError } = await supabase
      .from('users')
      .select(`
        *,
        organization_memberships:organization_members(
          *,
          organization:organizations(*),
          role:roles(*)
        )
      `)
      .eq('id', userId)
      .single();

    if (userFetchError) {
      console.warn('Failed to fetch complete user data:', userFetchError);
    }

    return NextResponse.json({
      success: true,
      user: userData || authData.user,
      organization: organizationResult.organization,
    });

  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
