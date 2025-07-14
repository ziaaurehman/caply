-- Migration: Add documents column to projects table for storing list of document URLs

ALTER TABLE projects
  ADD COLUMN documents TEXT[];

-- Comment for clarity
COMMENT ON COLUMN projects.documents IS 'List of document URLs for this project (nullable)'; 