import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
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
      .eq('projects.organization_id', organizationId);

    if (error) {
      console.error('Error fetching capacity settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      settings: settings || [],
      total: settings?.length || 0
    });

  } catch (error) {
    console.error('Error in capacity settings GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { organizationId, ...settingsData } = body;

  if (!organizationId) {
    return NextResponse.json({ 
      error: 'Organization ID is required' 
    }, { status: 400 })
  }

  // Validate organization access and permissions (admin only for settings)
  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'capacity', action: 'manage' }
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
    default_hours_per_week,
    default_work_days_per_week,
    overtime_threshold,
    capacity_buffer_percentage,
    auto_allocation_enabled
  } = settingsData;

  // Validate required fields
  if (!project_id || !default_hours_per_week) {
    return NextResponse.json({ 
      error: 'Project ID and default hours per week are required' 
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

    // Create or update capacity settings
    const { data: settings, error: createError } = await supabase
      .from('capacity_settings')
      .upsert([{
        project_id,
        default_hours_per_week,
        default_work_days_per_week: default_work_days_per_week || 5,
        overtime_threshold: overtime_threshold || 40,
        capacity_buffer_percentage: capacity_buffer_percentage || 10,
        auto_allocation_enabled: auto_allocation_enabled || false,
        updated_by: userContext.userId,
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        projects (
          id,
          name,
          organization_id
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating/updating capacity settings:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      settings 
    });

  } catch (error) {
    console.error('Error in capacity settings POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
