/**
 * Email service using SendGrid with attachment support
 * Handles transactional emails, invoice sending, etc.
 */

import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

/**
 * Send an email via SendGrid
 *
 * @param to - Recipient email address
 * @param subject - Subject of the email
 * @param html - HTML content
 * @param text - Text content fallback
 * @param attachments - Optional attachments array (base64 encoded)
 * @returns Promise<void>
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: {
    filename: string;
    content: string; // base64 encoded string
    type?: string;
    disposition?: string; // "attachment" | "inline"
  }[];
}): Promise<void> {
  console.log(to)
  console.log(process.env.FROM_EMAIL)
  console.log(process.env.FROM_NAME)
  const msg = {
    to,
    from: {
      email: process.env.FROM_EMAIL as string,
      name: process.env.FROM_NAME || "Caply",
    },
    subject,
    html,
    text,
    attachments,
  };

  try {
    await sgMail.send(msg);
    console.log("📨 Email sent successfully to:", to);
  } catch (error: any) {
    console.error("❌ SendGrid Email Error:", error?.response?.body || error);
    throw new Error("SendGrid email sending failed");
  }
}
