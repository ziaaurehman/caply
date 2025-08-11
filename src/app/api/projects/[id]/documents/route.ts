import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params;
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId') || req.headers.get('x-organization-id');

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

    // Fetch project documents
    const { data: documents, error } = await supabase
      .from('project_documents')
      .select(`
        id,
        filename,
        original_filename,
        file_size,
        mime_type,
        file_path,
        uploaded_at,
        uploaded_by,
        users!project_documents_uploaded_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching project documents:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: documents || [] });

  } catch (error) {
    console.error('Error in GET /api/projects/[id]/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params;
    const organizationId = req.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(
      organizationId,
      { resource: 'projects', action: 'update' }
    );

    if (!validation.success || !validation.context) {
      return NextResponse.json({ 
        error: validation.error || 'Unauthorized' 
      }, { status: validation.status || 401 });
    }

    const userId = validation.context.userId;
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

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    // const organizationIdForm = formData.get('organizationId') as string; // Not needed; using header

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'File type not allowed. Supported types: PDF, Word, Excel, Images, Text' 
      }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `projects/${projectId}/${uniqueFilename}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('caply')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('caply')
      .getPublicUrl(filePath);

    // Save document record to database
    const { data: document, error: dbError } = await supabase
      .from('project_documents')
      .insert({
        project_id: projectId,
        filename: uniqueFilename,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        file_path: filePath,
        uploaded_by: userId
      })
      .select(`
        id,
        filename,
        original_filename,
        file_size,
        mime_type,
        file_path,
        uploaded_at,
        uploaded_by,
        users!project_documents_uploaded_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .single();

    if (dbError) {
      console.error('Error saving document record:', dbError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('caply').remove([filePath]);
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 });
    }

    return NextResponse.json({ document });

  } catch (error) {
    console.error('Error in POST /api/projects/[id]/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
