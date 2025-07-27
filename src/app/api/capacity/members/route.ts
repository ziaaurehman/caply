import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectMemberId = searchParams.get('project_member_id');
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
    let query = supabase
      .from('member_capacity')
      .select(`
        *,
        project_members (
          id,
          role,
          project_id,
          projects (
            id,
            name,
            organization_id
          ),
          organization_members (
            id,
            role_id,
            users!organization_members_user_id_fkey (
              id,
              full_name,
              email,
              avatar_url
            )
          )
        )
      `)
      .eq('project_members.projects.organization_id', organizationId);

    // Filter by project member if specified
    if (projectMemberId) {
      query = query.eq('project_member_id', projectMemberId);
    }

    // Filter by project if specified
    if (projectId) {
      query = query.eq('project_members.project_id', projectId);
    }

    const { data: memberCapacities, error } = await query.order('week_start_date', { ascending: true });

    if (error) {
      console.error('Error fetching member capacities:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      member_capacities: memberCapacities || [],
      total: memberCapacities?.length || 0
    });

  } catch (error) {
    console.error('Error in capacity members GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { organizationId, ...capacityData } = body;

  if (!organizationId) {
    return NextResponse.json({ 
      error: 'Organization ID is required' 
    }, { status: 400 })
  }

  // Validate organization access and permissions
  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'capacity', action: 'create' }
  )

  if (!validation.success) {
    return NextResponse.json({ 
      error: validation.error 
    }, { status: validation.status })
  }

  const supabase = await createClient()
  const userContext = validation.context!

  const {
    project_member_id,
    week_start_date,
    available_hours,
    allocated_hours,
    notes
  } = capacityData;

  // Validate required fields
  if (!project_member_id || !week_start_date || available_hours === undefined) {
    return NextResponse.json({ 
      error: 'Project member ID, week start date, and available hours are required' 
    }, { status: 400 });
  }

  try {
    // Verify project member exists and belongs to the organization
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select(`
        id,
        project_id,
        organization_member_id,
        projects!inner (
          organization_id,
          capacity_planning_enabled
        ),
        organization_members!inner (
          organization_id
        )
      `)
      .eq('id', project_member_id)
      .single();

    if (memberError || !projectMember) {
      return NextResponse.json({ error: 'Project member not found' }, { status: 404 });
    }

    // Verify the project belongs to the organization
    if ((projectMember.projects as any).organization_id !== organizationId) {
      return NextResponse.json({ error: 'Invalid project member for this organization' }, { status: 403 });
    }

    // Verify capacity planning is enabled for the project
    if (!(projectMember.projects as any).capacity_planning_enabled) {
      return NextResponse.json({ 
        error: 'Capacity planning is not enabled for this project' 
      }, { status: 403 });
    }

    // Create the member capacity entry
    const { data: memberCapacity, error: createError } = await supabase
      .from('member_capacity')
      .insert([{
        project_member_id,
        week_start_date,
        available_hours,
        allocated_hours: allocated_hours || 0,
        notes: notes || null,
        created_by: userContext.userId
      }])
      .select(`
        *,
        project_members (
          id,
          role,
          project_id,
          projects (
            id,
            name,
            organization_id
          ),
          organization_members (
            id,
            users!organization_members_user_id_fkey (
              id,
              full_name,
              email,
              avatar_url
            )
          )
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating member capacity:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      member_capacity: memberCapacity 
    });

  } catch (error) {
    console.error('Error in capacity members POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
