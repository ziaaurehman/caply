-- Complete Authentication & Organization System Migration
-- This migration creates the full system for user authentication, organizations, roles, and permissions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ROLES & PERMISSIONS SYSTEM
-- =====================================================

-- Roles table - defines system roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE, -- for system roles like superadmin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table - defines granular permissions
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  module VARCHAR(50) NOT NULL, -- e.g., 'timesheets', 'projects', 'invoices'
  action VARCHAR(50) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'approve'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- =====================================================
-- USERS SYSTEM
-- =====================================================

-- Users table - extends Supabase auth.users
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(50),
  position VARCHAR(100),
  is_super_admin BOOLEAN DEFAULT FALSE, -- global platform admin
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ORGANIZATIONS SYSTEM
-- =====================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Canada',
  timezone VARCHAR(100) DEFAULT 'America/Toronto',
  currency VARCHAR(10) DEFAULT 'CAD',
  
  -- Business settings
  business_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00", "days": [1,2,3,4,5]}',
  tax_settings JSONB DEFAULT '{"tps": 0.05, "tvp": 0.00, "tvh": 0.00}',
  
  -- Subscription and billing
  subscription_plan VARCHAR(50) DEFAULT 'free', -- free, pro, premium, enterprise
  subscription_status VARCHAR(50) DEFAULT 'active',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Ownership
  owner_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
  
  -- Member specific settings
  hourly_rate DECIMAL(10,2),
  weekly_capacity INTEGER DEFAULT 40, -- hours per week
  department VARCHAR(100),
  hire_date DATE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, pending
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

-- Organization invitations table
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
  
  -- Invitation details
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT,
  
  -- Status and timing
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, expired
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, email)
);

-- =====================================================
-- BUSINESS MODULES
-- =====================================================

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  contact_person VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, inactive
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  
  -- Project type and billing
  project_type VARCHAR(50) DEFAULT 'time_materials', -- time_materials, fixed_fee, non_billable
  billing_rate DECIMAL(10,2),
  budget_hours INTEGER,
  budget_amount DECIMAL(12,2),
  
  -- Dates and status
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- active, on_hold, completed, cancelled
  
  -- Settings
  time_tracking_enabled BOOLEAN DEFAULT TRUE,
  visibility VARCHAR(50) DEFAULT 'team', -- admin_only, team, organization
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Task management
  status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, review, completed, blocked
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, urgent
  
  -- Assignment and time
  assigned_to UUID REFERENCES users(id),
  estimated_hours DECIMAL(8,2),
  actual_hours DECIMAL(8,2) DEFAULT 0,
  due_date DATE,
  
  -- Position for kanban
  position INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- Time tracking
  description TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL,
  date DATE NOT NULL,
  
  -- Billing
  is_billable BOOLEAN DEFAULT TRUE,
  hourly_rate DECIMAL(10,2),
  
  -- Approval workflow
  status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, approved, rejected
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Expense details
  category VARCHAR(100) NOT NULL, -- software, travel, office, equipment, other
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'CAD',
  date DATE NOT NULL,
  
  -- Documentation
  receipt_url TEXT,
  receipt_filename VARCHAR(255),
  
  -- Approval workflow
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Invoice details
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Financial details
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'CAD',
  
  -- Dates and status
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  paid_date DATE,
  
  -- Additional info
  po_number VARCHAR(100),
  notes TEXT,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice line items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Estimate details
  estimate_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Financial details
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'CAD',
  
  -- Dates and status
  issue_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, accepted, declined, expired
  accepted_date DATE,
  
  -- Additional info
  po_number VARCHAR(100),
  notes TEXT,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estimate line items table
CREATE TABLE IF NOT EXISTS estimate_line_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Leave details
  type VARCHAR(50) NOT NULL, -- vacation, sick, personal, training, unpaid
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested DECIMAL(4,1) NOT NULL,
  reason TEXT,
  
  -- Approval workflow
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);

-- Organization members indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role_id);

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Time entries indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- =====================================================
-- INSERT SYSTEM ROLES & PERMISSIONS
-- =====================================================

