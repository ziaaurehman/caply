import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const projectId = params.id;

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
      .eq('organization_id', userOrgMembership.organization_id)
      .single();

    // If not owner, check if user is a member of this project
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('organization_member_id', userOrgMembership.id)
        .eq('project_id', projectId)
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
      }
    }

    const { data: project, error } = await query;

    if (error) {
      console.error('Error fetching project:', error);
      return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error in GET /api/projects/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const projectId = params.id;
    const updateData = await req.json();

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

    // Check if project exists and user has access
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('id, organization_id')
      .eq('id', projectId)
      .eq('organization_id', userOrgMembership.organization_id)
      .single();

    if (fetchError || !existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If not owner, check if user is a member of this project
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('project_members')
        .select('project_id, role')
        .eq('organization_member_id', userOrgMembership.id)
        .eq('project_id', projectId)
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Update the project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating project:', updateError);
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error('Error in PUT /api/projects/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const projectId = params.id;

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

    // Only owners can delete projects
    if (!isOwner) {
      return NextResponse.json({ error: 'Only organization owners can delete projects' }, { status: 403 });
    }

    // Check if project exists
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', userOrgMembership.organization_id)
      .single();

    if (fetchError || !existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete the project (this will cascade to related tables)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
