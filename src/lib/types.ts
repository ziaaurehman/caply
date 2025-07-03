// COMPREHENSIVE CAPLY TYPES - ORGANIZATION-BASED WITH RBAC

// =====================================================
// AUTHENTICATION & USER TYPES
// =====================================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  position?: string;
  is_super_admin: boolean;
  is_active: boolean;
  email_verified: boolean;
  last_sign_in_at?: string;
  created_at: string;
  updated_at: string;
  timezone?: string;
  language?: string;
  
  // Relations
  organization_memberships?: OrganizationMember[];
  current_organization?: Organization;
  current_role?: Role;
}

export interface AuthUser extends User {
  // Extended auth properties can go here
}

// =====================================================
// ROLES & PERMISSIONS SYSTEM
// =====================================================

// RBAC Types
export type UserRole = 'superadmin' | 'support_admin' | 'admin' | 'manager' | 'member';

export type PermissionName = 
  // User management
  | 'users.create' | 'users.read' | 'users.update' | 'users.delete' | 'users.global_read'
  // Organization management  
  | 'organizations.create' | 'organizations.read' | 'organizations.update' | 'organizations.delete'
  | 'organizations.global_read' | 'organizations.support_access'
  // Project management
  | 'projects.create' | 'projects.read' | 'projects.update' | 'projects.delete'
  // Task management
  | 'tasks.create' | 'tasks.read' | 'tasks.update' | 'tasks.delete'
  // Time tracking
  | 'time_entries.create' | 'time_entries.read' | 'time_entries.update' | 'time_entries.delete' | 'time_entries.approve'
  // Client management
  | 'clients.create' | 'clients.read' | 'clients.update' | 'clients.delete'
  // Invoice management
  | 'invoices.create' | 'invoices.read' | 'invoices.update' | 'invoices.delete' | 'invoices.send'
  // Estimate management
  | 'estimates.create' | 'estimates.read' | 'estimates.update' | 'estimates.delete' | 'estimates.send'
  // Expense management
  | 'expenses.create' | 'expenses.read' | 'expenses.update' | 'expenses.delete' | 'expenses.approve'
  // Leave management
  | 'leave_requests.create' | 'leave_requests.read' | 'leave_requests.update' | 'leave_requests.delete' | 'leave_requests.approve'
  // Reports and analytics
  | 'reports.read' | 'reports.export'
  // Settings and configuration
  | 'settings.read' | 'settings.update'
  // Support and platform management
  | 'support.access_logs' | 'support.view_tickets' | 'support.access_analytics'
  | 'platform.manage_subscriptions' | 'platform.global_settings';

export interface Permission {
  id: string;
  name: PermissionName;
  display_name: string;
  description: string;
  module: string;
  action: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: UserRole;
  display_name: string;
  description: string;
  is_system_role: boolean;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
  role?: Role;
  permission?: Permission;
}

// =====================================================
// ORGANIZATION SYSTEM
// =====================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country: string;
  timezone: string;
  currency: string;
  business_hours: {
    start: string;
    end: string;
    days: number[];
  };
  tax_settings: {
    tps: number;
    tvp: number;
    tvh: number;
  };
  subscription_plan: 'free' | 'pro' | 'premium' | 'enterprise';
  subscription_status: string;
  trial_ends_at?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  owner?: User;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: string;
  hourly_rate?: number;
  weekly_capacity: number;
  department?: string;
  hire_date?: string;
  status: 'active' | 'inactive' | 'pending';
  invited_by?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
  user?: User;
  organization?: Organization;
  role?: Role;
  inviter?: User;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role_id: string;
  token: string;
  invited_by?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  role?: Role;
  inviter?: User;
}

// =====================================================
// BUSINESS MODULES
// =====================================================

// Client Types
export interface Client {
  id: string;
  organization_id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  notes?: string;
  status: 'active' | 'inactive';
  created_by?: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  creator?: User;
}

// Project Types
export interface Project {
  id: string;
  organization_id: string;
  client_id?: string;
  name: string;
  code?: string;
  description?: string;
  project_type: 'time_materials' | 'fixed_fee' | 'non_billable';
  billing_rate?: number;
  budget_hours?: number;
  budget_amount?: number;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  time_tracking_enabled: boolean;
  visibility: 'admin_only' | 'team' | 'organization';
  created_by?: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  client?: Client;
  creator?: User;
}

// Task Types
export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours: number;
  due_date?: string;
  position: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  assignee?: User;
  creator?: User;
}

// Time Entry Types
export interface TimeEntry {
  id: string;
  organization_id: string;
  user_id: string;
  project_id: string;
  task_id?: string;
  description: string;
  start_time?: string;
  end_time?: string;
  duration_minutes: number;
  date: string;
  is_billable: boolean;
  hourly_rate?: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  user?: User;
  project?: Project;
  task?: Task;
  approver?: User;
}

