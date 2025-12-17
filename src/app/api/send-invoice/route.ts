import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { sendEmail } from "@/service/email.service";
import { generateInvoiceHTML } from "@/templates/invoiceTemplete";

export async function POST(req: Request) {
  try {
    const { currentInvoice, calculations } = await req.json();

    const html = generateInvoiceHTML(currentInvoice, calculations);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        bottom: "20px",
        left: "20px",
        right: "20px",
      },
    });

    await browser.close();
    const emailText = `
Hello ${currentInvoice.clientName},

Please find attached the invoice #${currentInvoice.invoiceNumber}.

Total Due: ${currentInvoice.currency} ${currentInvoice.totalAmount}
Due Date: ${new Date(currentInvoice.dueDate).toLocaleDateString()}

Thank you for choosing ${currentInvoice.companyName}.
If you have any questions, feel free to reach out.

Best regards,
${currentInvoice.companyName}
${currentInvoice.companyPhone}
${currentInvoice.companyEmail}
    `;

    await sendEmail({
      to: currentInvoice.clientEmail || currentInvoice.clientEmail1,
      subject: `Invoice #${currentInvoice.invoiceNumber}`,
      html: emailText,
      attachments: [
        {
          filename: `Invoice-${currentInvoice.invoiceNumber}.pdf`,
          content: Buffer.from(pdfBuffer).toString("base64"), // ensure clean base64
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Invoice Send Error:", err);
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    );
  }
}
