import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON } from '@/utils/redis';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
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

    // Check if user has admin/manager role or projects.manage permission for full access
    const hasFullAccess = userContext.membership.role.name === 'admin' || 
                         userContext.membership.role.name === 'manager' ||
                         userContext.membership.role.permissions.some(p => 
                           p.resource === 'projects' && p.action === 'manage'
                         )

    // Try cache first (15 days TTL)
    const cacheKey = `project:${projectId}:${organizationId}:${hasFullAccess ? 'all' : userContext.userId}`
    const cached = await redisGetJSON<any>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Fetch the specific project
    let query = supabase
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
      .eq('id', projectId)
      .eq('organization_id', organizationId);

    // If user doesn't have full access, check if they're a member of this project
    if (!hasFullAccess) {
      const { data: memberCheck } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('organization_member_id', userContext.membership.id)
        .single();

      if (!memberCheck) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
      }
    }

    const { data: project, error } = await query.single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const result = {
      project,
      user_access: hasFullAccess ? 'full' : 'member'
    };

    // Cache the result (15 days)
    try {
      await redisSetJSON(cacheKey, result, 1296000)
    } catch (e) {
      console.warn('Failed to cache project:', e)
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const { organizationId, ...updateData } = body;

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
      .select('id, organization_id')
      .eq('id', projectId)
      .eq('organization_id', organizationId)
      .single();
      
    if (projectError || !existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

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

    // Refresh project cache and projects list cache (15 days)
    try {
      // Refresh individual project cache for all users who might have access
      const { data: allMembers } = await supabase
        .from('organization_members')
        .select('id, user_id, role_id, roles!role_id(name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (allMembers) {
        for (const member of allMembers) {
          const hasFullAccess = member.roles?.[0]?.name === 'admin' || 
                               member.roles?.[0]?.name === 'manager';
          
          // Refresh individual project cache
          const projectCacheKey = `project:${projectId}:${organizationId}:${hasFullAccess ? 'all' : member.user_id}`;
          
          // Check if user has access to this specific project
          let hasProjectAccess = hasFullAccess;
          if (!hasFullAccess) {
            const { data: memberCheck } = await supabase
              .from('project_members')
              .select('id')
              .eq('project_id', projectId)
              .eq('organization_member_id', member.id)
              .single();
            hasProjectAccess = !!memberCheck;
          }

          if (hasProjectAccess) {
            // Fetch fresh project data
            const { data: freshProject } = await supabase
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
              .eq('id', projectId)
              .eq('organization_id', organizationId)
              .single();

            if (freshProject) {
              await redisSetJSON(projectCacheKey, {
                project: freshProject,
                user_access: hasFullAccess ? 'full' : 'member'
              }, 1296000);
            }
          }

          // Refresh projects list cache
          const projectsListCacheKey = `organization:projects:${organizationId}:${hasFullAccess ? 'all' : member.user_id}`;
          
          // Fetch fresh projects list data
          let freshProjectsData;
          if (hasFullAccess) {
            const { data: projects } = await supabase
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
            
            freshProjectsData = {
              projects: projects || [],
              user_role: 'admin',
              total_projects: projects?.length || 0,
              access_level: 'all_organization_projects'
            };
          } else {
            // Get user's project memberships
            const { data: memberProjectIds } = await supabase
              .from('project_members')
              .select('project_id')
              .eq('organization_member_id', member.id);

            if (memberProjectIds && memberProjectIds.length > 0) {
              const projectIds = memberProjectIds.map(p => p.project_id);
              const { data: projects } = await supabase
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
              
              freshProjectsData = {
                projects: projects || [],
                user_role: 'member',
                total_projects: projects?.length || 0,
                access_level: 'member_projects_only'
              };
            } else {
              freshProjectsData = {
                projects: [],
                user_role: 'member',
                total_projects: 0,
                access_level: 'member_projects_only'
              };
            }
          }
          
          await redisSetJSON(projectsListCacheKey, freshProjectsData, 1296000);
        }
      }
    } catch (e) {
      console.warn('Failed to refresh project cache after update:', e);
    }
    
    return NextResponse.json({ 
      success: true,
      project: updatedProject
    });

  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
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
      { resource: 'projects', action: 'delete' }
    )

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status })
    }

    const supabase = await createClient()

    // Check if project exists and belongs to the organization
    const { data: existingProject, error: projectError } = await supabase
      .from('projects')
      .select('id, organization_id')
      .eq('id', projectId)
      .eq('organization_id', organizationId)
      .single();
      
    if (projectError || !existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete project (cascading deletes should handle related records)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
      
    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Refresh projects list cache after deletion (15 days)
    try {
      const { data: allMembers } = await supabase
        .from('organization_members')
        .select('id, user_id, role_id, roles!role_id(name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (allMembers) {
        for (const member of allMembers) {
          const hasFullAccess = member.roles?.[0]?.name === 'admin' || 
                               member.roles?.[0]?.name === 'manager';
          
          // Refresh projects list cache
          const projectsListCacheKey = `organization:projects:${organizationId}:${hasFullAccess ? 'all' : member.user_id}`;
          
          // Fetch fresh projects list data
          let freshProjectsData;
          if (hasFullAccess) {
            const { data: projects } = await supabase
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
            
            freshProjectsData = {
              projects: projects || [],
              user_role: 'admin',
              total_projects: projects?.length || 0,
              access_level: 'all_organization_projects'
            };
          } else {
            // Get user's project memberships
            const { data: memberProjectIds } = await supabase
              .from('project_members')
              .select('project_id')
              .eq('organization_member_id', member.id);

            if (memberProjectIds && memberProjectIds.length > 0) {
              const projectIds = memberProjectIds.map(p => p.project_id);
              const { data: projects } = await supabase
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
              
              freshProjectsData = {
                projects: projects || [],
                user_role: 'member',
                total_projects: projects?.length || 0,
                access_level: 'member_projects_only'
              };
            } else {
              freshProjectsData = {
                projects: [],
                user_role: 'member',
                total_projects: 0,
                access_level: 'member_projects_only'
              };
            }
          }
          
          await redisSetJSON(projectsListCacheKey, freshProjectsData, 1296000);
        }
      }
    } catch (e) {
      console.warn('Failed to refresh projects cache after delete:', e);
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
