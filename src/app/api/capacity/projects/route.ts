import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON, redisDel } from '@/utils/redis';

// Cache TTL: 7 days for capacity projects (longer since they don't change often)
const CACHE_TTL = 604800; // 7 days

// Optimized: Simplified queries and better caching
export async function GET(req: NextRequest) {
  console.log('🔍 GET /api/capacity/projects - Starting request');
  
  try {
    const { searchParams } = new URL(req.url);
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

    const supabase = await createClient();
    const userContext = validation.context!;

    // Check if user has admin/manager role or capacity.manage permission for full access
    const hasFullAccess = userContext.membership.role.name === 'admin' || 
                         userContext.membership.role.name === 'manager' ||
                         userContext.membership.role.permissions.some(p => 
                           p.resource === 'capacity' && p.action === 'manage'
                         );

    // Simple cache key - different for full vs member access
    const cacheKey = `projects:capacity:${organizationId}:${hasFullAccess ? 'all' : 'member:' + userContext.userId}`;

    // Try to get from cache first
    try {
      const cachedData = await redisGetJSON(cacheKey);
      if (cachedData) {
        console.log('📋 Returning cached capacity projects result');
        return NextResponse.json(cachedData);
      }
    } catch (cacheError) {
      console.log('⚠️ Cache read failed, proceeding with database query:', cacheError);
    }

    let projectIds: string[] = [];

    if (hasFullAccess) {
      // Admin gets all capacity-enabled projects - just get IDs first
      const { data: allProjects, error: allProjectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('capacity_planning_enabled', true);

      if (allProjectsError) {
        console.error('Error fetching all projects:', allProjectsError);
        return NextResponse.json({ error: allProjectsError.message }, { status: 500 });
      }

      projectIds = allProjects?.map(p => p.id) || [];
    } else {
      // Regular users can only see capacity projects they are members of
      const { data: memberProjectIds, error: memberError } = await supabase
        .from('project_members')
        .select(`
          project_id,
          projects!inner (
            capacity_planning_enabled
          )
        `)
        .eq('organization_member_id', userContext.membership.id)
        .eq('projects.capacity_planning_enabled', true);

      if (memberError) {
        console.error('Error fetching member projects:', memberError);
        return NextResponse.json({ error: memberError.message }, { status: 500 });
      }

      projectIds = memberProjectIds?.map(p => p.project_id) || [];
    }

    if (projectIds.length === 0) {
      const emptyResponse = { 
        projects: [],
        user_access: hasFullAccess ? 'full' : 'member',
        total_projects: 0,
        access_level: hasFullAccess ? 'all_organization_projects' : 'member_projects_only'
      };

      try {
        await redisSetJSON(cacheKey, emptyResponse, CACHE_TTL);
        console.log('💾 Cached empty projects result');
      } catch (cacheError) {
        console.log('⚠️ Failed to cache result:', cacheError);
      }

      return NextResponse.json(emptyResponse);
    }

    // Get project details (simpler query)
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        code,
        status,
        capacity_planning_enabled,
        created_at
      `)
      .in('id', projectIds)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Error fetching project details:', projectsError);
      return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    // Optionally get member count for each project (separate query for better performance)
    const { data: memberCounts, error: memberCountsError } = await supabase
      .from('project_members')
      .select('project_id')
      .in('project_id', projectIds);

    if (memberCountsError) {
      console.error('Error fetching member counts:', memberCountsError);
      // Continue without member counts - not critical
    }

    // Count members per project
    const memberCountMap = new Map();
    memberCounts?.forEach(member => {
      const count = memberCountMap.get(member.project_id) || 0;
      memberCountMap.set(member.project_id, count + 1);
    });

    // Enrich projects with member count
    const enrichedProjects = projects?.map(project => ({
      ...project,
      member_count: memberCountMap.get(project.id) || 0,
      // Remove the heavy project_members join - frontend can fetch details separately if needed
    })) || [];

    const response = { 
      projects: enrichedProjects,
      user_access: hasFullAccess ? 'full' : 'member',
      total_projects: enrichedProjects.length,
      access_level: hasFullAccess ? 'all_organization_projects' : 'member_projects_only'
    };

    // Cache the response
    try {
      await redisSetJSON(cacheKey, response, CACHE_TTL);
      console.log('💾 Cached capacity projects result for 7 days');
    } catch (cacheError) {
      console.log('⚠️ Failed to cache result:', cacheError);
    }

    console.log('✅ Returning successful response:', {
      projectsCount: response.projects.length,
      hasFullAccess,
      userId: userContext.userId
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('💥 Unexpected error in capacity projects API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
