// Email service for sending invitations and notifications
import nodemailer from "nodemailer";

interface InvitationEmailData {
  email: string;
  token: string;
  organizationName: string;
  organizationLogo?: string;
  roleName: string;
  inviterName: string;
  message?: string;
  expiresAt?: string;
}

interface WelcomeEmailData {
  email: string;
  name: string;
  organizationName: string;
  organizationLogo?: string;
}

interface VerificationCodeEmailData {
  email: string;
  name: string;
  code: string;
}

interface EmailSuccessResult {
  success: true;
  provider: string;
  fallback?: boolean;
  message?: string;
}

interface EmailFailureResult {
  success: false;
  error: string;
}

type EmailResult = EmailSuccessResult | EmailFailureResult;

// Create SendGrid SMTP transporter
const createSendGridTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.sendgrid.net",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "apikey",
      pass: process.env.SENDGRID_API_KEY,
    },
  });
};

// Simple email service using SendGrid SMTP or Resend
export async function sendInvitationEmail(
  data: InvitationEmailData
): Promise<EmailResult> {
  try {
    console.log("📧 Starting invitation email process...");
    console.log("📧 Email data:", {
      email: data.email,
      organizationName: data.organizationName,
      roleName: data.roleName,
      inviterName: data.inviterName,
    });
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite?token=${data.token}`;
    const expirationDate = new Date(data.expiresAt || "").toLocaleDateString();
    const emailHtml = generateInvitationEmailHTML(
      data,
      inviteUrl,
      expirationDate
    );

    // Verify FROM_EMAIL is set
    const fromEmail = process.env.FROM_EMAIL;
    if (!fromEmail) {
      console.error("❌ FROM_EMAIL environment variable is not set");
      return {
        success: false,
        error: "FROM_EMAIL environment variable is not set",
      };
    }

    // Option 1: Using SendGrid SMTP
    if (process.env.SENDGRID_API_KEY) {
      try {
        const transporter = createSendGridTransporter();

        const info = await transporter.sendMail({
          from: fromEmail,
          to: data.email,
          subject: `You're invited to join ${data.organizationName}`,
          html: emailHtml,
        });

        console.log(
          "✅ Invitation email sent via SendGrid SMTP:",
          info.messageId
        );
        return { success: true, provider: "sendgrid-smtp" };
      } catch (sendgridError: any) {
        console.error("❌ SendGrid SMTP error:", sendgridError);

        // Try Resend as fallback if available
        if (process.env.RESEND_API_KEY) {
          console.log("Falling back to Resend...");
          return await sendViaResend(data);
        }

        // If no fallback available, log to console
        return logEmailToConsole(data);
      }
    }
    // Option 2: Using Resend
    else if (process.env.RESEND_API_KEY) {
      return await sendViaResend(data);
    }
    // Option 3: Log to console for development
    else {
      return logEmailToConsole(data);
    }
  } catch (error) {
    console.error("❌ Failed to send invitation email:", error);
    // Don't throw error, return a failure response instead
    return { success: false, error: String(error) };
  }
}

// Helper function to send via Resend
async function sendViaResend(data: InvitationEmailData): Promise<EmailResult> {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite?token=${data.token}`;
    const expirationDate = new Date(data.expiresAt || "").toLocaleDateString();

    const emailHtml = generateInvitationEmailHTML(
      data,
      inviteUrl,
      expirationDate
    );

    const fromEmail = process.env.FROM_EMAIL || "noreply@yourcompany.com";

    const response = await resend.emails.send({
      from: fromEmail,
      to: data.email,
      subject: `You're invited to join ${data.organizationName}`,
      html: emailHtml,
    });

    console.log("✅ Invitation email sent via Resend");
    return { success: true, provider: "resend" };
  } catch (error) {
    console.error("❌ Resend error:", error);
    // Fall back to console logging
    return logEmailToConsole(data);
  }
}