-- Insert system roles
INSERT INTO roles (id, name, display_name, description, is_system_role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'superadmin', 'Super Administrator', 'Platform super administrator with global access', true),
  ('a0000000-0000-0000-0000-000000000002', 'support_admin', 'Support Administrator', 'Customer support with limited cross-organization access', true),
  ('a0000000-0000-0000-0000-000000000003', 'admin', 'Organization Administrator', 'Full control over organization', false),
  ('a0000000-0000-0000-0000-000000000004', 'manager', 'Manager', 'Project and team management', false),
  ('a0000000-0000-0000-0000-000000000005', 'member', 'Team Member', 'Basic team member access', false)
ON CONFLICT (name) DO NOTHING;

-- Insert permissions
INSERT INTO permissions (name, display_name, description, module, action) VALUES
  -- User management
  ('users.create', 'Create Users', 'Can create new users', 'users', 'create'),
  ('users.read', 'View Users', 'Can view user information', 'users', 'read'),
  ('users.update', 'Update Users', 'Can update user information', 'users', 'update'),
  ('users.delete', 'Delete Users', 'Can delete users', 'users', 'delete'),
  ('users.global_read', 'View All Users', 'Can view users across all organizations', 'users', 'global_read'),
  
  -- Organization management
  ('organizations.create', 'Create Organizations', 'Can create organizations', 'organizations', 'create'),
  ('organizations.read', 'View Organizations', 'Can view organization information', 'organizations', 'read'),
  ('organizations.update', 'Update Organizations', 'Can update organization settings', 'organizations', 'update'),
  ('organizations.delete', 'Delete Organizations', 'Can delete organizations', 'organizations', 'delete'),
  ('organizations.global_read', 'View All Organizations', 'Can view all organizations for support', 'organizations', 'global_read'),
  ('organizations.support_access', 'Support Access', 'Can access organizations for customer support', 'organizations', 'support_access'),
  
  -- Project management
  ('projects.create', 'Create Projects', 'Can create new projects', 'projects', 'create'),
  ('projects.read', 'View Projects', 'Can view project information', 'projects', 'read'),
  ('projects.update', 'Update Projects', 'Can update project details', 'projects', 'update'),
  ('projects.delete', 'Delete Projects', 'Can delete projects', 'projects', 'delete'),
  
  -- Task management
  ('tasks.create', 'Create Tasks', 'Can create new tasks', 'tasks', 'create'),
  ('tasks.read', 'View Tasks', 'Can view tasks', 'tasks', 'read'),
  ('tasks.update', 'Update Tasks', 'Can update task details', 'tasks', 'update'),
  ('tasks.delete', 'Delete Tasks', 'Can delete tasks', 'tasks', 'delete'),
  
  -- Time tracking
  ('time_entries.create', 'Log Time', 'Can create time entries', 'time_entries', 'create'),
  ('time_entries.read', 'View Time Entries', 'Can view time entries', 'time_entries', 'read'),
  ('time_entries.update', 'Update Time Entries', 'Can update time entries', 'time_entries', 'update'),
  ('time_entries.delete', 'Delete Time Entries', 'Can delete time entries', 'time_entries', 'delete'),
  ('time_entries.approve', 'Approve Time Entries', 'Can approve/reject time entries', 'time_entries', 'approve'),
  
  -- Client management
  ('clients.create', 'Create Clients', 'Can create new clients', 'clients', 'create'),
  ('clients.read', 'View Clients', 'Can view client information', 'clients', 'read'),
  ('clients.update', 'Update Clients', 'Can update client details', 'clients', 'update'),
  ('clients.delete', 'Delete Clients', 'Can delete clients', 'clients', 'delete'),
  
  -- Invoice management
  ('invoices.create', 'Create Invoices', 'Can create invoices', 'invoices', 'create'),
  ('invoices.read', 'View Invoices', 'Can view invoices', 'invoices', 'read'),
  ('invoices.update', 'Update Invoices', 'Can update invoices', 'invoices', 'update'),
  ('invoices.delete', 'Delete Invoices', 'Can delete invoices', 'invoices', 'delete'),
  ('invoices.send', 'Send Invoices', 'Can send invoices to clients', 'invoices', 'send'),
  
  -- Estimate management
  ('estimates.create', 'Create Estimates', 'Can create estimates', 'estimates', 'create'),
  ('estimates.read', 'View Estimates', 'Can view estimates', 'estimates', 'read'),
  ('estimates.update', 'Update Estimates', 'Can update estimates', 'estimates', 'update'),
  ('estimates.delete', 'Delete Estimates', 'Can delete estimates', 'estimates', 'delete'),
  ('estimates.send', 'Send Estimates', 'Can send estimates to clients', 'estimates', 'send'),
  
  -- Expense management
  ('expenses.create', 'Create Expenses', 'Can create expense entries', 'expenses', 'create'),
  ('expenses.read', 'View Expenses', 'Can view expenses', 'expenses', 'read'),
  ('expenses.update', 'Update Expenses', 'Can update expenses', 'expenses', 'update'),
  ('expenses.delete', 'Delete Expenses', 'Can delete expenses', 'expenses', 'delete'),
  ('expenses.approve', 'Approve Expenses', 'Can approve/reject expenses', 'expenses', 'approve'),
  
  -- Leave management
  ('leave_requests.create', 'Request Leave', 'Can create leave requests', 'leave_requests', 'create'),
  ('leave_requests.read', 'View Leave Requests', 'Can view leave requests', 'leave_requests', 'read'),
  ('leave_requests.update', 'Update Leave Requests', 'Can update leave requests', 'leave_requests', 'update'),
  ('leave_requests.delete', 'Delete Leave Requests', 'Can delete leave requests', 'leave_requests', 'delete'),
  ('leave_requests.approve', 'Approve Leave', 'Can approve/reject leave requests', 'leave_requests', 'approve'),
  
  -- Reports and analytics
  ('reports.read', 'View Reports', 'Can access reports and analytics', 'reports', 'read'),
  ('reports.export', 'Export Reports', 'Can export report data', 'reports', 'export'),
  
  -- Settings and configuration
  ('settings.read', 'View Settings', 'Can view system settings', 'settings', 'read'),
  ('settings.update', 'Update Settings', 'Can update system settings', 'settings', 'update'),
  
  -- Support and platform management
  ('support.access_logs', 'Access Support Logs', 'Can view platform activity logs', 'support', 'access_logs'),
  ('support.view_tickets', 'View Support Tickets', 'Can view and respond to support tickets', 'support', 'view_tickets'),
  ('support.access_analytics', 'Access Platform Analytics', 'Can view platform usage analytics', 'support', 'access_analytics'),
  ('platform.manage_subscriptions', 'Manage Subscriptions', 'Can manage customer subscriptions', 'platform', 'manage_subscriptions'),
  ('platform.global_settings', 'Manage Platform Settings', 'Can update global platform settings', 'platform', 'global_settings')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Super Admin - all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT DO NOTHING;

