import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') || request.headers.get('x-organization-id')
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: 'leave_requests',
      action: 'read'
    })

    if (!validation.success) {
      return NextResponse.json({
        error: validation.error,
      }, { status: validation.status })
    }

    const { context: userContext } = validation
    const supabase = await createClient()

    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .select(`
        id,
        organization_id,
        user_id,
        type,
        start_date,
        end_date,
        days_requested,
        reason,
        status,
        approved_by,
        approved_at,
        rejection_reason,
        created_at,
        updated_at,
        users:user_id ( id, full_name, email, avatar_url ),
        approver:approved_by ( id, full_name, email )
      `)
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      console.error('Error fetching leave request:', error)
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    return NextResponse.json({ leave_request: leaveRequest })
  } catch (error) {
    console.error('Leave request GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') || request.headers.get('x-organization-id')
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: 'leave_requests',
      action: 'update'
    })

    if (!validation.success) {
      return NextResponse.json({
        error: validation.error,
      }, { status: validation.status })
    }

    const { context: userContext } = validation
    const supabase = await createClient()

    const body = await request.json()
    const { leave_type, start_date, end_date, reason } = body

    // Check if user owns this request or has permission to edit
    const { data: existingRequest } = await supabase
      .from('leave_requests')
      .select('user_id, status')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single()

    if (!existingRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Check permissions - users can only edit their own requests
    if (!userContext || existingRequest.user_id !== userContext.userId) {
      return NextResponse.json({ error: 'You can only edit your own leave requests' }, { status: 403 })
    }

    // Only allow editing if status is pending
    if (existingRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Cannot edit non-pending requests' }, { status: 400 })
    }

    // Calculate total days if dates are provided
    let totalDays = undefined
    if (start_date && end_date) {
      const start = new Date(start_date)
      const end = new Date(end_date)
      const timeDiff = end.getTime() - start.getTime()
      totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1
    }

    const updateData: any = {}
    if (leave_type) updateData.type = leave_type
    if (start_date) updateData.start_date = start_date
    if (end_date) updateData.end_date = end_date
    if (reason !== undefined) updateData.reason = reason
    if (totalDays !== undefined) updateData.days_requested = totalDays

    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .select(`
        id,
        organization_id,
        user_id,
        type,
        start_date,
        end_date,
        days_requested,
        reason,
        status,
        approved_by,
        approved_at,
        rejection_reason,
        created_at,
        updated_at,
        users:user_id ( id, full_name, email, avatar_url ),
        approver:approved_by ( id, full_name, email )
      `)
      .single()

    if (error) {
      console.error('Error updating leave request:', error)
      return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 })
    }

    return NextResponse.json({ leave_request: leaveRequest })
  } catch (error) {
    console.error('Leave request PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') || request.headers.get('x-organization-id')
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Validate organization access and permissions
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: 'leave_requests',
      action: 'delete'
    })

    if (!validation.success) {
      return NextResponse.json({
        error: validation.error,
      }, { status: validation.status })
    }

    const { context: userContext } = validation
    const supabase = await createClient()

    // Check if user owns this request or has permission to delete
    const { data: existingRequest } = await supabase
      .from('leave_requests')
      .select('user_id, status')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single()

    if (!existingRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Check permissions - users can only delete their own requests
    if (!userContext || existingRequest.user_id !== userContext.userId) {
      return NextResponse.json({ error: 'You can only delete your own leave requests' }, { status: 403 })
    }

    // Only allow deleting if status is pending
    if (existingRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Cannot delete non-pending requests' }, { status: 400 })
    }

    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error deleting leave request:', error)
      return NextResponse.json({ error: 'Failed to delete leave request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Leave request DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
