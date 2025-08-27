import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON, redisDel } from '@/utils/redis';

// Cache TTL: 15 days
const CACHE_TTL = 1296000;

export async function GET(req: NextRequest) {
  console.log('Fetching capacity planning projects for user');
  
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

  const supabase = await createClient()
  const userContext = validation.context!

  // Build cache key based on user context
  const cacheKey = `capacity:projects:${organizationId}:${userContext.userId}`;

  try {
    // Try to get from cache first
    const cachedData = await redisGetJSON(cacheKey);
    if (cachedData) {
      console.log('Cache hit for capacity projects:', cacheKey);
      return NextResponse.json(cachedData);
    }
  } catch (cacheError) {
    console.warn('Cache read failed, continuing without cache:', cacheError);
  }

  // Check if user has admin/manager role or capacity.manage permission for full access
  const hasFullAccess = userContext.membership.role.name === 'admin' || 
                       userContext.membership.role.name === 'manager' ||
                       userContext.membership.role.permissions.some(p => 
                         p.resource === 'capacity' && p.action === 'manage'
                       )

  let data, error;

  if (hasFullAccess) {
    // User with full access can see all projects with capacity planning enabled in organization
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
      .eq('capacity_planning_enabled', true)
      .order('created_at', { ascending: false });
    
    data = response.data;
    error = response.error;
  } else {
    // Regular users can only see capacity projects they are members of
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
          id,
          name,
          code,
          status,
          capacity_planning_enabled,
          project_members (
            id,
            organization_member_id,
            role,
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
        .eq('capacity_planning_enabled', true)
        .in('id', projectIds)
        .order('created_at', { ascending: false });
      
      data = response.data;
      error = response.error;
    }
  }
  
  if (error) {
    console.error('Error fetching capacity projects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = { 
    projects: data || [],
    user_access: hasFullAccess ? 'full' : 'member',
    total_projects: data?.length || 0,
    access_level: hasFullAccess ? 'all_organization_projects' : 'member_projects_only'
  };

  // Cache the response
  try {
    await redisSetJSON(cacheKey, response, CACHE_TTL);
    console.log('Cached capacity projects:', cacheKey);
  } catch (cacheError) {
    console.warn('Cache write failed:', cacheError);
  }

  return NextResponse.json(response);
}
