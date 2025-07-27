import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
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
      .from('resource_allocations')
      .select(`
        *,
        projects (
          id,
          name,
          code,
          status,
          capacity_planning_enabled
        ),
        project_members (
          id,
          organization_member_id,
          role,
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
      .eq('organization_id', organizationId)
      .order('start_date', { ascending: true });

    // Apply filters if provided
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (startDate) {
      query = query.gte('start_date', startDate);
    }

    if (endDate) {
      query = query.lte('end_date', endDate);
    }

    const { data: allocations, error } = await query;

    if (error) {
      console.error('Error fetching allocations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      allocations: allocations || [],
      total: allocations?.length || 0
    });

  } catch (error) {
    console.error('Error in capacity allocations GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { organizationId, ...allocationData } = body;

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
    project_id,
    project_member_id,
    allocated_hours_per_week,
    start_date,
    end_date,
    notes
  } = allocationData;

  // Validate required fields
  if (!project_id || !project_member_id || !allocated_hours_per_week || !start_date) {
    return NextResponse.json({ 
      error: 'Project ID, project member ID, allocated hours per week, and start date are required' 
    }, { status: 400 });
  }

  try {
    // Verify project exists and belongs to the organization
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organization_id, capacity_planning_enabled')
      .eq('id', project_id)
      .eq('organization_id', organizationId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.capacity_planning_enabled) {
      return NextResponse.json({ 
        error: 'Capacity planning is not enabled for this project' 
      }, { status: 403 });
    }

    // Verify project member exists and belongs to the project
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select(`
        id,
        organization_member_id,
        organization_members!inner (
          organization_id
        )
      `)
      .eq('id', project_member_id)
      .eq('project_id', project_id)
      .single();

    if (memberError || !projectMember) {
      return NextResponse.json({ error: 'Project member not found' }, { status: 404 });
    }

    // Verify the organization member belongs to the same organization
    if ((projectMember.organization_members as any).organization_id !== organizationId) {
      return NextResponse.json({ error: 'Invalid project member for this organization' }, { status: 403 });
    }

    // Create the allocation
    const { data: allocation, error: createError } = await supabase
      .from('resource_allocations')
      .insert([{
        project_id,
        project_member_id,
        organization_id: organizationId,
        allocated_hours_per_week,
        start_date,
        end_date: end_date || null,
        notes: notes || null,
        created_by: userContext.userId
      }])
      .select(`
        *,
        projects (
          id,
          name,
          code
        ),
        project_members (
          id,
          organization_member_id,
          role,
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
      console.error('Error creating allocation:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      allocation 
    });

  } catch (error) {
    console.error('Error in capacity allocations POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