// Expense Types
export interface Expense {
  id: string;
  organization_id: string;
  user_id: string;
  project_id?: string;
  client_id?: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  receipt_url?: string;
  receipt_filename?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  user?: User;
  project?: Project;
  client?: Client;
  approver?: User;
}

// Invoice Types
export interface Invoice {
  id: string;
  organization_id: string;
  client_id: string;
  project_id?: string;
  invoice_number: string;
  title: string;
  description?: string;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_date?: string;
  po_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  client?: Client;
  project?: Project;
  creator?: User;
  line_items?: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  position: number;
  created_at: string;
  invoice?: Invoice;
}

// Estimate Types
export interface Estimate {
  id: string;
  organization_id: string;
  client_id: string;
  project_id?: string;
  estimate_number: string;
  title: string;
  description?: string;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  issue_date: string;
  valid_until: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  accepted_date?: string;
  po_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  client?: Client;
  project?: Project;
  creator?: User;
  line_items?: EstimateLineItem[];
}

export interface EstimateLineItem {
  id: string;
  estimate_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  position: number;
  created_at: string;
  estimate?: Estimate;
}

// Leave Request Types
export interface LeaveRequest {
  id: string;
  organization_id: string;
  user_id: string;
  type: 'vacation' | 'sick' | 'personal' | 'training' | 'unpaid';
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  user?: User;
  approver?: User;
}

// =====================================================
// STORE TYPES
// =====================================================

export interface AuthStore {
  user: AuthUser | null;
  organization: Organization | null;
  organizationMembers: OrganizationMember[];
  userRole: Role | null;
  userPermissions: Permission[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: AuthUser | null) => void;
  setOrganization: (org: Organization | null) => void;
  setOrganizationMembers: (members: OrganizationMember[]) => void;
  setUserRole: (role: Role | null) => void;
  setUserPermissions: (permissions: Permission[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
  
  // Permission helpers
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (roleName: string) => boolean;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =====================================================
// FORM DATA INTERFACES
// =====================================================

export interface CreateOrganizationData {
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
}

export interface CreateProjectData {
  organization_id: string;
  client_id?: string;
  name: string;
  code?: string;
  description?: string;
  project_type: 'time_materials' | 'fixed_fee' | 'non_billable';
  billing_rate?: number;
  budget_hours?: number;
  budget_amount?: number;
  start_date?: string;
  end_date?: string;
  visibility?: 'admin_only' | 'team' | 'organization';
}

export interface CreateTaskData {
  project_id: string;
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  estimated_hours?: number;
  due_date?: string;
}

export interface CreateClientData {
  organization_id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  notes?: string;
}

export interface CreateTimeEntryData {
  organization_id: string;
  project_id: string;
  task_id?: string;
  description: string;
  duration_minutes: number;
  date: string;
  is_billable?: boolean;
  hourly_rate?: number;
}

export interface CreateExpenseData {
  organization_id: string;
  project_id?: string;
  client_id?: string;
  category: string;
  description: string;
  amount: number;
  currency?: string;
  date: string;
  receipt_url?: string;
  receipt_filename?: string;
}

export interface CreateInvitationData {
  organization_id: string;
  email: string;
  role_id: string;
  message?: string;
}

export interface CreateLeaveRequestData {
  organization_id: string;
  type: 'vacation' | 'sick' | 'personal' | 'training' | 'unpaid';
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
}

// =====================================================
// DASHBOARD & ANALYTICS TYPES
// =====================================================

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTimeLogged: number; // in minutes
  pendingApprovals: number;
  totalRevenue: number;
  totalExpenses: number;
  teamMembers: number;
  clientCount: number;
}

export interface TimeTrackingStats {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  approvedHours: number;
  pendingHours: number;
}

export interface ProjectStats {
  budgetedHours: number;
  actualHours: number;
  budgetedAmount: number;
  actualAmount: number;
  utilizationPercentage: number;
  completionPercentage: number;
}

// =====================================================
// COMPONENT PROPS TYPES
// =====================================================

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
}

export interface FilterOption {
  label: string;
  value: string | number;
}

export interface TableFilters {
  search?: string;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  [key: string]: any;
}

// =====================================================
// LEGACY COMPATIBILITY (DEPRECATED)
// =====================================================

/** @deprecated Use Organization instead */
export interface Workspace extends Organization {}

/** @deprecated Use OrganizationMember instead */
export interface WorkspaceMember extends OrganizationMember {}

/** @deprecated Use OrganizationInvitation instead */
export interface WorkspaceInvitation extends OrganizationInvitation {}
