import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  // Get user's organization membership
  const { data: userOrg, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id, id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (orgError || !userOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

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
      .eq('organization_id', userOrg.organization_id)
      .eq('is_active', true);

    // Filter by project if specified
    if (projectId) {
      // Verify project exists and user has access
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, organization_id, capacity_planning_enabled')
        .eq('id', projectId)
        .eq('organization_id', userOrg.organization_id)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      if (!project.capacity_planning_enabled) {
        return NextResponse.json({ error: 'Capacity planning is not enabled for this project' }, { status: 403 });
      }

      query = query.eq('project_id', projectId);
    }

    // Filter by date range if specified
    if (startDate) {
      query = query.gte('start_date', startDate);
    }
    if (endDate) {
      query = query.lte('end_date', endDate);
    }

    const { data: allocations, error } = await query.order('start_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ allocations: allocations || [] });
  } catch (error) {
    console.error('Error fetching resource allocations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    const body = await req.json();
    const {
      project_id,
      project_member_id,
      allocated_hours_per_week,
      start_date,
      end_date,
      role,
      notes
    } = body;

    // Validate required fields
    if (!project_id || !project_member_id || !allocated_hours_per_week || !start_date) {
      return NextResponse.json({ 
        error: 'Missing required fields: project_id, project_member_id, allocated_hours_per_week, start_date' 
      }, { status: 400 });
    }

    // Get user's organization membership
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Verify project exists and belongs to user's organization
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organization_id, capacity_planning_enabled')
      .eq('id', project_id)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.capacity_planning_enabled) {
      return NextResponse.json({ error: 'Capacity planning is not enabled for this project' }, { status: 403 });
    }

    // Verify project member exists and belongs to user's organization  
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select(`
        id,
        project_id,
        organization_members (
          organization_id
        )
      `)
      .eq('id', project_member_id)
      .single();

    if (memberError || !projectMember) {
      return NextResponse.json({ error: 'Project member not found' }, { status: 404 });
    }

    // Verify the project member belongs to the same organization
    if ((projectMember.organization_members as any)?.organization_id !== userOrg.organization_id) {
      return NextResponse.json({ error: 'Project member not found in your organization' }, { status: 404 });
    }

    // Check for overlapping allocations
    const { data: existingAllocations, error: overlapError } = await supabase
      .from('resource_allocations')
      .select('id, start_date, end_date, allocated_hours_per_week')
      .eq('project_id', project_id)
      .eq('project_member_id', project_member_id)
      .eq('is_active', true)
      .or(`and(start_date.lte.${start_date},end_date.gte.${start_date}),and(start_date.lte.${end_date || start_date},end_date.gte.${end_date || start_date})`);

    if (overlapError) {
      return NextResponse.json({ error: 'Error checking for overlapping allocations' }, { status: 500 });
    }

    if (existingAllocations && existingAllocations.length > 0) {
      return NextResponse.json({ 
        error: 'This member already has an allocation for this project in the specified date range' 
      }, { status: 409 });
    }

    // Create the resource allocation
    const { data: allocation, error } = await supabase
      .from('resource_allocations')
      .insert({
        project_id,
        project_member_id,
        organization_id: userOrg.organization_id,
        allocated_hours_per_week: Number(allocated_hours_per_week),
        start_date,
        end_date: end_date || null,
        role: role || null,
        notes: notes || null,
        created_by: session.user.id
      })
      .select(`
        *,
        projects (
          id,
          name,
          code,
          status
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
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ allocation }, { status: 201 });
  } catch (error) {
    console.error('Error creating resource allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
