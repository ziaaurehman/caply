-- Fix invitation constraints - Version 2
-- This migration properly handles the constraint changes for organization_invitations

-- First, let's check what constraints and indexes actually exist
-- and handle them properly

-- Add user_id field if it doesn't exist
ALTER TABLE organization_invitations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Try to drop the constraint first (if it exists)
DO $$
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_invitations_organization_id_email_key'
        AND table_name = 'organization_invitations'
    ) THEN
        ALTER TABLE organization_invitations 
        DROP CONSTRAINT organization_invitations_organization_id_email_key;
    END IF;
    
    -- Check if the index exists and drop it
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'organization_invitations_organization_id_email_key'
    ) THEN
        DROP INDEX IF EXISTS organization_invitations_organization_id_email_key;
    END IF;
END $$;

-- Add new unique constraint that allows multiple invitations but only one pending per org-email
CREATE UNIQUE INDEX IF NOT EXISTS organization_invitations_org_email_pending_unique 
ON organization_invitations(organization_id, email) 
WHERE status = 'pending';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_invitations_user_id 
ON organization_invitations(user_id);

CREATE INDEX IF NOT EXISTS idx_organization_invitations_user_status 
ON organization_invitations(user_id, status) 
WHERE status = 'pending';

-- Add index for querying invitations by email
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email 
ON organization_invitations(email);

-- Add index for querying invitations by organization and status
CREATE INDEX IF NOT EXISTS idx_organization_invitations_org_status 
ON organization_invitations(organization_id, status); 