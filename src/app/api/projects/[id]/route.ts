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

    // Check if user has admin/manager role or projects.manage permission for full access
    const hasFullAccess = userContext.membership.role.name === 'admin' || 
                         userContext.membership.role.name === 'manager' ||
                         userContext.membership.role.permissions.some(p => 
                           p.resource === 'projects' && p.action === 'manage'
                         )

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

    return NextResponse.json({ 
      project,
      user_access: hasFullAccess ? 'full' : 'member'
    });

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
