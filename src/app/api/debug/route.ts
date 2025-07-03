import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const check = searchParams.get('check');

  if (check === 'email-provider') {
    // Check which email provider is configured
    let provider = 'console';
    
    if (process.env.SENDGRID_API_KEY) {
      provider = 'sendgrid';
    } else if (process.env.RESEND_API_KEY) {
      provider = 'resend';
    }

    return NextResponse.json({ 
      provider,
      sendgridConfigured: !!process.env.SENDGRID_API_KEY,
      resendConfigured: !!process.env.RESEND_API_KEY,
      fromEmail: process.env.FROM_EMAIL || 'not-configured'
    });
  }
  
  // Debug invitation token
  if (check === 'invitation') {
    try {
      // For security, require authentication for this endpoint
      const session = await getServerSession(authConfig);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const token = searchParams.get('token');
      if (!token) {
        return NextResponse.json({ error: 'Token is required' }, { status: 400 });
      }
      
      const supabase = await createClient();
      
      // Get all invitations with this token, regardless of status
      const { data: allInvitations, error: allError } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('token', token);
        
      // Get pending invitations with this token
      const { data: pendingInvitations, error: pendingError } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending');
      
      return NextResponse.json({
        token,
        allInvitationsCount: allInvitations?.length || 0,
        pendingInvitationsCount: pendingInvitations?.length || 0,
        hasValidInvitation: (pendingInvitations?.length || 0) > 0,
        allInvitations,
        pendingInvitations,
        allError: allError ? { message: allError.message, code: allError.code } : null,
        pendingError: pendingError ? { message: pendingError.message, code: pendingError.code } : null
      });
    } catch (error) {
      console.error('Error debugging invitation:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  return NextResponse.json({ message: 'Debug endpoint' });
} 