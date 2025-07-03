-- Enable RLS on system tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Add policies for system tables (these are read-only for most operations)

-- Roles policies - anyone can read roles, only superusers can modify
CREATE POLICY "Anyone can read roles" ON roles
  FOR SELECT USING (true);

CREATE POLICY "Only superusers can modify roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_super_admin = true
    )
  );

-- Permissions policies - anyone can read permissions, only superusers can modify
CREATE POLICY "Anyone can read permissions" ON permissions
  FOR SELECT USING (true);

CREATE POLICY "Only superusers can modify permissions" ON permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_super_admin = true
    )
  );

-- Role permissions policies - anyone can read, only superusers can modify
CREATE POLICY "Anyone can read role permissions" ON role_permissions
  FOR SELECT USING (true);

CREATE POLICY "Only superusers can modify role permissions" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_super_admin = true
    )
  );

-- Update the trigger function to use SECURITY DEFINER properly
-- This allows the function to bypass RLS when inserting data
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  admin_role_id UUID;
BEGIN
  -- Insert user profile (bypass RLS with SECURITY DEFINER)
  INSERT INTO public.users (id, email, full_name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at IS NOT NULL
  );

  -- Create organization for new user (they become the owner)
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Organization',
    'org-' || LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), ' ', '-')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8),
    NEW.id
  ) RETURNING id INTO org_id;

  -- Get admin role ID (the organization administrator role, not superadmin)
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin' AND is_system_role = false;

  -- Fallback: if admin role not found, get the first non-system role
  IF admin_role_id IS NULL THEN
    SELECT id INTO admin_role_id FROM public.roles WHERE is_system_role = false ORDER BY created_at LIMIT 1;
  END IF;

  -- Add user as admin member of their organization
  IF admin_role_id IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role_id, status)
    VALUES (org_id, NEW.id, admin_role_id, 'active');
  ELSE
    RAISE EXCEPTION 'Could not find admin role for new user signup';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise with more details
    RAISE EXCEPTION 'Error in signup trigger: %', SQLERRM;
END;
$$ LANGUAGE plpgsql; 