import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON } from '@/utils/redis';

// Cache TTL - 7 days for page 1 only (most frequently accessed)
const PAGE_ONE_CACHE_TTL = 604800; // 7 days in seconds

export async function GET(req: NextRequest) {
  console.log('🔍 GET /api/projects - Starting request');
  
  try {
    // Get organization ID from query params or headers
    const url = new URL(req.url)
    const organizationId = url.searchParams.get('organizationId') || req.headers.get('x-organization-id')
    
    // Get pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    
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

    // Check if user has admin/manager role or projects.manage permission for full access
    const userContext = validation.context!
    const hasFullAccess = userContext.membership.role.name === 'admin' || 
                         userContext.membership.role.name === 'manager' ||
                         userContext.membership.role.permissions.some(p => 
                           p.resource === 'projects' && p.action === 'manage'
                         )

    // Only cache page 1 with 10 items for 7 days (most frequently accessed)
    const shouldCache = page === 1 && limit === 10
    const cacheKey = shouldCache ? `projects:page1:${organizationId}:${search}:${status}:${hasFullAccess ? 'all' : userContext.userId}` : null
    
    // Try to get cached result first (only for page 1)
    if (shouldCache && cacheKey) {
      try {
        const cached = await redisGetJSON<any>(cacheKey)
        if (cached) {
          console.log('📋 Returning cached projects page 1 result')
          return NextResponse.json(cached)
        }
      } catch (cacheError) {
        console.log('⚠️ Cache read failed, proceeding with database query:', cacheError)
      }
    }

    const supabase = await createClient()
    console.log('✅ Organization access validated for:', organizationId)

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    let totalCount = 0
    let projects: any[] = []

    if (hasFullAccess) {
      // User with full access can see all projects in organization
      
      // First, get total count for pagination
      let countQuery = supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)

      // Add search filter to count query if search term provided
      if (search) {
        countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%,code.ilike.%${search}%`)
      }

      // Add status filter to count query if status provided
      if (status) {
        countQuery = countQuery.eq('status', status)
      }

      const { count, error: countError } = await countQuery

      if (countError) {
        console.error('Error counting projects:', countError)
        return NextResponse.json({ error: 'Failed to count projects' }, { status: 500 })
      }

      totalCount = count || 0

      // Build main query for project data
      let projectsQuery = supabase
        .from('projects')
        .select(`
          id,
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
          created_at,
          updated_at,
          kanban_enabled,
          timesheet_enabled,
          team_availability_enabled,
          capacity_planning_enabled,
          state,
          organization_id,
          client_id,
          created_by
        `)
        .eq('organization_id', organizationId)

      // Add search filter if search term provided
      if (search) {
        projectsQuery = projectsQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%,code.ilike.%${search}%`)
      }

      // Add status filter if status provided
      if (status) {
        projectsQuery = projectsQuery.eq('status', status)
      }

      // Add pagination and ordering
      const { data: projectsData, error: projectsError } = await projectsQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (projectsError) {
        console.error('Error fetching projects:', projectsError)
        return NextResponse.json({ error: projectsError.message }, { status: 500 })
      }

      projects = projectsData || []

    } else {
      // Regular users can only see projects they are members of
      
      // First get the project IDs where user is a member
      const { data: memberProjectIds, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('organization_member_id', userContext.membership.id)

      if (memberError) {
        console.error('Error fetching member projects:', memberError)
        return NextResponse.json({ error: memberError.message }, { status: 500 })
      }

      if (!memberProjectIds || memberProjectIds.length === 0) {
        totalCount = 0
        projects = []
      } else {
        const projectIds = memberProjectIds.map(p => p.project_id)
        
        // Get count for user's projects with search
        let countQuery = supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .in('id', projectIds)

        if (search) {
          countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%,code.ilike.%${search}%`)
        }

        // Add status filter to count query if status provided
        if (status) {
          countQuery = countQuery.eq('status', status)
        }

        const { count, error: countError } = await countQuery
        totalCount = count || 0

        if (countError) {
          console.error('Error counting member projects:', countError)
          return NextResponse.json({ error: 'Failed to count projects' }, { status: 500 })
        }

        // Get paginated projects data
        let projectsQuery = supabase
          .from('projects')
          .select(`
            id,
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
            created_at,
            updated_at,
            kanban_enabled,
            timesheet_enabled,
            team_availability_enabled,
            capacity_planning_enabled,
            state,
            organization_id,
            client_id,
            created_by
          `)
          .eq('organization_id', organizationId)
          .in('id', projectIds)

        if (search) {
          projectsQuery = projectsQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%,code.ilike.%${search}%`)
        }

        // Add status filter if status provided
        if (status) {
          projectsQuery = projectsQuery.eq('status', status)
        }

        const { data: projectsData, error: projectsError } = await projectsQuery
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (projectsError) {
          console.error('Error fetching member projects:', projectsError)
          return NextResponse.json({ error: projectsError.message }, { status: 500 })
        }

        projects = projectsData || []
      }
    }

    // Return projects without progress calculation
    const projectsWithProgress = projects

    const totalPages = Math.ceil(totalCount / limit)

    const result = {
      projects: projectsWithProgress,
      user_role: hasFullAccess ? 'admin' : 'member',
      total_projects: totalCount,
      access_level: hasFullAccess ? 'all_organization_projects' : 'member_projects_only',
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }

    console.log('✅ Returning successful response:', {
      projectsCount: result.projects.length,
      pagination: result.pagination
    })

    // Cache the result for future requests (only page 1 for 7 days)
    if (shouldCache && cacheKey) {
      try {
        await redisSetJSON(cacheKey, result, PAGE_ONE_CACHE_TTL)
        console.log('💾 Cached projects page 1 result for 7 days')
      } catch (cacheError) {
        console.log('⚠️ Failed to cache result:', cacheError)
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('💥 Unexpected error in projects API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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
  
  // Set default status if not provided
  const projectStatus = status || 'active';
  
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
      status: projectStatus,
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

  // Capacity planning: do not auto-create resource allocations here.
  // Member-level default capacity is initialized via DB trigger on project_members (see supabase migration).

    // Invalidate page 1 cache after creating new project
    try {
      const cacheKeysToInvalidate = [
        `projects:page1:${organizationId}:::all`, // Admin/Manager empty search, no status
        `projects:page1:${organizationId}:::${userContext.userId}`, // Regular user empty search, no status
        // Note: We could implement more sophisticated cache invalidation
        // but for now, we'll clear the main page 1 caches
      ]
      
      for (const key of cacheKeysToInvalidate) {
        try {
          // Determine if this cache key is for full access or regular user
          const hasFullAccess = key.includes(':all')
          
          // Refresh cache with new data
          let projectsQuery = supabase
            .from('projects')
            .select(`
              id,
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
              created_at,
              updated_at,
              kanban_enabled,
              timesheet_enabled,
              team_availability_enabled,
              capacity_planning_enabled,
              state,
              organization_id,
              client_id,
              created_by
            `)
            .eq('organization_id', organizationId)

          if (!hasFullAccess) {
            // For regular users, only show projects they are members of
            const { data: memberProjectIds } = await supabase
              .from('project_members')
              .select('project_id')
              .eq('organization_member_id', userContext.membership.id)

            if (memberProjectIds && memberProjectIds.length > 0) {
              const projectIds = memberProjectIds.map(p => p.project_id)
              projectsQuery = projectsQuery.in('id', projectIds)
            } else {
              // No projects for this user
              continue
            }
          }

          const { data: projects } = await projectsQuery
            .order('created_at', { ascending: false })
            .range(0, 9) // First 10 items for page 1

          // Get total count
          let countQuery = supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)

          if (!hasFullAccess) {
            // For regular users, only count projects they are members of
            const { data: userMemberProjectIds } = await supabase
              .from('project_members')
              .select('project_id')
              .eq('organization_member_id', userContext.membership.id)

            if (userMemberProjectIds && userMemberProjectIds.length > 0) {
              const projectIds = userMemberProjectIds.map((p: any) => p.project_id)
              countQuery = countQuery.in('id', projectIds)
            } else {
              // No projects for this user, skip this cache refresh
              continue
            }
          }

          const { count: totalCount } = await countQuery
          const totalPages = Math.ceil((totalCount || 0) / 10)

          const refreshedResult = {
            projects: projects || [],
            user_role: hasFullAccess ? 'admin' : 'member',
            total_projects: totalCount || 0,
            access_level: hasFullAccess ? 'all_organization_projects' : 'member_projects_only',
            pagination: {
              page: 1,
              limit: 10,
              total: totalCount || 0,
              totalPages,
              hasNext: 1 < totalPages,
              hasPrev: false
            }
          }

          await redisSetJSON(key, refreshedResult, PAGE_ONE_CACHE_TTL)
          console.log('🔄 Refreshed projects page 1 cache after project creation')
        } catch (cacheError) {
          console.warn('Failed to refresh specific cache key:', key, cacheError)
        }
      }
    } catch (e) {
      console.warn('Failed to refresh projects page 1 cache after create:', e)
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
  const { id: projectId, organizationId, team_member_ids, ...updateData } = body;
  
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
    // Validate status if provided
    if (updateData.status) {
      const validStatuses = ['active', 'on_hold', 'completed', 'cancelled'];
      if (!validStatuses.includes(updateData.status)) {
        return NextResponse.json({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        }, { status: 400 });
      }
    }

    // Update project data (excluding team_member_ids which we handle separately)
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

    // Handle team member updates if provided
    if (team_member_ids !== undefined && Array.isArray(team_member_ids)) {
      // Remove existing team members
      const { error: removeError } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId);

      if (removeError) {
        console.error('Error removing existing team members:', removeError);
        // Continue without failing
      }

      // Add new team members if any provided
      if (team_member_ids.length > 0) {
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
            project_id: projectId,
            organization_member_id: member.id,
            added_by: userContext.userId
          }));
          
          const { error: projectMembersError } = await supabase
            .from('project_members')
            .insert(projectMembersData);
            
          if (projectMembersError) {
            console.error('Error adding team members to project:', projectMembersError);
            // Continue without failing - project is updated, just members weren't added
          } else {
            console.log(`Team members updated for project ${updatedProject.name}`);
          }
        }
      }
    }

    // Handle Kanban board creation/deletion based on kanban_enabled changes
    if (updateData.kanban_enabled !== undefined) {
      if (updateData.kanban_enabled && !existingProject.kanban_enabled) {
        // Kanban was enabled, create default board
        console.log('Creating default Kanban board for project:', projectId);
        
        const { data: kanbanBoard, error: kanbanError } = await supabase
          .from('kanban_boards')
          .insert({
            project_id: projectId,
            name: `${updatedProject.name} Board`,
            created_by: userContext.userId
          })
          .select()
          .single();

        if (kanbanError) {
          console.error('Error creating Kanban board:', kanbanError);
        } else {
          // Create default columns
          const defaultColumns = [
            { name: 'To Do', position: 0, color: '#e2e8f0' },
            { name: 'In Progress', position: 1, color: '#fbbf24' },
            { name: 'Review', position: 2, color: '#f59e0b' },
            { name: 'Done', position: 3, color: '#10b981' }
          ];

          const columnsData = defaultColumns.map(col => ({
            board_id: kanbanBoard.id,
            name: col.name,
            position: col.position,
            color: col.color
          }));

          const { error: columnsError } = await supabase
            .from('kanban_columns')
            .insert(columnsData);

          if (columnsError) {
            console.error('Error creating default Kanban columns:', columnsError);
          }
        }
      } else if (!updateData.kanban_enabled && existingProject.kanban_enabled) {
        // Kanban was disabled, optionally clean up boards
        console.log('Kanban disabled for project:', projectId);
        // Note: We might want to soft-delete or archive boards instead of hard delete
      }
    }

    // Invalidate page 1 cache after updating project
    try {
      const cacheKeysToInvalidate = [
        `projects:page1:${organizationId}:::all`, // Admin/Manager empty search, no status
        // Note: For projects, we'll only refresh the admin cache for simplicity
        // Individual user caches can be added if needed
      ]
      
      for (const key of cacheKeysToInvalidate) {
        try {
          // Refresh cache with new data for admins/managers only
          const { data: projects } = await supabase
            .from('projects')
            .select(`
              id,
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
              created_at,
              updated_at,
              kanban_enabled,
              timesheet_enabled,
              team_availability_enabled,
              capacity_planning_enabled,
              state,
              organization_id,
              client_id,
              created_by
            `)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .range(0, 9) // First 10 items for page 1

          // Get total count
          const { count: totalCount } = await supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)

          const totalPages = Math.ceil((totalCount || 0) / 10)

          const refreshedResult = {
            projects: projects || [],
            user_role: 'admin',
            total_projects: totalCount || 0,
            access_level: 'all_organization_projects',
            pagination: {
              page: 1,
              limit: 10,
              total: totalCount || 0,
              totalPages,
              hasNext: 1 < totalPages,
              hasPrev: false
            }
          }

          await redisSetJSON(key, refreshedResult, PAGE_ONE_CACHE_TTL)
          console.log('🔄 Refreshed projects page 1 cache after project update')
        } catch (cacheError) {
          console.warn('Failed to refresh specific cache key:', key, cacheError)
        }
      }
    } catch (e) {
      console.warn('Failed to refresh projects page 1 cache after update:', e)
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
