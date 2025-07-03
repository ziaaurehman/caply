import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'

// POST /api/setup - Initialize roles and permissions (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Check if user is a super admin or organization owner
    const { data: userData } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', session.user.id)
      .single()

    if (!userData?.is_super_admin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Define roles
    const roles = [
      {
        name: 'admin',
        display_name: 'Administrator',
        description: 'Full access to all organization features and settings',
        is_system_role: false
      },
      {
        name: 'manager',
        display_name: 'Manager',
        description: 'Can manage projects, team members, and view reports',
        is_system_role: false
      },
      {
        name: 'member',
        display_name: 'Team Member',
        description: 'Can track time, submit expenses, and work on assigned projects',
        is_system_role: false
      },
      {
        name: 'guest',
        display_name: 'Guest',
        description: 'Limited access to assigned projects only',
        is_system_role: false
      }
    ]

    // Define permissions
    const permissions = [
      // User Management
      { name: 'users.create', display_name: 'Create Users', description: 'Invite new team members', module: 'users', action: 'create' },
      { name: 'users.read', display_name: 'View Users', description: 'View team member profiles', module: 'users', action: 'read' },
      { name: 'users.update', display_name: 'Update Users', description: 'Edit team member details', module: 'users', action: 'update' },
      { name: 'users.delete', display_name: 'Delete Users', description: 'Remove team members', module: 'users', action: 'delete' },
      
      // Projects
      { name: 'projects.create', display_name: 'Create Projects', description: 'Create new projects', module: 'projects', action: 'create' },
      { name: 'projects.read', display_name: 'View Projects', description: 'View project details', module: 'projects', action: 'read' },
      { name: 'projects.update', display_name: 'Update Projects', description: 'Edit project settings', module: 'projects', action: 'update' },
      { name: 'projects.delete', display_name: 'Delete Projects', description: 'Archive or delete projects', module: 'projects', action: 'delete' },
      
      // Time Tracking
      { name: 'timesheets.create', display_name: 'Track Time', description: 'Log time entries', module: 'timesheets', action: 'create' },
      { name: 'timesheets.read', display_name: 'View Timesheets', description: 'View time entries', module: 'timesheets', action: 'read' },
      { name: 'timesheets.update', display_name: 'Edit Timesheets', description: 'Edit time entries', module: 'timesheets', action: 'update' },
      { name: 'timesheets.approve', display_name: 'Approve Timesheets', description: 'Approve submitted timesheets', module: 'timesheets', action: 'approve' },
      
      // Expenses
      { name: 'expenses.create', display_name: 'Submit Expenses', description: 'Submit expense reports', module: 'expenses', action: 'create' },
      { name: 'expenses.read', display_name: 'View Expenses', description: 'View expense reports', module: 'expenses', action: 'read' },
      { name: 'expenses.update', display_name: 'Edit Expenses', description: 'Edit expense reports', module: 'expenses', action: 'update' },
      { name: 'expenses.approve', display_name: 'Approve Expenses', description: 'Approve expense reports', module: 'expenses', action: 'approve' },
      
      // Invoicing
      { name: 'invoices.create', display_name: 'Create Invoices', description: 'Generate invoices', module: 'invoices', action: 'create' },
      { name: 'invoices.read', display_name: 'View Invoices', description: 'View invoices', module: 'invoices', action: 'read' },
      { name: 'invoices.update', display_name: 'Edit Invoices', description: 'Edit invoice details', module: 'invoices', action: 'update' },
      { name: 'invoices.send', display_name: 'Send Invoices', description: 'Send invoices to clients', module: 'invoices', action: 'send' },
      
      // Reports
      { name: 'reports.view', display_name: 'View Reports', description: 'Access reporting dashboard', module: 'reports', action: 'read' },
      { name: 'reports.export', display_name: 'Export Reports', description: 'Export report data', module: 'reports', action: 'export' },
      
      // Settings
      { name: 'settings.view', display_name: 'View Settings', description: 'Access organization settings', module: 'settings', action: 'read' },
      { name: 'settings.update', display_name: 'Update Settings', description: 'Modify organization settings', module: 'settings', action: 'update' },
    ]

    // Insert roles (ignore conflicts)
    const { data: insertedRoles, error: rolesError } = await supabase
      .from('roles')
      .upsert(roles, { onConflict: 'name' })
      .select()

    if (rolesError) {
      console.error('Error inserting roles:', rolesError)
      return NextResponse.json({ error: 'Failed to create roles' }, { status: 500 })
    }

    // Insert permissions (ignore conflicts)
    const { data: insertedPermissions, error: permissionsError } = await supabase
      .from('permissions')
      .upsert(permissions, { onConflict: 'name' })
      .select()

    if (permissionsError) {
      console.error('Error inserting permissions:', permissionsError)
      return NextResponse.json({ error: 'Failed to create permissions' }, { status: 500 })
    }

    // Define role-permission mappings
    const rolePermissions = [
      // Admin - full access
      ...insertedPermissions.map(p => ({ 
        role_id: insertedRoles.find(r => r.name === 'admin')?.id, 
        permission_id: p.id 
      })),
      
      // Manager - most permissions except sensitive settings
      ...insertedPermissions
        .filter(p => !['settings.update', 'users.delete'].includes(p.name))
        .map(p => ({ 
          role_id: insertedRoles.find(r => r.name === 'manager')?.id, 
          permission_id: p.id 
        })),
      
      // Member - basic permissions
      ...insertedPermissions
        .filter(p => [
          'projects.read', 'timesheets.create', 'timesheets.read', 'timesheets.update',
          'expenses.create', 'expenses.read', 'expenses.update', 'users.read'
        ].includes(p.name))
        .map(p => ({ 
          role_id: insertedRoles.find(r => r.name === 'member')?.id, 
          permission_id: p.id 
        })),
      
      // Guest - minimal permissions
      ...insertedPermissions
        .filter(p => ['projects.read', 'timesheets.read'].includes(p.name))
        .map(p => ({ 
          role_id: insertedRoles.find(r => r.name === 'guest')?.id, 
          permission_id: p.id 
        }))
    ].filter(rp => rp.role_id && rp.permission_id)

    // Insert role-permission mappings
    const { error: rolePermError } = await supabase
      .from('role_permissions')
      .upsert(rolePermissions, { onConflict: 'role_id,permission_id' })

    if (rolePermError) {
      console.error('Error inserting role permissions:', rolePermError)
      return NextResponse.json({ error: 'Failed to assign permissions to roles' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Roles and permissions initialized successfully',
      data: {
        roles: insertedRoles.length,
        permissions: insertedPermissions.length,
        rolePermissions: rolePermissions.length
      }
    })

  } catch (error) {
    console.error('Error in setup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 