-- Migration: Update checklist_items table to use project_member_id instead of assigned_to (user_id)
-- This aligns with the project-based member system

-- First, drop the existing checklist_items table and recreate it
DROP TABLE IF EXISTS checklist_items CASCADE;

-- Recreate checklist_items table with project_member_id
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMP WITH TIME ZONE NULL,
  assigned_to_project_member_id UUID REFERENCES project_members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_assigned_to ON checklist_items(assigned_to_project_member_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_position ON checklist_items(position);

-- Enable RLS on checklist_items table
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for checklist_items
CREATE POLICY "Board members can manage checklist items" ON checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM checklists cl
      JOIN cards c ON c.id = cl.card_id
      JOIN lists l ON l.id = c.list_id
      JOIN boards b ON b.id = l.board_id
      JOIN projects p ON p.id = b.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE cl.id = checklist_items.checklist_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Add comments for clarity
COMMENT ON TABLE checklist_items IS 'Individual items within checklists';
COMMENT ON COLUMN checklist_items.assigned_to_project_member_id IS 'References project_members.id - the project member assigned to this checklist item';
