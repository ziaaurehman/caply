import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON, redisDel } from '@/utils/redis';

// Cache TTL: 15 days
const CACHE_TTL = 1296000;

// GET: list resources (organization members participating in capacity planning)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');
  const onlyActive = (searchParams.get('only_active') ?? 'true') === 'true';
  const filterUserIds = searchParams.getAll('user_id');

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  const validation = await validateOrganizationAccessWithId(organizationId, { resource: 'capacity', action: 'read' });
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  // Build cache key
  const cacheKey = `capacity:resources:${organizationId}:${onlyActive}:${filterUserIds.join(',') || 'all'}`;

  try {
    // Try to get from cache first
    const cachedData = await redisGetJSON(cacheKey);
    if (cachedData) {
      console.log('Cache hit for capacity resources:', cacheKey);
      return NextResponse.json(cachedData);
    }

    const supabase = await createClient();

    let query = supabase
      .from('resource_allocations')
      .select(`
        id,
        organization_id,
        organization_member_id,
        weekly_capacity_hours,
        hourly_rate,
        is_active,
        is_archived,
        created_at,
        updated_at,
        organization_members!organization_member_id (
          id,
          user_id,
          status,
          roles:role_id (
            id,
            name
          ),
          users!user_id (
            id,
            full_name,
            email,
            avatar_url,
            position
          )
        )
      `)
      .eq('organization_id', organizationId);

    if (onlyActive) query = query.eq('is_active', true);
    if (filterUserIds.length > 0) query = query.in('organization_members.user_id', filterUserIds as any);

    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const response = { resources: data || [] };

    // Cache the response
    await redisSetJSON(cacheKey, response, CACHE_TTL);
    console.log('Cached capacity resources:', cacheKey);

    return NextResponse.json(response);
  } catch (e) {
    console.error('Error listing capacity resources:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: upsert resource (create or update by organization_member_id)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { organizationId, organization_member_id, weekly_capacity_hours, hourly_rate, is_active } = body || {};

  if (!organizationId || !organization_member_id) {
    return NextResponse.json({ error: 'organizationId and organization_member_id are required' }, { status: 400 });
  }

  const validation = await validateOrganizationAccessWithId(organizationId, { resource: 'capacity', action: 'manage' });
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const supabase = await createClient();

  try {
    // Verify the org member belongs to this organization
    const { data: om, error: omErr } = await supabase
      .from('organization_members')
      .select('id, organization_id')
      .eq('id', organization_member_id)
      .single();
    if (omErr || !om || (om as any).organization_id !== organizationId) {
      return NextResponse.json({ error: 'Invalid organization member' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('resource_allocations')
      .upsert({
        organization_id: organizationId,
        organization_member_id,
        weekly_capacity_hours: weekly_capacity_hours ?? 40,
        hourly_rate: hourly_rate ?? null,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,organization_member_id' })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Clear related caches
    await redisDel(`capacity:resources:${organizationId}:*`);
    await redisDel(`capacity:overview:${organizationId}:*`);
    await redisDel(`capacity:allocations:${organizationId}:*`);
    await redisDel(`capacity:members:${organizationId}:*`);
    await redisDel(`capacity:projects:${organizationId}:*`);
    console.log('Cleared capacity-related caches for organization:', organizationId);

    return NextResponse.json({ resource: data });
  } catch (e) {
    console.error('Error upserting capacity resource:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


