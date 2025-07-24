import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function GET(req: NextRequest) {
  console.log('Fetching projects for user');
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

  // Create Kanban board if kanban_enabled is true
  if (kanban_enabled) {
    console.log('Creating default Kanban board for project:', project.id);
    
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .insert([{
        project_id: project.id,
        name: `${name} Board`,
        description: `Default Kanban board for ${name}`,
        created_by: session.user.id
      }])
      .select()
      .single();
      
    if (boardError) {
      console.error('Error creating Kanban board:', boardError);
      // Continue without failing - project is created, just board wasn't created
    } else {
      console.log('Successfully created Kanban board:', board.id);
      
      // Create default lists (To Do, In Progress, Done)
      const defaultLists = [
        { name: 'To Do', position: 0 },
        { name: 'In Progress', position: 1 },
        { name: 'Done', position: 2 }
      ];
      
      const listsData = defaultLists.map(list => ({
        board_id: board.id,
        name: list.name,
        position: list.position
      }));
      
      const { error: listsError } = await supabase
        .from('lists')
        .insert(listsData);
        
      if (listsError) {
        console.error('Error creating default lists:', listsError);
      } else {
        console.log('Successfully created default lists for board');
      }
    }
  }

  // Create default capacity allocations if capacity planning is enabled and team members are assigned
  if (capacity_planning_enabled && team_member_ids && Array.isArray(team_member_ids) && team_member_ids.length > 0) {
    console.log('Creating default capacity allocations for project:', project.id);
    
    // Get the project members that were just created
    const { data: projectMembers, error: projectMembersError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', project.id);
      
    if (!projectMembersError && projectMembers && projectMembers.length > 0) {
      // Create default capacity allocations (e.g., 20 hours per week per member)
      const defaultHoursPerWeek = 20; // Can be made configurable later
      const startDate = start_date || new Date().toISOString().split('T')[0];
      
      const allocationsData = projectMembers.map(member => ({
        project_id: project.id,
        project_member_id: member.id,
        organization_id: userOrg.organization_id,
        allocated_hours_per_week: defaultHoursPerWeek,
        start_date: startDate,
        end_date: end_date || null,
        notes: 'Default allocation created with project',
        created_by: session.user.id
      }));
      
      const { error: allocationsError } = await supabase
        .from('resource_allocations')
        .insert(allocationsData);
        
      if (allocationsError) {
        console.error('Error creating default capacity allocations:', allocationsError);
        // Continue without failing - project is created, just allocations weren't created
      } else {
        console.log(`Successfully created default capacity allocations for ${projectMembers.length} members`);
      }
    }
  }

  return NextResponse.json({ project });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('id');
  
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }
  
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
  
  // Check if project exists and user has access
  const { data: existingProject, error: projectError } = await supabase
    .from('projects')
    .select('id, organization_id, kanban_enabled, name')
    .eq('id', projectId)
    .eq('organization_id', userOrg.organization_id)
    .single();
    
  if (projectError || !existingProject) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  
  const body = await req.json();
  const {
    name, client_id, code, description, project_type, billing_rate, budget_hours, budget_amount,
    start_date, end_date, status, team_member_ids, task_categories, kanban_enabled, timesheet_enabled,
    team_availability_enabled, capacity_planning_enabled, state, documents
  } = body;
  
  // Update project
  const { data: updatedProject, error: updateError } = await supabase
    .from('projects')
    .update({
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
      documents
    })
    .eq('id', projectId)
    .select()
    .single();
    
  if (updateError) {
    console.error('Error updating project:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  
  // If Kanban was just enabled and no board exists, create one
  if (kanban_enabled && !existingProject.kanban_enabled) {
    console.log('Kanban was enabled for project, checking for existing board');
    
    // Check if board already exists
    const { data: existingBoard } = await supabase
      .from('boards')
      .select('id')
      .eq('project_id', projectId)
      .single();
      
    if (!existingBoard) {
      console.log('Creating new Kanban board for project:', projectId);
      
      const { data: board, error: boardError } = await supabase
        .from('boards')
        .insert([{
          project_id: projectId,
          name: `${updatedProject.name} Board`,
          description: `Kanban board for ${updatedProject.name}`,
          created_by: session.user.id
        }])
        .select()
        .single();
        
      if (boardError) {
        console.error('Error creating Kanban board:', boardError);
      } else {
        console.log('Successfully created Kanban board:', board.id);
        
        // Create default lists
        const defaultLists = [
          { name: 'To Do', position: 0 },
          { name: 'In Progress', position: 1 },
          { name: 'Done', position: 2 }
        ];
        
        const listsData = defaultLists.map(list => ({
          board_id: board.id,
          name: list.name,
          position: list.position
        }));
        
        const { error: listsError } = await supabase
          .from('lists')
          .insert(listsData);
          
        if (listsError) {
          console.error('Error creating default lists:', listsError);
        } else {
          console.log('Successfully created default lists for board');
        }
      }
    }
  }
  
  // Handle team member updates if provided
  if (team_member_ids && Array.isArray(team_member_ids)) {
    // Remove existing project members
    await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId);
      
    // Add new team members if any
    if (team_member_ids.length > 0) {
      const { data: validMembers, error: membersError } = await supabase
        .from('organization_members')
        .select('id, user_id')
        .eq('organization_id', userOrg.organization_id)
        .eq('status', 'active')
        .in('id', team_member_ids);
        
      if (!membersError && validMembers && validMembers.length > 0) {
        const projectMembersData = validMembers.map(member => ({
          project_id: projectId,
          organization_member_id: member.id,
          added_by: session.user.id
        }));
        
        await supabase
          .from('project_members')
          .insert(projectMembersData);
      }
    }
  }
  
  return NextResponse.json({ project: updatedProject });
}