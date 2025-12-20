import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { sendEmail } from "@/service/email.service";
import { generateInvoiceHTML } from "@/templates/invoiceTemplete";

export async function POST(req: Request) {
  try {
    const { currentInvoice, calculations } = await req.json();

    // Validate required fields
    if (!currentInvoice.clientEmail || !currentInvoice.clientEmail.trim()) {
      return NextResponse.json(
        { error: "Client email is required to send invoice" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentInvoice.clientEmail.trim())) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    if (!currentInvoice.invoiceNumber) {
      return NextResponse.json(
        { error: "Invoice number is required" },
        { status: 400 }
      );
    }

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

    const totalAmount = calculations?.total || currentInvoice.totalAmount || 0;
    const emailText = `
Hello ${currentInvoice.clientName || "Valued Client"},

Please find attached the invoice #${currentInvoice.invoiceNumber}.

Total Due: ${currentInvoice.currency} ${totalAmount.toFixed(2)}
Due Date: ${new Date(currentInvoice.dueDate).toLocaleDateString()}

Thank you for choosing ${currentInvoice.companyName}.
If you have any questions, feel free to reach out.

Best regards,
${currentInvoice.companyName}
${currentInvoice.companyPhone || ""}
    `;

    await sendEmail({
      to: currentInvoice.clientEmail.trim(),
      subject: `Invoice #${currentInvoice.invoiceNumber}`,
      html: emailText.replace(/\n/g, "<br>"),
      attachments: [
        {
          filename: `Invoice-${currentInvoice.invoiceNumber}.pdf`,
          content: Buffer.from(pdfBuffer).toString("base64"),
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Invoice Send Error:", err);
    const errorMessage = err?.message || err?.response?.body?.errors?.[0]?.message || "Failed to send invoice";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
