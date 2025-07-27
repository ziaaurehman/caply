import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const projectId = searchParams.get('project_id');
  const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json({ 
      error: 'Organization ID is required' 
    }, { status: 400 })
  }

  // Validate organization access and permissions
  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'capacity', action: 'read' }
  )

  if (!validation.success) {
    return NextResponse.json({ 
      error: validation.error 
    }, { status: validation.status })
  }

  const supabase = await createClient()
  const userContext = validation.context!

  try {
    // Get all project members with their capacity info for the organization
    // Only include projects with capacity planning enabled
    const { data: projectMembers, error: membersError } = await supabase
      .from('project_members')
      .select(`
        id,
        role,
        project_id,
        organization_member_id,
        projects!inner (
          id,
          name,
          organization_id,
          capacity_planning_enabled
        ),
        organization_members!inner (
          id,
          role_id,
          status,
          user_id
        ),
        member_capacity (
          weekly_capacity_hours,
          work_days_per_week,
          is_active
        )
      `)
      .eq('projects.organization_id', organizationId)
      .eq('projects.capacity_planning_enabled', true)
      .eq('organization_members.status', 'active');

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Get user details separately to avoid relationship conflicts
    const userIds = projectMembers?.map(pm => pm.organization_members?.[0]?.user_id).filter(Boolean) || [];
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds);

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Create a map of users for quick lookup
    const usersMap = new Map(users?.map(user => [user.id, user]) || []);

    // Get resource allocations for the specified date range
    let allocationsQuery = supabase
      .from('resource_allocations')
      .select(`
        *,
        projects (
          id,
          name,
          code,
          status
        )
      `)
      .gte('start_date', startDate || '1900-01-01')
      .lte('end_date', endDate || '2100-12-31')
      .eq('is_active', true);

    if (projectId) {
      allocationsQuery = allocationsQuery.eq('project_id', projectId);
    }

    const { data: allocations, error: allocationsError } = await allocationsQuery;

    if (allocationsError) {
      return NextResponse.json({ error: allocationsError.message }, { status: 500 });
    }

    // Calculate capacity overview for each project member
    const capacityOverview = projectMembers?.map(projectMember => {
      const memberAllocations = allocations?.filter(a => a.project_member_id === projectMember.id) || [];
      const totalAllocatedHours = memberAllocations.reduce((sum, allocation) => sum + (allocation.allocated_hours_per_week || 0), 0);
      const capacity = projectMember.member_capacity?.[0]?.weekly_capacity_hours || 40;
      const utilizationPercent = capacity > 0 ? (totalAllocatedHours / capacity) * 100 : 0;

      // Get user info from the users map
      const userId = projectMember.organization_members?.[0]?.user_id;
      const user = userId ? usersMap.get(userId) : null;

      return {
        member: {
          id: projectMember.id,
          user: user || null,
          role: projectMember.role,
          project: projectMember.projects
        },
        allocations: memberAllocations,
        capacity,
        totalAllocatedHours,
        availableHours: Math.max(0, capacity - totalAllocatedHours),
        utilizationPercent,
        status: utilizationPercent > 100 ? 'overallocated' : 
                utilizationPercent >= 80 ? 'nearOptimal' : 
                utilizationPercent >= 60 ? 'optimal' : 'underutilized'
      };
    }) || [];

    return NextResponse.json({ 
      capacityOverview,
      summary: {
        totalMembers: projectMembers?.length || 0,
        overallocatedMembers: capacityOverview.filter(m => m.status === 'overallocated').length,
        optimalMembers: capacityOverview.filter(m => m.status === 'optimal' || m.status === 'nearOptimal').length,
        underutilizedMembers: capacityOverview.filter(m => m.status === 'underutilized').length,
        totalCapacity: capacityOverview.reduce((sum, m) => sum + m.capacity, 0),
        totalAllocated: capacityOverview.reduce((sum, m) => sum + m.totalAllocatedHours, 0),
        totalAvailable: capacityOverview.reduce((sum, m) => sum + m.availableHours, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching capacity overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
