import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

// Refactored: use new tables resource_allocations + project_assignments
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const filterProjectIds = searchParams.getAll('filter_project_id');
  const filterMemberIds = searchParams.getAll('filter_project_member_id');
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
    // Fetch project assignments scoped to org via join through resource_allocations
    let query = supabase
      .from('project_assignments')
      .select(`
        *,
        projects (
          id,
          name,
          code,
          status
        ),
        resource_allocations (
          id,
          organization_member_id,
          organization_members:organization_member_id (
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
      .eq('resource_allocations.organization_id', organizationId)
      .order('start_date', { ascending: true });

    if (projectId) query = query.eq('project_id', projectId);
    if (filterProjectIds.length > 0) query = query.in('project_id', filterProjectIds);

    // Date range: include any assignment that overlaps with [startDate, endDate]
    // Overlap condition: start_date <= endDate AND (end_date IS NULL OR end_date >= startDate)
    if (startDate && endDate) {
      query = query.lte('start_date', endDate)
                   .or(`end_date.is.null,end_date.gte.${startDate}`);
    } else if (endDate) {
      query = query.lte('start_date', endDate);
    } else if (startDate) {
      query = query.or(`end_date.is.null,end_date.gte.${startDate}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching project assignments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ allocations: data || [], total: data?.length || 0 });
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

  const { project_id, organization_member_id, hours_per_week, start_date, end_date, notes } = allocationData;

  // Validate required fields
  if (!project_id || !organization_member_id || !hours_per_week || !start_date) {
    return NextResponse.json({ 
      error: 'Project ID, organization member ID, hours per week, and start date are required' 
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

    // Get or create resource row for this org member
    const { data: resource, error: resErr } = await supabase
      .from('resource_allocations')
      .upsert({
        organization_id: organizationId,
        organization_member_id,
      }, { onConflict: 'organization_id,organization_member_id' })
      .select('id')
      .single();
    if (resErr || !resource) {
      console.error('Failed to upsert resource for assignment:', resErr);
      return NextResponse.json({ error: 'Failed to prepare resource' }, { status: 500 });
    }

    // Create project assignment
    const { data: assignment, error: createError } = await supabase
      .from('project_assignments')
      .insert([{
        resource_allocation_id: resource.id,
        project_id,
        hours_per_week,
        start_date,
        end_date: end_date || null,
        notes: notes || null,
      }])
      .select(`
        *,
        projects (
          id, name, code, status
        ),
        resource_allocations (
          id,
          organization_member_id,
          organization_members:organization_member_id (
            id,
            user_id,
            users!user_id(id, full_name, email, avatar_url)
          )
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating project assignment:', createError, { payload: allocationData, organizationId });
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, allocation: assignment });

  } catch (error) {
    console.error('Error in capacity allocations POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
