import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { validateOrganizationAccessWithId } from '@/utils/organizationUtils'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [LEAVE API] GET /api/leave/requests - Starting request')
    
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') || request.headers.get('x-organization-id')
    console.log('🔍 [LEAVE API] Organization ID:', organizationId)
    
    if (!organizationId) {
      console.log('❌ [LEAVE API] No organization ID provided')
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Validate organization access and permissions
    console.log('🔍 [LEAVE API] Validating organization access...')
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: 'leave_requests',
      action: 'read'
    })

    console.log('🔍 [LEAVE API] Validation result:', {
      success: validation.success,
      error: validation.error,
      status: validation.status
    })

    if (!validation.success) {
      console.log('❌ [LEAVE API] Validation failed:', validation.error)
      return NextResponse.json({
        error: validation.error,
      }, { status: validation.status })
    }

    const { context: userContext } = validation
    console.log('🔍 [LEAVE API] User context:', {
      userId: userContext?.userId,
      organizationId: userContext?.organizationId
    })
    
    const supabase = await createClient()

    const userId = searchParams.get('user_id')
    const status = searchParams.get('status')
    const leaveType = searchParams.get('leave_type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log('🔍 [LEAVE API] Query parameters:', {
      userId, status, leaveType, startDate, endDate, page, limit
    })

    let query = supabase
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
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (leaveType) {
      query = query.eq('type', leaveType)
    }
    if (startDate) {
      query = query.gte('start_date', startDate)
    }
    if (endDate) {
      query = query.lte('end_date', endDate)
    }

    console.log('🔍 [LEAVE API] Executing database query...')
    const { data: leaveRequests, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)

    console.log('🔍 [LEAVE API] Database query result:', {
      hasData: !!leaveRequests,
      dataLength: leaveRequests?.length || 0,
      hasError: !!error,
      error: error?.message,
      count
    })

    if (error) {
      console.error('❌ [LEAVE API] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    console.log('✅ [LEAVE API] Successfully fetched leave requests:', {
      totalRequests: leaveRequests?.length || 0,
      totalCount: count || 0,
      page,
      totalPages
    })

    return NextResponse.json({
      leave_requests: leaveRequests || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    })
  } catch (error) {
    console.error('Leave requests GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [LEAVE API] POST /api/leave/requests - Starting request')
    
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') || request.headers.get('x-organization-id')
    console.log('🔍 [LEAVE API] Organization ID:', organizationId)
    
    if (!organizationId) {
      console.log('❌ [LEAVE API] No organization ID provided')
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Validate organization access and permissions
    console.log('🔍 [LEAVE API] Validating organization access...')
    const validation = await validateOrganizationAccessWithId(organizationId, {
      resource: 'leave_requests',
      action: 'read'
    })

    console.log('🔍 [LEAVE API] Validation result:', {
      success: validation.success,
      error: validation.error,
      status: validation.status
    })

    if (!validation.success) {
      console.log('❌ [LEAVE API] Validation failed:', validation.error)
      return NextResponse.json({
        error: validation.error,
      }, { status: validation.status })
    }

    const { context: userContext } = validation
    console.log('🔍 [LEAVE API] User context:', {
      userId: userContext?.userId,
      organizationId: userContext?.organizationId
    })
    
    const supabase = await createClient()

    const body = await request.json()
    console.log('🔍 [LEAVE API] Request body:', body)
    
    const { leave_type, start_date, end_date, reason } = body

    // Validate required fields
    if (!leave_type || !start_date || !end_date) {
      console.log('❌ [LEAVE API] Missing required fields:', { leave_type, start_date, end_date })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate total days (days_requested)
    const start = new Date(start_date)
    const end = new Date(end_date)
    const timeDiff = end.getTime() - start.getTime()
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1
    console.log('🔍 [LEAVE API] Calculated total days:', totalDays)

    // Check for overlapping requests
    console.log('🔍 [LEAVE API] Checking for overlapping requests...')
    const { data: overlappingRequests, error: overlapError } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('user_id', userContext!.userId)
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'approved'])
      .or(`and(start_date.lte.${end_date},end_date.gte.${start_date})`)

    console.log('🔍 [LEAVE API] Overlap check result:', {
      hasOverlapError: !!overlapError,
      overlapError: overlapError?.message,
      overlappingCount: overlappingRequests?.length || 0
    })

    if (overlappingRequests && overlappingRequests.length > 0) {
      console.log('❌ [LEAVE API] Overlapping requests found:', overlappingRequests)
      return NextResponse.json({ error: 'You have overlapping leave requests' }, { status: 400 })
    }

    console.log('🔍 [LEAVE API] Creating leave request with data:', {
      organization_id: organizationId,
      user_id: userContext!.userId,
      type: leave_type,
      start_date,
      end_date,
      days_requested: totalDays,
      status: 'pending',
      reason
    })

    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        organization_id: organizationId,
        user_id: userContext!.userId,
        type: leave_type,
        start_date,
        end_date,
        days_requested: totalDays,
        status: 'pending',
        reason
      })
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
        users:user_id ( id, full_name, email, avatar_url )
      `)
      .single()

    console.log('🔍 [LEAVE API] Database insert result:', {
      hasData: !!leaveRequest,
      hasError: !!error,
      error: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details
    })

    if (error) {
      console.error('❌ [LEAVE API] Error creating leave request:', error)
      return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 })
    }

    console.log('✅ [LEAVE API] Successfully created leave request:', leaveRequest?.id)
    return NextResponse.json({ leave_request: leaveRequest })
  } catch (error) {
    console.error('Leave request POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