// Helper function to log email to console
function logEmailToConsole(data: InvitationEmailData): EmailResult {
  console.log("📧 INVITATION EMAIL (Development Mode):");
  console.log("═".repeat(50));
  console.log(`To: ${data.email}`);
  console.log(`Subject: You're invited to join ${data.organizationName}`);
  console.log(
    `Invitation URL: ${process.env.NEXTAUTH_URL}/invite?token=${data.token}`
  );
  console.log(`Role: ${data.roleName}`);
  console.log(`Invited by: ${data.inviterName}`);
  if (data.message) console.log(`Message: ${data.message}`);
  console.log(
    `Expires: ${new Date(data.expiresAt || "").toLocaleDateString()}`
  );
  console.log("═".repeat(50));

  return {
    success: true,
    provider: "console",
    message: "Email logged to console",
  };
}

// Generate HTML email template
function generateInvitationEmailHTML(
  data: InvitationEmailData,
  inviteUrl: string,
  expirationDate: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>You're invited to join ${data.organizationName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          ${
            data.organizationLogo
              ? `<img src="${data.organizationLogo}" alt="${data.organizationName}" style="max-width: 150px; margin-bottom: 20px;">`
              : ""
          }
          <h1 style="color: #2563eb; margin: 0;">You're Invited!</h1>
          <p style="font-size: 18px; margin: 10px 0 0 0; color: #666;">
            Join ${data.organizationName} as a ${data.roleName}
          </p>
        </div>

        <div style="background-color: white; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi there! 👋
          </p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> as a <strong>${data.roleName}</strong>.
          </p>

          ${
            data.message
              ? `
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 0; font-style: italic; color: #555;">
                "${data.message}"
              </p>
            </div>
          `
              : ""
          }

          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>

          <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
            This invitation expires on <strong>${expirationDate}</strong>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="font-size: 14px; color: #666;">
            If you can't click the button above, copy and paste this link into your browser:
          </p>
          <p style="font-size: 14px; color: #2563eb; word-break: break-all;">
            ${inviteUrl}
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #666;">
            This email was sent by ${data.organizationName}. 
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;
}

// Send welcome email after user accepts invitation
export async function sendWelcomeEmail(
  data: WelcomeEmailData
): Promise<EmailResult> {
  try {
    // Verify FROM_EMAIL is set
    const fromEmail = process.env.FROM_EMAIL;
    if (!fromEmail) {
      console.error("❌ FROM_EMAIL environment variable is not set");
      return {
        success: false,
        error: "FROM_EMAIL environment variable is not set",
      };
    }

    // Using SendGrid SMTP for welcome emails
    if (process.env.SENDGRID_API_KEY) {
      try {
        const transporter = createSendGridTransporter();

        const info = await transporter.sendMail({
          from: fromEmail,
          to: data.email,
          subject: `Welcome to ${data.organizationName}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1>Welcome to ${data.organizationName}, ${data.name}!</h1>
              <p>Your account has been successfully created. We're excited to have you on board!</p>
              <p>You can now log in and start using the platform.</p>
            </div>
          `,
        });

        console.log("✅ Welcome email sent via SendGrid SMTP:", info.messageId);
        return { success: true, provider: "sendgrid-smtp" };
      } catch (error) {
        console.error("❌ SendGrid SMTP error:", error);

        // Try Resend as fallback if available
        if (process.env.RESEND_API_KEY) {
          console.log("Falling back to Resend for welcome email...");
          return await sendWelcomeViaResend(data);
        }

        // Log to console as fallback
        console.log("👋 Welcome email would be sent to:", data.email);
        return { success: true, provider: "console", fallback: true };
      }
    }
    // Using Resend as fallback
    else if (process.env.RESEND_API_KEY) {
      return await sendWelcomeViaResend(data);
    }
    // Log to console for development
    else {
      console.log("👋 Welcome email would be sent to:", data.email);
      return { success: true, provider: "console" };
    }
  } catch (error) {
    console.error("❌ Failed to send welcome email:", error);
    return { success: false, error: String(error) };
  }
}

