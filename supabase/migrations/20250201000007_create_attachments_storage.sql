-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('caply', 'caply', false);

-- Create storage policies for attachments bucket
CREATE POLICY "Users can view attachments they have access to" ON storage.objects
FOR SELECT USING (
  bucket_id = 'caply' AND
  EXISTS (
    SELECT 1 FROM attachments a
    JOIN cards c ON c.id = a.card_id
    JOIN lists l ON l.id = c.list_id
    JOIN boards b ON b.id = l.board_id
    JOIN projects p ON p.id = b.project_id
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE a.file_path = storage.objects.name 
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

CREATE POLICY "Users can upload attachments to cards they can access" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'caply' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete attachments they uploaded" ON storage.objects
FOR DELETE USING (
  bucket_id = 'caply' AND
  EXISTS (
    SELECT 1 FROM attachments a
    WHERE a.file_path = storage.objects.name 
    AND a.uploaded_by = auth.uid()
  )
);


