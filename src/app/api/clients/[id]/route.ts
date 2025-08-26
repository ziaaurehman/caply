import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON } from '@/utils/redis';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const organizationId = req.headers.get('x-organization-id');

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
    const cacheKey = `client:${id}:${organizationId}`
    const cached = await redisGetJSON<any>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = {
      client: data
    };

    // Cache the result (15 days)
    try {
      await redisSetJSON(cacheKey, result, 1296000)
    } catch (e) {
      console.warn('Failed to cache client:', e)
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in GET /api/clients/[id]:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const organizationId = req.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json({ 
        error: 'Organization ID is required' 
      }, { status: 400 });
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      organizationId,
      { resource: 'clients', action: 'update' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

    const supabase = await createClient();
    
    // First check if client exists and belongs to the organization
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Update the client
    const { data, error } = await supabase
      .from('clients')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Refresh client cache and clients list cache after update (15 days)
    try {
      // Refresh individual client cache
      const clientCacheKey = `client:${id}:${organizationId}`;
      await redisSetJSON(clientCacheKey, {
        client: data
      }, 1296000);

      // Refresh clients list cache
      const { data: freshClients } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      const clientsListCacheKey = `organization:clients:${organizationId}`;
      await redisSetJSON(clientsListCacheKey, {
        clients: freshClients || []
      }, 1296000);
    } catch (e) {
      console.warn('Failed to refresh client cache after update:', e);
    }

    return NextResponse.json({ client: data });
  } catch (error: any) {
    console.error('Error in PUT /api/clients/[id]:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const organizationId = req.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json({ 
        error: 'Organization ID is required' 
      }, { status: 400 });
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      organizationId,
      { resource: 'clients', action: 'delete' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

    const supabase = await createClient();
    
    // First check if client exists and belongs to the organization
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Delete the client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Refresh clients list cache after deletion (15 days)
    try {
      const { data: freshClients } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      const clientsListCacheKey = `organization:clients:${organizationId}`;
      await redisSetJSON(clientsListCacheKey, {
        clients: freshClients || []
      }, 1296000);
    } catch (e) {
      console.warn('Failed to refresh clients cache after delete:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/clients/[id]:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}