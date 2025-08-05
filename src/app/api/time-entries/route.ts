import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');
  const memberId = searchParams.get('member_id');
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
    { resource: 'time_entries', action: 'read' }
  )

  if (!validation.success) {
    return NextResponse.json({ 
      error: validation.error 
    }, { status: validation.status })
  }

  const supabase = await createClient()

  try {
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        project_members (
          id,
          role,
          projects (
            id,
            name,
            code
          ),
          organization_members (
            id,
            users (
              id,
              full_name,
              email,
              avatar_url
            )
          )
        )
      `)
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    if (memberId) {
      query = query.eq('project_member_id', memberId);
    }

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: timeEntries, error } = await query;

    if (error) {
      console.error('Error fetching time entries:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      timeEntries: timeEntries || [],
      success: true 
    });

  } catch (error) {
    console.error('Error in time entries GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { organizationId, ...timeEntryData } = body;

  if (!organizationId) {
    return NextResponse.json({ 
      error: 'Organization ID is required' 
    }, { status: 400 })
  }

  // Validate organization access and permissions
  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'time_entries', action: 'create' }
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
    date,
    hours,
    description,
    task_id
  } = timeEntryData;

  // Validate required fields
  if (!project_id || !project_member_id || !date || !hours) {
    return NextResponse.json({ 
      error: 'Project ID, project member ID, date, and hours are required' 
    }, { status: 400 });
  }

  try {
    // Verify project member exists and belongs to the organization
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select(`
        id,
        project_id,
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

    // Check if the user has permission to add time entries for this member
    const canAddForMember = userContext.membership.role.name === 'admin' || 
                           userContext.membership.role.name === 'manager' ||
                           (projectMember.organization_members as any).user_id === userContext.userId;

    if (!canAddForMember) {
      return NextResponse.json({ 
        error: 'You can only add time entries for yourself' 
      }, { status: 403 });
    }

    // Create the time entry
    const { data: timeEntry, error: createError } = await supabase
      .from('time_entries')
      .insert([{
        project_id,
        project_member_id,
        organization_id: organizationId,
        date,
        hours,
        description: description || null,
        task_id: task_id || null,
        created_by: userContext.userId
      }])
      .select(`
        *,
        project_members (
          id,
          role,
          projects (
            id,
            name,
            code
          ),
          organization_members (
            id,
            users (
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
      console.error('Error creating time entry:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      timeEntry: timeEntry 
    });

  } catch (error) {
    console.error('Error in time entries POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