-- Support Admin - limited cross-organization access for customer support
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000002', id FROM permissions 
WHERE name IN (
  'users.global_read', 'organizations.global_read', 'organizations.support_access',
  'projects.read', 'time_entries.read', 'invoices.read', 'estimates.read',
  'expenses.read', 'reports.read', 'support.access_logs', 'support.view_tickets',
  'support.access_analytics'
)
ON CONFLICT DO NOTHING;

-- Organization Admin - all except global organization management
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000003', id FROM permissions 
WHERE name NOT IN ('organizations.create', 'organizations.delete', 'organizations.global_read', 'organizations.support_access', 'users.global_read', 'support.access_logs', 'support.view_tickets', 'support.access_analytics', 'platform.manage_subscriptions', 'platform.global_settings')
ON CONFLICT DO NOTHING;

-- Manager - project management, approvals, team oversight
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000004', id FROM permissions 
WHERE name IN (
  'users.read', 'projects.create', 'projects.read', 'projects.update', 'projects.delete',
  'tasks.create', 'tasks.read', 'tasks.update', 'tasks.delete',
  'time_entries.read', 'time_entries.approve', 'clients.read', 'clients.create', 'clients.update',
  'invoices.create', 'invoices.read', 'invoices.update', 'invoices.send',
  'estimates.create', 'estimates.read', 'estimates.update', 'estimates.send',
  'expenses.read', 'expenses.approve', 'leave_requests.read', 'leave_requests.approve',
  'reports.read', 'reports.export', 'settings.read'
)
ON CONFLICT DO NOTHING;

-- Team Member - basic operational access
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000005', id FROM permissions 
WHERE name IN (
  'projects.read', 'tasks.read', 'tasks.update', 'time_entries.create', 
  'time_entries.read', 'time_entries.update', 'clients.read',
  'invoices.read', 'estimates.read', 'expenses.create', 'expenses.read',
  'leave_requests.create', 'leave_requests.read', 'leave_requests.update'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to handle new user signup
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

  -- Get admin role ID
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';

  -- Add user as admin member of their organization
  INSERT INTO organization_members (organization_id, user_id, role_id, status)
  VALUES (org_id, NEW.id, admin_role_id, 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_invitations_updated_at BEFORE UPDATE ON organization_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Support admins can view all users (global access)
CREATE POLICY "Support admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
      AND r.name = 'support_admin'
      AND om.status = 'active'
    )
  );

