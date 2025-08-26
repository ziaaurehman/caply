import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON } from '@/utils/redis';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json({ 
        error: 'Organization ID is required' 
      }, { status: 400 });
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      organizationId,
      { resource: 'clients', action: 'read' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

    const supabase = await createClient();

    // Try cache first (15 days TTL)
    const cacheKey = `organization:clients:${organizationId}`
    const cached = await redisGetJSON<any>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = {
      clients: data || []
    };

    // Cache the result (15 days)
    try {
      await redisSetJSON(cacheKey, result, 1296000)
    } catch (e) {
      console.warn('Failed to cache clients:', e)
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in GET /api/clients:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const organizationId = body.organizationId || body.organization_id || req.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json({ 
        error: 'Organization ID is required' 
      }, { status: 400 });
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      organizationId,
      { resource: 'clients', action: 'create' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

    const { context: userContext } = validation;
    const { name, organizationId: bodyOrgId, ...rest } = body;

    if (!name) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clients')
      .insert([{ 
        organization_id: organizationId, 
        name, 
        created_by: userContext!.userId,
        ...rest 
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Refresh clients cache after creation (15 days)
    try {
      const { data: freshClients } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      const cacheKey = `organization:clients:${organizationId}`;
      await redisSetJSON(cacheKey, {
        clients: freshClients || []
      }, 1296000);
    } catch (e) {
      console.warn('Failed to refresh clients cache after create:', e);
    }

    return NextResponse.json({ client: data });
  } catch (error: any) {
    console.error('Error in POST /api/clients:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 