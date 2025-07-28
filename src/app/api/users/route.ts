import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/utils/rbac/middleware'
import { useRBACStore } from '@/utils/api/rbac-store'

// GET /api/users - List users (requires users.read permission)
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      // In a real app, this would query your database
      const rbacStore = useRBACStore.getState()
      await rbacStore.fetchUsers()
      
      return NextResponse.json({
        success: true,
        data: rbacStore.users,
        message: 'Users retrieved successfully'
      })
    } catch (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      )
    }
  },
  { permission: { resource: 'users', action: 'read' } }
)

// POST /api/users - Create user (requires users.create permission)
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json()
      const { name, email, roleId } = body

      if (!name || !email || !roleId) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // In a real app, this would create the user in your database
      const rbacStore = useRBACStore.getState()
      
      // Mock user creation - in production, integrate with Supabase
      const newUser = {
        id: `user_${Date.now()}`,
        name,
        email,
        roleId,
        role: rbacStore.roles.find(r => r.id === roleId)!,
        organizationId: 'demo-org',
        organization: rbacStore.organizations[0],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Add to store (in production, save to database)
      rbacStore.users.push(newUser)

      return NextResponse.json({
        success: true,
        data: newUser,
        message: 'User created successfully'
      }, { status: 201 })
    } catch (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      )
    }
  },
  { permission: { resource: 'users', action: 'create' } }
)

// PATCH /api/users - Update user role (requires users.update permission)
export const PATCH = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json()
      const { userId, roleId } = body

      if (!userId || !roleId) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // In a real app, this would update the user in your database
      const rbacStore = useRBACStore.getState()
      await rbacStore.updateUserRole(userId, roleId)

      return NextResponse.json({
        success: true,
        message: 'User role updated successfully'
      })
    } catch (error) {
      console.error('Error updating user role:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update user role' },
        { status: 500 }
      )
    }
  },
  { permission: { resource: 'users', action: 'update' } }
)

// DELETE /api/users/[id] - Deactivate user (requires users.delete permission)
export const DELETE = withAuth(
  async (req: NextRequest) => {
    try {
      const url = new URL(req.url)
      const userId = url.searchParams.get('id')

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'User ID is required' },
          { status: 400 }
        )
      }

      // In a real app, this would deactivate the user in your database
      const rbacStore = useRBACStore.getState()
      await rbacStore.deactivateUser(userId)

      return NextResponse.json({
        success: true,
        message: 'User deactivated successfully'
      })
    } catch (error) {
      console.error('Error deactivating user:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to deactivate user' },
        { status: 500 }
      )
    }
  },
  { permission: { resource: 'users', action: 'delete' } }
) 