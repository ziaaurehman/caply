-- Create project_documents table
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_by ON project_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_at ON project_documents(uploaded_at);

-- Enable RLS
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view project documents for projects they have access to" ON project_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE p.id = project_documents.project_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Users can upload documents to projects they can update" ON project_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE p.id = project_documents.project_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Users can delete documents they uploaded or have project update access" ON project_documents
  FOR DELETE USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE p.id = project_documents.project_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );
