import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON, redisDel } from '@/utils/redis';

// Cache TTL: 15 days
const CACHE_TTL = 1296000;

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

  // Build cache key
  const cacheKey = `capacity:allocation:${allocationId}:${organizationId}`;

  try {
    // Try to get from cache first
    const cachedData = await redisGetJSON(cacheKey);
    if (cachedData) {
      console.log('Cache hit for capacity allocation:', cacheKey);
      return NextResponse.json(cachedData);
    }

    const supabase = await createClient();

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

    const response = { allocation };

    // Cache the response
    await redisSetJSON(cacheKey, response, CACHE_TTL);
    console.log('Cached capacity allocation:', cacheKey);

    return NextResponse.json(response);
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

    // Clear related caches
    await redisDel(`capacity:allocation:${allocationId}:${organizationId}`);
    await redisDel(`capacity:allocations:${organizationId}:*`);
    await redisDel(`capacity:overview:${organizationId}:*`);
    await redisDel(`capacity:members:${organizationId}:*`);
    await redisDel(`capacity:projects:${organizationId}:*`);
    await redisDel(`capacity:resources:${organizationId}:*`);
    await redisDel(`capacity:tasks:summary:${organizationId}:*`);
    console.log('Cleared capacity-related caches for organization:', organizationId);

    return NextResponse.json({ allocation });
  } catch (error) {
    console.error('Error updating resource allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: allocationId } = await params;
  const organizationId = req.headers.get('x-organization-id');
  
  console.log('DELETE request for allocation:', allocationId, 'organization:', organizationId);
  
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    // Verify assignment exists and belongs to user's organization
    const { data: allocation, error: verifyError } = await supabase
      .from('project_assignments')
      .select(`
        id, 
        hours_per_week, 
        is_active, 
        project_id,
        resource_allocations ( 
          id,
          organization_id,
          organization_member_id 
        )
      `)
      .eq('id', allocationId)
      .single();

    console.log('Found allocation:', allocation, 'error:', verifyError);

    if (verifyError || !allocation) {
      console.log('Allocation not found or error:', verifyError);
      return NextResponse.json({ error: 'Project assignment not found' }, { status: 404 });
    }
    if ((allocation as any)?.resource_allocations?.organization_id !== organizationId) {
      console.log('Organization mismatch:', (allocation as any)?.resource_allocations?.organization_id, 'vs', organizationId);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    console.log('Performing hard delete for allocation:', allocationId);
    
    // Check if there are any related records that might prevent deletion
    console.log('Allocation details:', allocation);
    
    // Hard delete the project assignment record
    const { error } = await supabase
      .from('project_assignments')
      .delete()
      .eq('id', allocationId);

    console.log('Hard delete result:', { error });

    if (error) {
      console.error('Delete failed:', error);
      
      // If deletion fails due to foreign key constraints, try soft delete as fallback
      if (error.message.includes('foreign key') || error.message.includes('constraint')) {
        console.log('Trying soft delete as fallback...');
        
        const { error: softDeleteError } = await supabase
          .from('project_assignments')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', allocationId);
          
        if (softDeleteError) {
          return NextResponse.json({ error: `Delete failed: ${error.message}. Soft delete also failed: ${softDeleteError.message}` }, { status: 500 });
        }
        
        // Clear related caches after successful soft delete
        await redisDel(`capacity:allocation:${allocationId}:${organizationId}`);
        await redisDel(`capacity:allocations:${organizationId}:*`);
        await redisDel(`capacity:overview:${organizationId}:*`);
        await redisDel(`capacity:members:${organizationId}:*`);
        await redisDel(`capacity:projects:${organizationId}:*`);
        await redisDel(`capacity:resources:${organizationId}:*`);
        await redisDel(`capacity:tasks:summary:${organizationId}:*`);
        console.log('Cleared capacity-related caches after soft delete for organization:', organizationId);

        console.log('Soft delete successful as fallback');
        return NextResponse.json({ message: 'Resource allocation deactivated successfully (soft delete)' });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clear related caches after successful delete
    await redisDel(`capacity:allocation:${allocationId}:${organizationId}`);
    await redisDel(`capacity:allocations:${organizationId}:*`);
    await redisDel(`capacity:overview:${organizationId}:*`);
    await redisDel(`capacity:members:${organizationId}:*`);
    await redisDel(`capacity:projects:${organizationId}:*`);
    await redisDel(`capacity:resources:${organizationId}:*`);
    await redisDel(`capacity:tasks:summary:${organizationId}:*`);
    console.log('Cleared capacity-related caches after delete for organization:', organizationId);

    console.log('Hard delete successful for allocation:', allocationId);
    return NextResponse.json({ message: 'Resource allocation deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
