import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';
import { redisGetJSON, redisSetJSON } from '@/utils/redis';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const { id: projectId, documentId } = params;
    const organizationId = req.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      organizationId,
      { resource: 'projects', action: 'read' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

    const supabase = await createClient();

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('organization_id', organizationId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Try cache first (15 days TTL)
    const cacheKey = `project:document:${projectId}:${documentId}:${organizationId}`
    const cached = await redisGetJSON<any>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Get document details
    const { data: document, error: documentError } = await supabase
      .from('project_documents')
      .select('*')
      .eq('id', documentId)
      .eq('project_id', projectId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Generate signed URL for download
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('caply')
      .createSignedUrl(document.file_path, 60); // 60 seconds expiry

    if (urlError) {
      console.error('Error generating signed URL:', urlError);
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    const result = {
      document,
      download_url: signedUrl.signedUrl
    };

    // Cache the result (15 days)
    try {
      await redisSetJSON(cacheKey, result, 1296000)
    } catch (e) {
      console.warn('Failed to cache document:', e)
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in GET /api/projects/[id]/documents/[documentId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const { id: projectId, documentId } = params;
    const organizationId = req.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      organizationId,
      { resource: 'projects', action: 'update' }
    );

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: validation.status });
    }

    const supabase = await createClient();

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('organization_id', organizationId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get document details
    const { data: document, error: documentError } = await supabase
      .from('project_documents')
      .select('*')
      .eq('id', documentId)
      .eq('project_id', projectId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('caply')
      .remove([document.file_path]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      return NextResponse.json({ error: 'Failed to delete file from storage' }, { status: 500 });
    }

    // Delete document record from database
    const { error: dbError } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', documentId)
      .eq('project_id', projectId);

    if (dbError) {
      console.error('Error deleting document record:', dbError);
      return NextResponse.json({ error: 'Failed to delete document record' }, { status: 500 });
    }

          // Refresh project documents cache after deletion (15 days)
      try {
        const { data: freshDocuments } = await supabase
          .from('project_documents')
          .select(`
            id,
            filename,
            original_filename,
            file_size,
            mime_type,
            file_path,
            uploaded_at,
            uploaded_by
          `)
          .eq('project_id', projectId)
          .order('uploaded_at', { ascending: false });

        const documentsCacheKey = `project:documents:${projectId}:${organizationId}`;
        await redisSetJSON(documentsCacheKey, {
          documents: freshDocuments || []
        }, 1296000);

        // Clear individual document cache
        const documentCacheKey = `project:document:${projectId}:${documentId}:${organizationId}`;
        // Note: Redis cache will expire naturally, no need to manually delete
      } catch (e) {
        console.warn('Failed to refresh project documents cache after delete:', e);
      }

    return NextResponse.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]/documents/[documentId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}









