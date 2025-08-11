import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: allocationId } = await params;
  const organizationId = req.headers.get('x-organization-id');

  // Prefer header-based org validation for consistency
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  const validation = await validateOrganizationAccessWithId(
    organizationId,
    { resource: 'capacity', action: 'read' }
  );
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const supabase = await createClient();

  try {
    const { data: allocation, error } = await supabase
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
          organization_id,
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
      .eq('id', allocationId)
      .eq('resource_allocations.organization_id', organizationId)
      .single();

    if (error || !allocation) {
      return NextResponse.json({ error: 'Resource allocation not found' }, { status: 404 });
    }

    return NextResponse.json({ allocation });
  } catch (error) {
    console.error('Error fetching resource allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: allocationId } = await params;
  const organizationId = req.headers.get('x-organization-id');
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    const body = await req.json();
    const { hours_per_week, start_date, end_date, notes, is_active } = body;

    // Verify assignment belongs to same organization via join
    const { data: currentAllocation, error: currentError } = await supabase
      .from('project_assignments')
      .select(`id, hours_per_week, resource_allocations ( organization_id )`)
      .eq('id', allocationId)
      .single();

    if (currentError || !currentAllocation) {
      return NextResponse.json({ error: 'Resource allocation not found' }, { status: 404 });
    }
    if ((currentAllocation as any)?.resource_allocations?.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() };
    if (hours_per_week !== undefined) updateData.hours_per_week = Number(hours_per_week);
    if (start_date !== undefined) {
      updateData.start_date = start_date;
    }
    if (end_date !== undefined) {
      updateData.end_date = end_date;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    // Update the assignment
    const { data: allocation, error } = await supabase
      .from('project_assignments')
      .update(updateData)
      .eq('id', allocationId)
      .select(`
        *,
        projects ( id, name, code, status ),
        resource_allocations (
          id,
          organization_member_id,
          organization_members:organization_member_id (
            id,
            users!user_id ( id, full_name, email, avatar_url )
          )
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // No history table in rework

    return NextResponse.json({ allocation });
  } catch (error) {
    console.error('Error updating resource allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: allocationId } = await params;
  const organizationId = req.headers.get('x-organization-id');
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    // Verify assignment exists and belongs to user's organization
    const { data: allocation, error: verifyError } = await supabase
      .from('project_assignments')
      .select('id, hours_per_week, resource_allocations ( organization_id )')
      .eq('id', allocationId)
      .single();

    if (verifyError || !allocation) {
      return NextResponse.json({ error: 'Project assignment not found' }, { status: 404 });
    }
    if ((allocation as any)?.resource_allocations?.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Soft delete by setting is_active to false on project_assignments
    const { error } = await supabase
      .from('project_assignments')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', allocationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // No history table

    return NextResponse.json({ message: 'Resource allocation deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
