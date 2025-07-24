import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    
    // Get user's organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get capacity settings for projects in this organization
    const { data: settings, error } = await supabase
      .from('capacity_settings')
      .select(`
        *,
        projects (
          id,
          name,
          organization_id
        )
      `)
      .eq('projects.organization_id', userOrg.organization_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no settings exist, return default settings
    if (!settings || settings.length === 0) {
      return NextResponse.json({
        settings: [{
          default_weekly_capacity: 40,
          default_work_days_per_week: 5,
          allow_overallocation: false,
          overallocation_threshold: 100,
          notification_settings: {
            email_on_overallocation: true,
            email_on_capacity_changes: false,
            weekly_capacity_reports: false
          }
        }]
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching capacity settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const body = await req.json();
    const { project_id, default_weekly_capacity, default_work_days_per_week, allow_overallocation, overallocation_threshold, notification_settings } = body;

    // Get user's organization and check permissions
    const { data: userOrg, error: userOrgError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Only owners and admins can update capacity settings
    if (!['owner', 'admin'].includes(userOrg.role)) {
      return NextResponse.json({ error: 'Only organization owners can update capacity settings' }, { status: 403 });
    }

    // Upsert capacity settings
    const { data: settings, error } = await supabase
      .from('capacity_settings')
      .upsert({
        project_id,
        default_weekly_capacity: default_weekly_capacity || 40,
        default_work_days_per_week: default_work_days_per_week || 5,
        allow_overallocation: allow_overallocation || false,
        overallocation_threshold: overallocation_threshold || 100,
        notification_settings: notification_settings || {
          email_on_overallocation: true,
          email_on_capacity_changes: false,
          weekly_capacity_reports: false
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id'
      })
      .select(`
        *,
        projects (
          id,
          name,
          organization_id
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating capacity settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
