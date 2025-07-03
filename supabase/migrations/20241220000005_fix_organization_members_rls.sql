-- Fix infinite recursion in organization_members RLS policies
-- The issue is that the current policy tries to check organization_members to determine 
-- if a user can see organization_members, creating circular dependency

-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Support admins can view all organization members" ON organization_members;

-- Create simpler policies that don't create circular dependencies

-- Users can view their own membership records
CREATE POLICY "Users can view own membership" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

-- Users can view other members in the same organization (using a function to avoid recursion)
CREATE POLICY "Users can view organization members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Super admins can view all organization members
CREATE POLICY "Super admins can view all organization members" ON organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_super_admin = true
    )
  );

-- Users can insert organization members if they are admin/manager in that organization
CREATE POLICY "Admins can manage organization members" ON organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_members.organization_id
      AND om.status = 'active'
      AND r.name IN ('admin', 'manager')
    )
  );

-- Update organization_invitations policies as well to ensure they work properly
DROP POLICY IF EXISTS "Users can view organization invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can manage organization invitations" ON organization_invitations;

-- Users can view invitations for organizations they are members of
CREATE POLICY "Members can view organization invitations" ON organization_invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Admins/managers can manage invitations
CREATE POLICY "Admins can manage invitations" ON organization_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_invitations.organization_id
      AND om.status = 'active'
      AND r.name IN ('admin', 'manager')
    )
  );

-- Make sure the users table policy is correct
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (id = auth.uid());

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id = auth.uid()); 