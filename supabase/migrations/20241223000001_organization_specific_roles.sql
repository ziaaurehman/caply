-- Migration: Organization-Specific Roles System
-- This migration modifies the roles system to support organization-specific roles
-- while keeping system roles (superadmin, support_admin) as global roles

-- =====================================================
-- MODIFY ROLES TABLE STRUCTURE
-- =====================================================

-- Add organization_id to roles table
ALTER TABLE roles 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Drop the existing unique constraint on name
ALTER TABLE roles DROP CONSTRAINT roles_name_key;

-- Add new unique constraint: name must be unique within an organization (for non-system roles)
-- System roles (is_system_role = true) remain globally unique
CREATE UNIQUE INDEX roles_org_name_unique 
ON roles (organization_id, name) 
WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX roles_system_name_unique 
ON roles (name) 
WHERE is_system_role = true AND organization_id IS NULL;

-- =====================================================
-- UPDATE EXISTING SYSTEM ROLES
-- =====================================================

-- Ensure system roles have no organization_id (they remain global)
UPDATE roles 
SET organization_id = NULL 
WHERE is_system_role = true;

-- =====================================================
-- CREATE DEFAULT ORGANIZATION ROLES FUNCTION
-- =====================================================

-- Function to create default roles for an organization
CREATE OR REPLACE FUNCTION create_default_organization_roles(org_id UUID)
RETURNS VOID AS $$
DECLARE
  admin_role_id UUID;
  manager_role_id UUID;
  member_role_id UUID;
BEGIN
  -- Create organization-specific admin role
  INSERT INTO roles (id, name, display_name, description, is_system_role, organization_id)
  VALUES (
    uuid_generate_v4(),
    'admin',
    'Organization Administrator',
    'Full control over organization',
    false,
    org_id
  ) RETURNING id INTO admin_role_id;

  -- Create organization-specific manager role
  INSERT INTO roles (id, name, display_name, description, is_system_role, organization_id)
  VALUES (
    uuid_generate_v4(),
    'manager',
    'Manager',
    'Project and team management',
    false,
    org_id
  ) RETURNING id INTO manager_role_id;

  -- Create organization-specific member role
  INSERT INTO roles (id, name, display_name, description, is_system_role, organization_id)
  VALUES (
    uuid_generate_v4(),
    'member',
    'Team Member',
    'Basic team member access',
    false,
    org_id
  ) RETURNING id INTO member_role_id;

  -- Assign permissions to organization admin role (copy from existing global admin role)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT admin_role_id, rp.permission_id 
  FROM role_permissions rp
  JOIN roles r ON rp.role_id = r.id
  WHERE r.id = 'a0000000-0000-0000-0000-000000000003' -- Global admin role ID
  ON CONFLICT DO NOTHING;

  -- Assign permissions to organization manager role (copy from existing global manager role)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT manager_role_id, rp.permission_id 
  FROM role_permissions rp
  JOIN roles r ON rp.role_id = r.id
  WHERE r.id = 'a0000000-0000-0000-0000-000000000004' -- Global manager role ID
  ON CONFLICT DO NOTHING;

  -- Assign permissions to organization member role (copy from existing global member role)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT member_role_id, rp.permission_id 
  FROM role_permissions rp
  JOIN roles r ON rp.role_id = r.id
  WHERE r.id = 'a0000000-0000-0000-0000-000000000005' -- Global member role ID
  ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE DEFAULT ROLES FOR EXISTING ORGANIZATIONS
-- =====================================================

-- Create default roles for all existing organizations
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    PERFORM create_default_organization_roles(org_record.id);
  END LOOP;
END $$;

-- =====================================================
-- UPDATE EXISTING ORGANIZATION MEMBERS
-- =====================================================

-- Update organization members to use new organization-specific roles
DO $$
DECLARE
  member_record RECORD;
  new_role_id UUID;
BEGIN
  FOR member_record IN 
    SELECT om.id, om.organization_id, om.user_id, r.name as role_name
    FROM organization_members om
    JOIN roles r ON om.role_id = r.id
    WHERE r.is_system_role = false
  LOOP
    -- Find the corresponding organization-specific role
    SELECT id INTO new_role_id
    FROM roles
    WHERE name = member_record.role_name
    AND organization_id = member_record.organization_id
    AND is_system_role = false;

    -- Update the organization member to use the new role
    IF new_role_id IS NOT NULL THEN
      UPDATE organization_members
      SET role_id = new_role_id
      WHERE id = member_record.id;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- UPDATE USER SIGNUP FUNCTION
-- =====================================================