-- Organizations policies
CREATE POLICY "Organization members can view their organization" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners can update their organization" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

-- Support admins can view all organizations (global access)
CREATE POLICY "Support admins can view all organizations" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
      AND r.name = 'support_admin'
      AND om.status = 'active'
    )
  );

-- Organization members policies
CREATE POLICY "Members can view organization members" ON organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
    )
  );

-- Support admins can view all organization members
CREATE POLICY "Support admins can view all organization members" ON organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
      AND r.name = 'support_admin'
      AND om.status = 'active'
    )
  );

-- Projects policies
CREATE POLICY "Organization members can view projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = projects.organization_id 
      AND user_id = auth.uid()
    )
  );

-- Support admins can view all projects
CREATE POLICY "Support admins can view all projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
      AND r.name = 'support_admin'
      AND om.status = 'active'
    )
  );

-- Time entries policies
CREATE POLICY "Users can view their own time entries" ON time_entries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own time entries" ON time_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time entries" ON time_entries
  FOR UPDATE USING (user_id = auth.uid());

-- Support admins can view all time entries
CREATE POLICY "Support admins can view all time entries" ON time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
      AND r.name = 'support_admin'
      AND om.status = 'active'
    )
  );

-- Similar policies for other tables (invoices, estimates, expenses, etc.)
-- Support admins can view all invoices
CREATE POLICY "Support admins can view all invoices" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
      AND r.name = 'support_admin'
      AND om.status = 'active'
    )
  );

-- Support admins can view all estimates
CREATE POLICY "Support admins can view all estimates" ON estimates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
      AND r.name = 'support_admin'
      AND om.status = 'active'
    )
  );

-- Support admins can view all expenses
CREATE POLICY "Support admins can view all expenses" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = auth.uid()
      AND r.name = 'support_admin'
      AND om.status = 'active'
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(user_id UUID, permission_name TEXT, org_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN DEFAULT FALSE;
  user_role_name TEXT;
BEGIN
  -- Check if user is super admin
  SELECT is_super_admin INTO has_permission FROM users WHERE id = user_id;
  IF has_permission THEN
    RETURN TRUE;
  END IF;

  -- Get user's role name from any organization (for support admin check)
  SELECT r.name INTO user_role_name
  FROM organization_members om
  JOIN roles r ON om.role_id = r.id
  WHERE om.user_id = user_id 
  AND om.status = 'active'
  AND r.is_system_role = true
  LIMIT 1;

  -- Check if user is support admin (has global permissions)
  IF user_role_name = 'support_admin' THEN
    SELECT EXISTS(
      SELECT 1 FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN roles r ON rp.role_id = r.id
      WHERE r.name = 'support_admin'
      AND p.name = permission_name
    ) INTO has_permission;
    
    IF has_permission THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Check organization-specific permissions
  IF org_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 
      FROM organization_members om
      JOIN roles r ON om.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE om.user_id = user_id 
      AND om.organization_id = org_id
      AND om.status = 'active'
      AND p.name = permission_name
    ) INTO has_permission;
  END IF;

  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is support admin
CREATE OR REPLACE FUNCTION user_is_support_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_support_admin BOOLEAN DEFAULT FALSE;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM organization_members om
    JOIN roles r ON om.role_id = r.id
    WHERE om.user_id = user_id 
    AND r.name = 'support_admin'
    AND om.status = 'active'
  ) INTO is_support_admin;

  RETURN is_support_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all organizations for support admin
CREATE OR REPLACE FUNCTION get_support_admin_organizations(user_id UUID)
RETURNS TABLE(org_id UUID, org_name TEXT, org_slug TEXT) AS $$
BEGIN
  -- Check if user is support admin
  IF NOT user_is_support_admin(user_id) THEN
    RETURN;
  END IF;

  -- Return all organizations for support admin
  RETURN QUERY
  SELECT o.id, o.name, o.slug
  FROM organizations o
  ORDER BY o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(user_id UUID)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM organization_members
  WHERE user_id = get_user_organization.user_id
  AND status = 'active'
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 