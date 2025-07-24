import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const allocationId = params.id;

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
    const { data: allocation, error } = await supabase
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
      .eq('id', allocationId)
      .eq('organization_id', userOrg.organization_id)
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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const allocationId = params.id;

  try {
    const body = await req.json();
    const {
      allocated_hours_per_week,
      start_date,
      end_date,
      role,
      notes,
      is_active
    } = body;

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

    // Get current allocation to track changes
    const { data: currentAllocation, error: currentError } = await supabase
      .from('resource_allocations')
      .select('*')
      .eq('id', allocationId)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (currentError || !currentAllocation) {
      return NextResponse.json({ error: 'Resource allocation not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (allocated_hours_per_week !== undefined) {
      updateData.allocated_hours_per_week = Number(allocated_hours_per_week);
    }
    if (start_date !== undefined) {
      updateData.start_date = start_date;
    }
    if (end_date !== undefined) {
      updateData.end_date = end_date;
    }
    if (role !== undefined) {
      updateData.role = role;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    // Update the allocation
    const { data: allocation, error } = await supabase
      .from('resource_allocations')
      .update(updateData)
      .eq('id', allocationId)
      .eq('organization_id', userOrg.organization_id)
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
            role,
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Track history if hours changed
    if (allocated_hours_per_week !== undefined && allocated_hours_per_week !== currentAllocation.allocated_hours_per_week) {
      await supabase
        .from('capacity_history')
        .insert({
          resource_allocation_id: allocationId,
          organization_id: userOrg.organization_id,
          previous_hours: currentAllocation.allocated_hours_per_week,
          new_hours: Number(allocated_hours_per_week),
          change_reason: 'Manual update',
          changed_by: session.user.id
        });
    }

    return NextResponse.json({ allocation });
  } catch (error) {
    console.error('Error updating resource allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const allocationId = params.id;

  try {
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

    // Verify allocation exists and belongs to user's organization
    const { data: allocation, error: verifyError } = await supabase
      .from('resource_allocations')
      .select('id, allocated_hours_per_week')
      .eq('id', allocationId)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (verifyError || !allocation) {
      return NextResponse.json({ error: 'Resource allocation not found' }, { status: 404 });
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('resource_allocations')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', allocationId)
      .eq('organization_id', userOrg.organization_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Track deletion in history
    await supabase
      .from('capacity_history')
      .insert({
        resource_allocation_id: allocationId,
        organization_id: userOrg.organization_id,
        previous_hours: allocation.allocated_hours_per_week,
        new_hours: 0,
        change_reason: 'Allocation deleted',
        changed_by: session.user.id
      });

    return NextResponse.json({ message: 'Resource allocation deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