-- Update the signup function to create organization-specific roles
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  admin_role_id UUID;
BEGIN
  -- Insert user profile
  INSERT INTO users (id, email, full_name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at IS NOT NULL
  );

  -- Create organization for new user (they become the owner)
  INSERT INTO organizations (name, slug, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Organization',
    'org-' || LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), ' ', '-')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8),
    NEW.id
  ) RETURNING id INTO org_id;

  -- Create default roles for the new organization
  PERFORM create_default_organization_roles(org_id);

  -- Get the organization-specific admin role ID
  SELECT id INTO admin_role_id 
  FROM roles 
  WHERE name = 'admin' 
  AND organization_id = org_id 
  AND is_system_role = false;

  -- Add user as admin member of their organization
  INSERT INTO organization_members (organization_id, user_id, role_id, status)
  VALUES (org_id, NEW.id, admin_role_id, 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ADD TRIGGER FOR ORGANIZATION CREATION
-- =====================================================

-- Function to automatically create default roles when organization is created
CREATE OR REPLACE FUNCTION handle_organization_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default roles for the new organization
  PERFORM create_default_organization_roles(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for organization creation (only if not coming from user signup)
-- This handles cases where organizations are created directly via API or admin interface
CREATE OR REPLACE FUNCTION should_create_roles_for_org()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create roles if this organization doesn't already have any roles
  IF NOT EXISTS (
    SELECT 1 FROM roles WHERE organization_id = NEW.id
  ) THEN
    PERFORM create_default_organization_roles(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to organizations table (this will run after user signup function too, but safely)
DROP TRIGGER IF EXISTS on_organization_created ON organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION should_create_roles_for_org();

-- =====================================================
-- ADD RLS POLICIES FOR ROLES
-- =====================================================

-- Enable RLS on roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Organization members can view their organization's roles
CREATE POLICY "Organization members can view organization roles" ON roles
  FOR SELECT USING (
    -- System roles are visible to everyone
    (is_system_role = true AND organization_id IS NULL)
    OR
    -- Organization-specific roles are visible to organization members
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = roles.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    ))
  );

-- Organization admins can create/update/delete organization roles
CREATE POLICY "Organization admins can manage organization roles" ON roles
  FOR ALL USING (
    organization_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.organization_id = roles.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND r.name = 'admin'
      AND r.organization_id = roles.organization_id
    )
  );

-- Support admins can view all roles
CREATE POLICY "Support admins can view all roles" ON roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
      AND r.name = 'support_admin'
      AND r.is_system_role = true
      AND om.status = 'active'
    )
  );

-- =====================================================
-- ADD HELPER FUNCTIONS
-- =====================================================

-- Function to get organization roles
CREATE OR REPLACE FUNCTION get_organization_roles(org_id UUID)
RETURNS TABLE(
  id UUID,
  name VARCHAR(50),
  display_name VARCHAR(100),
  description TEXT,
  is_system_role BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.name, r.display_name, r.description, r.is_system_role, r.created_at, r.updated_at
  FROM roles r
  WHERE r.organization_id = org_id
  ORDER BY 
    CASE 
      WHEN r.name = 'admin' THEN 1
      WHEN r.name = 'manager' THEN 2
      WHEN r.name = 'member' THEN 3
      ELSE 4
    END,
    r.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a custom role for an organization
CREATE OR REPLACE FUNCTION create_organization_role(
  org_id UUID,
  role_name VARCHAR(50),
  role_display_name VARCHAR(100),
  role_description TEXT,
  permission_ids UUID[]
)
RETURNS UUID AS $$
DECLARE
  new_role_id UUID;
  permission_id UUID;
BEGIN
  -- Check if user has permission to create roles in this organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members om
    JOIN roles r ON om.role_id = r.id
    WHERE om.organization_id = org_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND r.name = 'admin'
    AND r.organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to create roles in this organization';
  END IF;

  -- Create the role
  INSERT INTO roles (name, display_name, description, is_system_role, organization_id)
  VALUES (role_name, role_display_name, role_description, false, org_id)
  RETURNING id INTO new_role_id;

  -- Assign permissions to the role
  FOREACH permission_id IN ARRAY permission_ids
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (new_role_id, permission_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN new_role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PREPARE FOR CLEANUP (DON'T DELETE YET)
-- =====================================================

-- Note: Old global roles will be cleaned up in a separate migration
-- after ensuring all references are properly updated

-- Log what will be cleaned up
DO $$
DECLARE
  roles_to_cleanup INTEGER;
  permissions_to_cleanup INTEGER;
BEGIN
  SELECT COUNT(*) INTO roles_to_cleanup
  FROM roles 
  WHERE is_system_role = false AND organization_id IS NULL;
  
  SELECT COUNT(*) INTO permissions_to_cleanup
  FROM role_permissions rp
  JOIN roles r ON rp.role_id = r.id
  WHERE r.is_system_role = false AND r.organization_id IS NULL;
  
  RAISE NOTICE 'Migration complete. % old global roles and % permissions will be cleaned up in next migration', 
    roles_to_cleanup, permissions_to_cleanup;
END $$;

-- =====================================================
-- ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for organization roles
CREATE INDEX IF NOT EXISTS idx_roles_organization ON roles(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_roles_system ON roles(is_system_role) WHERE is_system_role = true;

-- Update existing indexes on organization_members for role lookups
CREATE INDEX IF NOT EXISTS idx_org_members_role_org ON organization_members(role_id, organization_id);

-- =====================================================
-- ADD COMMENTS
-- =====================================================

COMMENT ON COLUMN roles.organization_id IS 'NULL for system roles (superadmin, support_admin), UUID for organization-specific roles';
COMMENT ON TABLE roles IS 'Roles can be either system-wide (is_system_role=true, organization_id=NULL) or organization-specific (is_system_role=false, organization_id=UUID)';
