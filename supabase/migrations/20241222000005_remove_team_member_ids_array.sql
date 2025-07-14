-- Migration: Remove team_member_ids array column from projects table
-- This migration removes the team_member_ids column since we now use project_members table

-- Remove the team_member_ids column from projects table
ALTER TABLE projects DROP COLUMN IF EXISTS team_member_ids;

-- Add comment to document the change
COMMENT ON TABLE projects IS 'Projects table - team members are now managed via project_members table'; 