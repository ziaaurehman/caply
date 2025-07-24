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
  const projectMemberId = searchParams.get('project_member_id');
  const projectId = searchParams.get('project_id');

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
      .eq('project_members.projects.organization_id', userOrg.organization_id);

    if (projectMemberId) {
      query = query.eq('project_member_id', projectMemberId);
    }

    if (projectId) {
      query = query.eq('project_members.project_id', projectId);
    }

    const { data: capacities, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ capacities: capacities || [] });
  } catch (error) {
    console.error('Error fetching member capacities:', error);
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
      project_member_id,
      weekly_capacity_hours,
      work_days_per_week,
      availability_start_date,
      availability_end_date,
      time_zone,
      notes
    } = body;

    // Validate required fields
    if (!project_member_id || !weekly_capacity_hours) {
      return NextResponse.json({ 
        error: 'Missing required fields: project_member_id, weekly_capacity_hours' 
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

    // Verify project member exists and belongs to user's organization
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select(`
        id,
        project_id,
        projects!inner (
          id,
          organization_id
        )
      `)
      .eq('id', project_member_id)
      .eq('projects.organization_id', userOrg.organization_id)
      .single();

    if (memberError || !projectMember) {
      return NextResponse.json({ error: 'Project member not found' }, { status: 404 });
    }

    // Upsert member capacity (update if exists, insert if not)
    const { data: capacity, error } = await supabase
      .from('member_capacity')
      .upsert({
        project_member_id,
        weekly_capacity_hours: Number(weekly_capacity_hours),
        work_days_per_week: Number(work_days_per_week) || 5,
        availability_start_date: availability_start_date || null,
        availability_end_date: availability_end_date || null,
        time_zone: time_zone || 'UTC',
        notes: notes || null,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        project_members (
          id,
          role,
          project_id,
          projects (
            id,
            name
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
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ capacity }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating member capacity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
