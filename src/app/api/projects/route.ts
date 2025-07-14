import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function GET(req: NextRequest) {
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
    // Owner can see all projects in organization
    const response = await supabase
      .from('projects')
      .select(`
        *,
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
      .order('created_at', { ascending: false });
    
    data = response.data;
    error = response.error;
  } else {
    // Non-owner can only see projects they are members of
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
          *,
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = await createClient();
  // Get user's organization
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();
  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  const body = await req.json();
  // Accept all fields from migration, set org/user context
  const {
    name, client_id, code, description, project_type, billing_rate, budget_hours, budget_amount,
    start_date, end_date, status, team_member_ids, task_categories, kanban_enabled, timesheet_enabled,
    team_availability_enabled, capacity_planning_enabled, state, documents
  } = body;
  if (!name) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
  }
  console.log('Creating project:', body);
  
  // Create project without team_member_ids (we'll handle this separately)
  const { data: project, error } = await supabase
    .from('projects')
    .insert([{
      organization_id: userOrg.organization_id,
      client_id,
      name,
      code,
      description,
      project_type,
      billing_rate,
      budget_hours,
      budget_amount,
      start_date,
      end_date,
      status,
      task_categories,
      kanban_enabled,
      timesheet_enabled,
      team_availability_enabled,
      capacity_planning_enabled,
      state,
      documents,
      created_by: session.user.id
    }])
    .select()
    .single();
    
  if (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Handle team member assignments if provided
  if (team_member_ids && Array.isArray(team_member_ids) && team_member_ids.length > 0) {
    console.log('Adding team members to project:', team_member_ids);
    
    // Validate that all team_member_ids are valid organization members
    const { data: validMembers, error: membersError } = await supabase
      .from('organization_members')
      .select('id, user_id')
      .eq('organization_id', userOrg.organization_id)
      .eq('status', 'active')
      .in('id', team_member_ids);
      
    if (membersError) {
      console.error('Error validating team members:', membersError);
      // Continue without failing - just log the error
    } else if (validMembers && validMembers.length > 0) {
      // Create project_members entries
      const projectMembersData = validMembers.map(member => ({
        project_id: project.id,
        organization_member_id: member.id,
        added_by: session.user.id
      }));
      
      const { error: projectMembersError } = await supabase
        .from('project_members')
        .insert(projectMembersData);
        
      if (projectMembersError) {
        console.error('Error adding project members:', projectMembersError);
        // Continue without failing - project is created, just members weren't added
      } else {
        console.log(`Successfully added ${validMembers.length} members to project`);
      }
    }
  }

  return NextResponse.json({ project });
} 