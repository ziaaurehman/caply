import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

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

    return NextResponse.json({
      document,
      download_url: signedUrl.signedUrl
    });

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

    return NextResponse.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]/documents/[documentId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}





