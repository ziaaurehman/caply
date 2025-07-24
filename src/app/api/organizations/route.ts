import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'

// GET /api/organizations - Get user's organizations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user's organizations
    const { data: organizations, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        status,
        organizations!inner(
          id,
          name,
          slug,
          description,
          logo_url,
          owner_id,
          created_at
        )
      `)
      .eq('user_id', session.user.id)
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    const transformedOrganizations = organizations?.map((org: any) => ({
      id: org.organizations.id,
      name: org.organizations.name,
      slug: org.organizations.slug,
      description: org.organizations.description,
      logo_url: org.organizations.logo_url,
      is_owner: org.organizations.owner_id === session.user.id,
      created_at: org.organizations.created_at,
      membership_status: org.status
    }))

    return NextResponse.json({ organizations: transformedOrganizations })

  } catch (error) {
    console.error('Error in organizations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/organizations - Create a new organization
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ 
        error: 'Organization name is required' 
      }, { status: 400 })
    }

    // Create a slug from the name
    const slug = 'org-' + name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Math.random().toString(36).substr(2, 8)

    // Create the organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        description: description || null,
        owner_id: session.user.id
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // Get the admin role for this organization (created by trigger)
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .eq('organization_id', organization.id)
      .eq('is_system_role', false)
      .single()

    if (roleError || !adminRole) {
      console.error('Error finding admin role:', roleError)
      return NextResponse.json({ error: 'Failed to set up organization roles' }, { status: 500 })
    }

    // Add the creator as an admin member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: session.user.id,
        role_id: adminRole.id,
        status: 'active'
      })

    if (memberError) {
      console.error('Error adding organization member:', memberError)
      return NextResponse.json({ error: 'Failed to add user to organization' }, { status: 500 })
    }

    return NextResponse.json({ 
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description,
        is_owner: true,
        created_at: organization.created_at
      },
      message: 'Organization created successfully' 
    })

  } catch (error) {
    console.error('Error in POST organizations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
