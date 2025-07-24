import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function GET(req: NextRequest) {
  console.log('Fetching capacity planning projects for user');
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = await createClient();
  
  // Get user's organization membership details
  const { data: userOrgMembership, error: orgError } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      id,
      organizations!inner (
        id,
        owner_id
      )
    `)
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();
    
  if (orgError || !userOrgMembership) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const isOwner = (userOrgMembership.organizations as any)?.owner_id === session.user.id;
  
  let data, error;

  if (isOwner) {
    // Owner can see all projects with capacity planning enabled in organization
    const response = await supabase
      .from('projects')
      .select(`
        id,
        name,
        code,
        status,
        capacity_planning_enabled,
        project_members (
          id,
          organization_member_id,
          role,
          joined_at,
          organization_members!organization_member_id (
            id,
            user_id,
            users!user_id (
              id,
              full_name,
              email,
              avatar_url
            )
          )
        )
      `)
      .eq('organization_id', userOrgMembership.organization_id)
      .eq('capacity_planning_enabled', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    data = response.data;
    error = response.error;
  } else {
    // Non-owner can only see projects they are members of with capacity planning enabled
    // First get the project IDs where user is a member
    const { data: memberProjectIds, error: memberError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('organization_member_id', userOrgMembership.id);

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    if (!memberProjectIds || memberProjectIds.length === 0) {
      data = [];
      error = null;
    } else {
      const projectIds = memberProjectIds.map(pm => pm.project_id);
      const response = await supabase
        .from('projects')
        .select(`
          id,
          name,
          code,
          status,
          capacity_planning_enabled,
          project_members (
            id,
            organization_member_id,
            role,
            joined_at,
            organization_members!organization_member_id (
              id,
              user_id,
              users!user_id (
                id,
                full_name,
                email,
                avatar_url
              )
            )
          )
        `)
        .eq('organization_id', userOrgMembership.organization_id)
        .eq('capacity_planning_enabled', true)
        .eq('status', 'active')
        .in('id', projectIds)
        .order('created_at', { ascending: false });
      
      data = response.data;
      error = response.error;
    }
  }
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ 
    projects: data || [],
    user_role: isOwner ? 'owner' : 'member',
    total_projects: data?.length || 0,
    access_level: isOwner ? 'all_organization_projects' : 'member_projects_only'
  });
}
