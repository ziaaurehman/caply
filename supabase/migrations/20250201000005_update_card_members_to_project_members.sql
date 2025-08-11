-- Migration to update card_members table to use project_member_id instead of user_id
-- This aligns with the project-based membership model

-- First, drop the existing card_members table and recreate it
DROP TABLE IF EXISTS card_members CASCADE;

-- Recreate card_members table with project_member_id
CREATE TABLE IF NOT EXISTS card_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  project_member_id UUID NOT NULL REFERENCES project_members(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_id, project_member_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_card_members_card_id ON card_members(card_id);
CREATE INDEX IF NOT EXISTS idx_card_members_project_member_id ON card_members(project_member_id);

-- Enable RLS
ALTER TABLE card_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for card_members
CREATE POLICY "Board members can manage card assignments" ON card_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN boards b ON b.id = l.board_id
      JOIN projects p ON p.id = b.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE c.id = card_members.card_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_card_members_updated_at BEFORE UPDATE ON card_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
