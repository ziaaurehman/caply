-- Fix RLS policies for system tables (roles, permissions, etc.)
-- These tables should be readable by all authenticated users since they contain system configuration

-- Fix roles table RLS
DROP POLICY IF EXISTS "Anyone can read roles" ON roles;
DROP POLICY IF EXISTS "Only superusers can modify roles" ON roles;

-- Disable RLS on roles table since it's system configuration that needs to be readable
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- Fix permissions table RLS  
DROP POLICY IF EXISTS "Anyone can read permissions" ON permissions;
DROP POLICY IF EXISTS "Only superusers can modify permissions" ON permissions;

-- Disable RLS on permissions table since it's system configuration
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;

-- Fix role_permissions table RLS
DROP POLICY IF EXISTS "Anyone can read role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Only superusers can modify role permissions" ON role_permissions;

-- Disable RLS on role_permissions table since it's system configuration
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;

-- Fix organizations table RLS policies to avoid recursion
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can manage their organizations" ON organizations;

-- Create simple policies for organizations
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

CREATE POLICY "Organization owners can manage their organizations" ON organizations
  FOR ALL USING (owner_id = auth.uid());

-- Super admins can view/manage all organizations
CREATE POLICY "Super admins can manage all organizations" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_super_admin = true
    )
  ); 