// Helper function to send welcome email via Resend
async function sendWelcomeViaResend(
  data: WelcomeEmailData
): Promise<EmailResult> {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const fromEmail = process.env.FROM_EMAIL || "noreply@yourcompany.com";

    const response = await resend.emails.send({
      from: fromEmail,
      to: data.email,
      subject: `Welcome to ${data.organizationName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1>Welcome to ${data.organizationName}, ${data.name}!</h1>
          <p>Your account has been successfully created. We're excited to have you on board!</p>
          <p>You can now log in and start using the platform.</p>
        </div>
      `,
    });

    return { success: true, provider: "resend" };
  } catch (error) {
    console.error("❌ Resend error for welcome email:", error);
    // Log to console as fallback
    console.log("👋 Welcome email would be sent to:", data.email);
    return { success: true, provider: "console", fallback: true };
  }
}

// Send email verification code
export async function sendVerificationCodeEmail(
  data: VerificationCodeEmailData
): Promise<EmailResult> {
  try {
    console.log("📧 Starting verification code email process...");
    console.log("📧 Email data:", {
      email: data.email,
      name: data.name,
    });

    const emailHtml = generateVerificationCodeEmailHTML(data);

    // Verify FROM_EMAIL is set
    const fromEmail = process.env.FROM_EMAIL;
    if (!fromEmail) {
      console.error("❌ FROM_EMAIL environment variable is not set");
      return {
        success: false,
        error: "FROM_EMAIL environment variable is not set",
      };
    }

    // Option 1: Using SendGrid SMTP
    if (process.env.SENDGRID_API_KEY) {
      try {
        const transporter = createSendGridTransporter();
        console.log("Comes Here")
        console.log({  from: fromEmail,
          to: data.email,
          subject: "Verify your email address",
          html: emailHtml,})
        const info = await transporter.sendMail({
          from: fromEmail,
          to: data.email,
          subject: "Verify your email address",
          html: emailHtml,
        });

        console.log(
          "✅ Verification code email sent via SendGrid SMTP:",
          info.messageId
        );
        return { success: true, provider: "sendgrid-smtp" };
      } catch (sendgridError: any) {
        console.error("❌ SendGrid SMTP error:", sendgridError);

        // Try Resend as fallback if available
        if (process.env.RESEND_API_KEY) {
          console.log("Falling back to Resend...");
          return await sendVerificationCodeViaResend(data);
        }

        // If no fallback available, log to console
        return logVerificationCodeToConsole(data);
      }
    }
    // Option 2: Using Resend
    else if (process.env.RESEND_API_KEY) {
      return await sendVerificationCodeViaResend(data);
    }
    // Option 3: Log to console for development
    else {
      return logVerificationCodeToConsole(data);
    }
  } catch (error) {
    console.error("❌ Failed to send verification code email:", error);
    return { success: false, error: String(error) };
  }
}

// Helper function to send verification code via Resend
async function sendVerificationCodeViaResend(
  data: VerificationCodeEmailData
): Promise<EmailResult> {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailHtml = generateVerificationCodeEmailHTML(data);
    const fromEmail = process.env.FROM_EMAIL || "noreply@yourcompany.com";

    const response = await resend.emails.send({
      from: fromEmail,
      to: data.email,
      subject: "Verify your email address",
      html: emailHtml,
    });

    console.log("✅ Verification code email sent via Resend");
    return { success: true, provider: "resend" };
  } catch (error) {
    console.error("❌ Resend error:", error);
    // Fall back to console logging
    return logVerificationCodeToConsole(data);
  }
}

// Helper function to log verification code to console
function logVerificationCodeToConsole(
  data: VerificationCodeEmailData
): EmailResult {
  console.log("📧 VERIFICATION CODE EMAIL (Development Mode):");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`To: ${data.email}`);
  console.log(`Subject: Verify your email address`);
  console.log(`Code: ${data.code}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  return { success: true, provider: "console", fallback: true };
}

// Generate HTML for verification code email
function generateVerificationCodeEmailHTML(
  data: VerificationCodeEmailData
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email address</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0; text-align: center;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #f97316; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Verify Your Email</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi ${data.name || "there"},
              </p>
              
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Thank you for signing up! Please use the verification code below to verify your email address:
              </p>
              
              <!-- Verification Code Box -->
              <div style="background-color: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                  Verification Code
                </p>
                <p style="margin: 0; color: #f97316; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${data.code}
                </p>
              </div>
              
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                This code will expire in 15 minutes. If you didn't request this code, please ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
