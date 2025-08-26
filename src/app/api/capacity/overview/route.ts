import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON, redisDel } from '@/utils/redis';

// Cache TTL: 15 days
const CACHE_TTL = 1296000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const projectId = searchParams.get('project_id');
  const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');
  const filterProjectIds = searchParams.getAll('filter_project_id');
  const filterUserIds = searchParams.getAll('filter_user_id');
  const showOnlyOverallocated = searchParams.get('only_overallocated') === 'true';
  const showOnlyActive = searchParams.get('only_active') !== 'false';

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

  // Build cache key
  const cacheKey = `capacity:overview:${organizationId}:${startDate || 'all'}:${endDate || 'all'}:${projectId || 'all'}:${filterProjectIds.join(',') || 'all'}:${filterUserIds.join(',') || 'all'}:${showOnlyOverallocated}:${showOnlyActive}`;

  try {
    // Try to get from cache first
    const cachedData = await redisGetJSON(cacheKey);
    if (cachedData) {
      console.log('Cache hit for capacity overview:', cacheKey);
      return NextResponse.json(cachedData);
    }

    const supabase = await createClient()
    const userContext = validation.context!

    // Fetch all org members that are resources
    let resourcesQuery = supabase
      .from('resource_allocations')
      .select(`
        id,
        organization_id,
        organization_member_id,
        weekly_capacity_hours,
        is_active,
        organization_members!organization_member_id (
          id,
          status,
          user_id,
          department,
          users!user_id ( id, full_name, email, avatar_url, position )
        )
      `)
      .eq('organization_id', organizationId);

    if (showOnlyActive) resourcesQuery = resourcesQuery.eq('is_active', true);

    const { data: resources, error: resErr } = await resourcesQuery;
    if (resErr) return NextResponse.json({ error: resErr.message }, { status: 500 });

    // Optional filter by specific users
    let filteredResources = resources || [];
    if (filterUserIds.length > 0) {
      filteredResources = filteredResources.filter(r => {
        const uid = (r as any)?.organization_members?.[0]?.users?.id || (r as any)?.organization_members?.users?.id;
        return uid ? filterUserIds.includes(uid) : false;
      });
    }

    // Fetch assignments (project_assignments) intersecting the range
    let assignmentsQuery = supabase
      .from('project_assignments')
      .select(`
        *,
        projects ( id, name, code, status, capacity_planning_enabled ),
        resource_allocations ( id, organization_member_id )
      `)
      .gte('start_date', startDate || '1900-01-01')
      .lte('end_date', endDate || '2100-12-31')
      .eq('is_active', true);

    if (projectId) assignmentsQuery = assignmentsQuery.eq('project_id', projectId);
    if (filterProjectIds.length > 0) assignmentsQuery = assignmentsQuery.in('project_id', filterProjectIds);

    const { data: assignments, error: assErr } = await assignmentsQuery;
    if (assErr) return NextResponse.json({ error: assErr.message }, { status: 500 });

    // Build overview rows
    const capacityOverview = (filteredResources || []).map((res) => {
      const orgMember = (res as any).organization_members?.[0] || (res as any).organization_members;
      const user = orgMember?.users || null;
      const memberAssignments = (assignments || []).filter(a => (a as any).resource_allocations?.organization_member_id === (res as any).organization_member_id);
      
      // Debug logging
      console.log('Resource:', (res as any).organization_member_id, 'User:', user?.full_name);
      console.log('All assignments:', assignments?.length);
      console.log('Member assignments:', memberAssignments?.length);
      console.log('Assignment details:', memberAssignments?.map(a => ({ 
        hours: a.hours_per_week, 
        project: (a as any).projects?.name,
        resource_id: (a as any).resource_allocations?.organization_member_id 
      })));
      
      const totalAllocatedHours = memberAssignments.reduce((sum, a) => sum + Number(a.hours_per_week || 0), 0);
      const capacity = Number((res as any).weekly_capacity_hours || 40);
      const utilizationPercent = capacity > 0 ? (totalAllocatedHours / capacity) * 100 : 0;

      return {
        member: {
          id: orgMember?.user_id || user?.id,
          user,
          role: orgMember?.department || user?.position || '',
          project: null,
          organization_member_id: orgMember?.id
        },
        allocations: memberAssignments,
        capacity,
        totalAllocatedHours,
        availableHours: Math.max(0, capacity - totalAllocatedHours),
        utilizationPercent,
        status: utilizationPercent > 100 ? 'overallocated' : utilizationPercent >= 80 ? 'nearOptimal' : utilizationPercent >= 60 ? 'optimal' : 'underutilized'
      };
    });

    const filteredOverview = showOnlyOverallocated
      ? capacityOverview.filter(m => m.utilizationPercent > 100)
      : capacityOverview;

    const response = {
      capacityOverview: filteredOverview,
      summary: {
        totalMembers: filteredOverview?.length || 0,
        overallocatedMembers: filteredOverview.filter(m => m.status === 'overallocated').length,
        optimalMembers: filteredOverview.filter(m => m.status === 'optimal' || m.status === 'nearOptimal').length,
        underutilizedMembers: filteredOverview.filter(m => m.status === 'underutilized').length,
        totalCapacity: filteredOverview.reduce((sum, m) => sum + m.capacity, 0),
        totalAllocated: filteredOverview.reduce((sum, m) => sum + m.totalAllocatedHours, 0),
        totalAvailable: filteredOverview.reduce((sum, m) => sum + m.availableHours, 0)
      }
    };

    // Cache the response
    await redisSetJSON(cacheKey, response, CACHE_TTL);
    console.log('Cached capacity overview:', cacheKey);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching capacity overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
