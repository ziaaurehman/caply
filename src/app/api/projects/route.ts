import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function GET(req: NextRequest) {
  console.log('Fetching projects for user');
  
  // Get organization ID from query params or headers
  const url = new URL(req.url)
  const organizationId = url.searchParams.get('organizationId') || req.headers.get('x-organization-id')
  
  if (!organizationId) {
    return NextResponse.json({ 
      error: 'Organization ID is required' 
    }, { status: 400 })
  }

  // Validate organization access and permissions
  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'projects', action: 'read' }
  )

  if (!validation.success) {
    return NextResponse.json({ 
      error: validation.error 
    }, { status: validation.status })
  }

  const supabase = await createClient()
  const userContext = validation.context!
  
  console.log('✅ Organization access validated for:', organizationId)
  
  // Check if user has admin/manager role or projects.manage permission for full access
  const hasFullAccess = userContext.membership.role.name === 'admin' || 
                       userContext.membership.role.name === 'manager' ||
                       userContext.membership.role.permissions.some(p => 
                         p.resource === 'projects' && p.action === 'manage'
                       )

  let data, error;

  if (hasFullAccess) {
    // User with full access can see all projects in organization
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
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    data = response.data;
    error = response.error;
  } else {
    // Regular users can only see projects they are members of
    // First get the project IDs where user is a member
    const { data: memberProjectIds, error: memberError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('organization_member_id', userContext.membership.id);

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    if (!memberProjectIds || memberProjectIds.length === 0) {
      data = [];
    } else {
      const projectIds = memberProjectIds.map(p => p.project_id);
      
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
        .eq('organization_id', organizationId)
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
    user_role: hasFullAccess ? 'admin' : 'member',
    total_projects: data?.length || 0,
    access_level: hasFullAccess ? 'all_organization_projects' : 'member_projects_only'
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const organizationId = body.organizationId || body.organization_id || req.headers.get('x-organization-id')
  
  if (!organizationId) {
    return NextResponse.json({ 
      error: 'Organization ID is required' 
    }, { status: 400 })
  }

  // Validate organization access and permissions
  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'projects', action: 'create' }
  )

  if (!validation.success) {
    return NextResponse.json({ 
      error: validation.error 
    }, { status: validation.status })
  }

  const supabase = await createClient()
  const userContext = validation.context!
  
  // Accept all fields from migration, set org/user context
  const {
    client_id, name, code, description, project_type, billing_rate, budget_hours, budget_amount,
    start_date, end_date, status, team_member_ids, task_categories, kanban_enabled, timesheet_enabled,
    team_availability_enabled, capacity_planning_enabled, state, documents
  } = body;

  try {
    // Create the project
    const { data: project, error } = await supabase
      .from('projects')
      .insert([{
        organization_id: organizationId,
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
        created_by: userContext.userId
      }])
      .select()
      .single();
      
    if (error) {
      console.error('Error creating project:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add team members if provided
    if (team_member_ids && Array.isArray(team_member_ids) && team_member_ids.length > 0) {
      // Validate that all team_member_ids are valid organization members
      const { data: validMembers, error: membersError } = await supabase
        .from('organization_members')
        .select('id, user_id')
        .eq('organization_id', organizationId)
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
          added_by: userContext.userId
        }));
        
        const { error: projectMembersError } = await supabase
          .from('project_members')
          .insert(projectMembersData);
          
        if (projectMembersError) {
          console.error('Error adding team members to project:', projectMembersError);
          // Continue without failing - project is created, just members weren't added
        } else {
          // Log the successful project creation
          console.log(`Project ${project.name} created successfully by user ${userContext.userId}`);
        }
      } else {
        console.log('No valid team members found or no team members provided');
      }
    }

    // Create default Kanban board if kanban is enabled
    if (kanban_enabled) {
      console.log('Creating default Kanban board for project:', project.id);
      
      const { data: board, error: boardError } = await supabase
        .from('boards')
        .insert([{
          project_id: project.id,
          name: `${name} Board`,
          description: `Default Kanban board for ${name}`,
          created_by: userContext.userId
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
          organization_id: organizationId,
          allocated_hours_per_week: defaultHoursPerWeek,
          start_date: startDate,
          end_date: end_date || null,
          notes: 'Default allocation created with project',
          created_by: userContext.userId
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
    
    return NextResponse.json({ 
      success: true,
      project: {
        ...project,
        team_members: team_member_ids || []
      }
    });
  } catch (error) {
    console.error('Error in project creation:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id: projectId, organizationId, ...updateData } = body;
  
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  if (!organizationId) {
    return NextResponse.json({ 
      error: 'Organization ID is required' 
    }, { status: 400 })
  }

  // Validate organization access and permissions
  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'projects', action: 'update' }
  )

  if (!validation.success) {
    return NextResponse.json({ 
      error: validation.error 
    }, { status: validation.status })
  }

  const supabase = await createClient()
  const userContext = validation.context!
  
  // Check if project exists and belongs to the organization
  const { data: existingProject, error: projectError } = await supabase
    .from('projects')
    .select('id, organization_id, kanban_enabled, name')
    .eq('id', projectId)
    .eq('organization_id', organizationId)
    .single();
    
  if (projectError || !existingProject) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  try {
    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating project:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      project: updatedProject
    });
  } catch (error) {
    console.error('Error in project update:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}