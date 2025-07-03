import { createClient } from '@/utils/supabase/server'

/**
 * Check if this is the first user in the system and grant admin access
 */
export async function setupFirstUserAsAdmin(userId: string, email: string): Promise<boolean> {
  const supabase = await createClient()
  
  try {
    // Check if there are any existing users in the profiles table
    const { data: existingUsers, error: countError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (countError) {
      console.error('Error checking existing users:', countError)
      return false
    }
    
    // If no existing users, this is the first user - make them admin
    if (!existingUsers || existingUsers.length === 0) {
      console.log('First user detected, granting admin access to:', email)
      
      // Update user metadata to admin role
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          role: 'admin',
          is_first_admin: true,
          setup_completed_at: new Date().toISOString()
        }
      })
      
      if (updateError) {
        console.error('Error setting admin role:', updateError)
        return false
      }
      
      // Create profile entry
      await createUserProfile(userId, email, 'admin', true)
      
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error in setupFirstUserAsAdmin:', error)
    return false
  }
}

/**
 * Create user profile in the database
 */
export async function createUserProfile(
  userId: string, 
  email: string, 
  role: string = 'employee',
  isFirstAdmin: boolean = false
): Promise<boolean> {
  const supabase = await createClient()
  
  try {
    // Use the default organization UUID from migrations
    const defaultOrgId = '00000000-0000-0000-0000-000000000000'
    
    // Ensure the default organization exists (should be created by migrations)
    const { data: orgExists } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', defaultOrgId)
      .single()
    
    if (!orgExists) {
      console.error('Default organization not found. Please run migrations first.')
      return false
    }
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        role_id: role,
        organization_id: defaultOrgId,
        is_active: true
      })
    
    if (profileError) {
      console.error('Error creating user profile:', profileError)
      return false
    }
    
    console.log('User profile created successfully for:', email)
    return true
  } catch (error) {
    console.error('Error in createUserProfile:', error)
    return false
  }
}

/**
 * Assign role to existing user (for invitations or role changes)
 */
export async function assignUserRole(userId: string, roleId: string): Promise<boolean> {
  const supabase = await createClient()
  
  try {
    // Update user metadata
    const { error: metadataError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role: roleId }
    })
    
    if (metadataError) {
      console.error('Error updating user metadata:', metadataError)
      return false
    }
    
    // Update profile table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        role_id: roleId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (profileError) {
      console.error('Error updating user profile:', profileError)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error in assignUserRole:', error)
    return false
  }
}

/**
 * Handle signup completion with role assignment using database functions
 */
export async function handleSignupComplete(
  userId: string, 
  email: string, 
  name?: string,
  invitationToken?: string
): Promise<{ success: boolean; role: string; isFirstAdmin: boolean }> {
  const supabase = await createClient()
  
  try {
    // Use database function to handle invitation acceptance and profile creation
    const { data: result, error } = await supabase.rpc('accept_invitation', {
      user_id: userId,
      user_email: email,
      user_name: name || null,
      invitation_token: invitationToken || null
    })
    
    if (error) {
      console.error('Error in accept_invitation function:', error)
      return { success: false, role: 'employee', isFirstAdmin: false }
    }
    
    if (!result) {
      console.error('No result from accept_invitation function')
      return { success: false, role: 'employee', isFirstAdmin: false }
    }
    
    const assignedRole = result.role_id || 'employee'
    const isFirstAdmin = result.is_first_admin || false
    
    // Update user metadata with profile information
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { 
        name: name || result.name,
        role: assignedRole,
        is_first_admin: isFirstAdmin,
        organization_id: result.organization_id
      }
    })
    
    console.log('User setup complete:', {
      userId,
      email,
      role: assignedRole,
      isFirstAdmin,
      organizationId: result.organization_id
    })
    
    return { success: true, role: assignedRole, isFirstAdmin }
  } catch (error) {
    console.error('Error in handleSignupComplete:', error)
    return { success: false, role: 'employee', isFirstAdmin: false }
  }
} 