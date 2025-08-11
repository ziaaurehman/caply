import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

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

    // First verify the project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organization_id')
      .eq('id', projectId)
      .eq('organization_id', organizationId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user has access to this project (either admin/manager or project member)
    const hasFullAccess = userContext.membership.role.name === 'admin' ||
                         userContext.membership.role.name === 'manager' ||
                         userContext.membership.role.permissions.some(p => 
                           p.resource === 'projects' && p.action === 'manage'
                         )

    if (!hasFullAccess) {
      // Check if user is a member of this project
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

    // Fetch project members
    const { data: members, error } = await supabase
      .from('project_members')
      .select(`
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
      `)
      .eq('project_id', projectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      members: members || []
    });

  } catch (error) {
    console.error('Error fetching project members:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

