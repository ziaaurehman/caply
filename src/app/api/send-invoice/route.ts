// app/api/send-invoice/route.ts
import { NextResponse } from "next/server";
import { sendEmail } from "@/service/email.service";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { generateInvoicePDF } from "@/lib/invoicePdfLib";

async function uploadInvoicePDF(buffer: Buffer, invoiceNumber: string) {
  const filePath = `invoices/Invoice-${invoiceNumber}.pdf`;

  const { error } = await supabaseAdmin.storage
    .from("caply")
    .upload(filePath, buffer, { contentType: "application/pdf", upsert: true });

  if (error) throw error;

  const { data } = supabaseAdmin.storage.from("caply").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function POST(req: Request) {
  try {
    const { currentInvoice, calculations } = await req.json();

    const pdfBuffer = await generateInvoicePDF(currentInvoice, calculations);
    const pdfUrl = await uploadInvoicePDF(pdfBuffer, currentInvoice.invoiceNumber);

    await sendEmail({
      to: currentInvoice.clientEmail || currentInvoice.clientEmail1,
      subject: `Invoice #${currentInvoice.invoiceNumber}`,
      html: `<p>Hello ${currentInvoice.clientName},</p>
             <p>Your invoice is ready: <a href="${pdfUrl}">View PDF</a></p>`,
      attachments: [
        {
          filename: `Invoice-${currentInvoice.invoiceNumber}.pdf`,
          content: pdfBuffer.toString("base64"),
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send invoice" }, { status: 500 });
  }
}
