import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth';

// Test endpoint for verifying email configuration
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if SendGrid API key is configured
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      return NextResponse.json({ 
        error: 'SendGrid API key not configured', 
        status: 'error',
        message: 'Please set SENDGRID_API_KEY in your environment variables'
      }, { status: 400 });
    }

    // Check if FROM_EMAIL is configured
    const fromEmail = process.env.FROM_EMAIL;
    if (!fromEmail) {
      return NextResponse.json({ 
        error: 'FROM_EMAIL not configured', 
        status: 'error',
        message: 'Please set FROM_EMAIL in your environment variables'
      }, { status: 400 });
    }

    // Create SendGrid transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: sendgridApiKey
      }
    });

    // Send test email
    const testEmail = session.user.email || fromEmail;
    const info = await transporter.sendMail({
      from: fromEmail,
      to: testEmail,
      subject: 'Caply Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1>Email Configuration Test</h1>
          <p>This is a test email to verify your SendGrid SMTP configuration is working correctly.</p>
          <p>If you're seeing this, your email service is configured properly!</p>
          <hr>
          <p>Sent to: ${testEmail}</p>
          <p>From: ${fromEmail}</p>
          <p>Date: ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      sentTo: testEmail,
      message: 'Test email sent successfully!'
    });

  } catch (error: any) {
    console.error('Error sending test email:', error);
    
    return NextResponse.json({
      error: 'Failed to send test email',
      status: 'error',
      message: error.message || 'Unknown error',
      details: error.toString()
    }, { status: 500 });
  }
} 