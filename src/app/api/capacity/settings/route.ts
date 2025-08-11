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
    // Get organization-level capacity settings
    const { data: settings, error } = await supabase
      .from('capacity_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching capacity settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: settings ? [settings] : [], total: settings ? 1 : 0 });

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
    default_work_hours_per_week,
    default_work_days_per_week,
    capacity_planning_enabled,
    allow_overallocation,
    overallocation_threshold_percent
  } = settingsData;

  // Validate required fields
  if (!default_work_hours_per_week) {
    return NextResponse.json({ error: 'Default work hours per week is required' }, { status: 400 });
  }

  try {
    // Create or update organization-level capacity settings
    const { data: settings, error: createError } = await supabase
      .from('capacity_settings')
      .upsert([{
        organization_id: organizationId,
        default_work_hours_per_week,
        default_work_days_per_week: default_work_days_per_week ?? 5,
        capacity_planning_enabled: capacity_planning_enabled ?? true,
        allow_overallocation: allow_overallocation ?? false,
        overallocation_threshold_percent: overallocation_threshold_percent ?? 100,
        updated_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (createError) {
      console.error('Error creating/updating capacity settings:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings });

  } catch (error) {
    console.error('Error in capacity settings POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
