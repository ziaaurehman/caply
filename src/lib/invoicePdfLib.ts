import { CURRENCY_SYMBOLS } from "@/components/pages/invoice/components/invoice-types";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function generateInvoicePDF(
  currentInvoice: any,
  calculations: any
) {
  const currency = currentInvoice.currency || "CAD";
  const currencySymbol = CURRENCY_SYMBOLS[currency] || "";
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const padding = 50;
  let y = height - 50;

  const darkColor = rgb(0.1, 0.1, 0.1);
  const greyColor = rgb(0.5, 0.5, 0.5);

  // Header
  page.drawText("caply", {
    x: padding,
    y,
    size: 24,
    font: boldFont,
    color: rgb(1, 0.5, 0),
  }); // orange logo color
  page.drawText("INVOICE", {
    x: width - padding - 80,
    y,
    size: 24,
    font: boldFont,
    color: darkColor,
  });
  y -= 40;

  // Invoice meta
  const metadataX = width - padding - 250;
  page.drawText(`Invoice #: ${currentInvoice.invoiceNumber}`, {
    x: metadataX,
    y,
    size: 12,
    font,
    color: darkColor,
  });
  y -= 15;
  page.drawText(`PO #: ${currentInvoice.poNumber || "-"}`, {
    x: metadataX,
    y,
    size: 12,
    font,
    color: darkColor,
  });
  y -= 15;
  page.drawText(
    `Issue Date: ${new Date(currentInvoice.issueDate).toLocaleDateString()}`,
    { x: metadataX, y, size: 12, font, color: darkColor }
  );
  y -= 15;
  page.drawText(
    `Due Date: ${new Date(currentInvoice.dueDate).toLocaleDateString()}`,
    { x: metadataX, y, size: 12, font, color: darkColor }
  );

  // Company info (left)
  let infoY = height - 100;
  page.drawText(`${currentInvoice.companyName}`, {
    x: padding,
    y: infoY,
    size: 12,
    font: boldFont,
    color: darkColor,
  });
  infoY -= 15;

  // Wrap address into two lines
  const companyAddress = currentInvoice.companyAddress || "";
  const addressParts =
    companyAddress.length > 50
      ? [companyAddress.slice(0, 50), companyAddress.slice(50)]
      : [companyAddress];
  addressParts.forEach((part) => {
    page.drawText(part, {
      x: padding,
      y: infoY,
      size: 12,
      font,
      color: greyColor,
    });
    infoY -= 15;
  });

  page.drawText(`${currentInvoice.companyPhone}`, {
    x: padding,
    y: infoY,
    size: 12,
    font,
    color: greyColor,
  });
  infoY -= 15;
  page.drawText(`${currentInvoice.createdBy || ""}`, {
    x: padding,
    y: infoY,
    size: 12,
    font,
    color: greyColor,
  });

  // Client info & Subject
  let clientY = height - 160;
  page.drawText("Bill To", {
    x: padding,
    y: clientY,
    size: 12,
    font: boldFont,
    color: darkColor,
  });
  clientY -= 15;
  page.drawText(`${currentInvoice.clientName}`, {
    x: padding,
    y: clientY,
    size: 12,
    font,
    color: greyColor,
  });
  clientY -= 15;

  // Wrap client address
  const clientAddress = currentInvoice.clientAddress || "";
  const clientParts =
    clientAddress.length > 50
      ? [clientAddress.slice(0, 50), clientAddress.slice(50)]
      : [clientAddress];
  clientParts.forEach((part) => {
    page.drawText(part, {
      x: padding,
      y: clientY,
      size: 12,
      font,
      color: greyColor,
    });
    clientY -= 15;
  });

  page.drawText("Subject", {
    x: width / 2 + 30,
    y: height - 160,
    size: 12,
    font: boldFont,
    color: darkColor,
  });
  page.drawText(`${currentInvoice.projectName || "-"}`, {
    x: width / 2 + 30,
    y: height - 175,
    size: 12,
    font,
    color: greyColor,
  });

  y = clientY - 30;

  // Table header
  page.drawText("DESCRIPTION", {
    x: padding,
    y,
    size: 12,
    font: boldFont,
    color: darkColor,
  });
  page.drawText("QTY", {
    x: 250,
    y,
    size: 12,
    font: boldFont,
    color: darkColor,
  });
  page.drawText("UNIT PRICE", {
    x: 350,
    y,
    size: 12,
    font: boldFont,
    color: darkColor,
  });
  page.drawText("AMOUNT", {
    x: 450,
    y,
    size: 12,
    font: boldFont,
    color: darkColor,
  });
  y -= 20;

  // Line items
  currentInvoice.lineItems?.forEach((item: any, idx: number) => {
    const bgColor = idx % 2 === 0 ? rgb(0.95, 0.95, 0.95) : rgb(1, 1, 1);
    page.drawRectangle({
      x: padding - 2,
      y: y - 2,
      width: 500,
      height: 18,
      color: bgColor,
    });
    page.drawText(item.description, {
      x: padding,
      y,
      size: 12,
      font,
      color: darkColor,
    });
    page.drawText(`${item.quantity} ${item.unit || "Unit"}`, {
      x: 250,
      y,
      size: 12,
      font,
      color: darkColor,
    });
    page.drawText(`${currencySymbol}${item.unitPrice.toFixed(2)}`, {
      x: 350,
      y,
      size: 12,
      font,
      color: darkColor,
    });
    page.drawText(`${currencySymbol}${item.amount.toFixed(2)}`, {
      x: 450,
      y,
      size: 12,
      font,
      color: darkColor,
    });
    y -= 20;
  });

  y -= 10;

  // Totals
  const totalX = 350;

  // Subtotal
  page.drawText("Subtotal", { x: totalX, y, size: 12, font, color: greyColor });
  page.drawText(`${currencySymbol}${calculations.subtotal.toFixed(2)}`, {
    x: 450,
    y,
    size: 12,
    font,
    color: darkColor,
  });
  y -= 15;

  // Discount (ALWAYS show)
  page.drawText("Discount", { x: totalX, y, size: 12, font, color: greyColor });
  page.drawText(`${currencySymbol}${calculations.discountAmount.toFixed(2)}`, {
    x: 450,
    y,
    size: 12,
    font,
    color: darkColor,
  });
  y -= 15;

  // Federal Tax (TPS) – ALWAYS show
  const federalRate = calculations.taxRate?.federal ?? 0;

  page.drawText(`TPS (${federalRate}%)`, {
    x: totalX,
    y,
    size: 12,
    font,
    color: greyColor,
  });
  page.drawText(`${currencySymbol}${calculations.federalTax.toFixed(2)}`, {
    x: 450,
    y,
    size: 12,
    font,
    color: darkColor,
  });
  y -= 15;

  // Provincial Tax (TVQ) – ALWAYS show
  const provincialRate = calculations.taxRate?.provincial ?? 0;

  page.drawText(`TVQ (${provincialRate}%)`, {
    x: totalX,
    y,
    size: 12,
    font,
    color: greyColor,
  });
  page.drawText(`${currencySymbol}${calculations.provincialTax.toFixed(2)}`, {
    x: 450,
    y,
    size: 12,
    font,
    color: darkColor,
  });
  y -= 20;

  // Total
  page.drawText("Total", {
    x: totalX,
    y,
    size: 14,
    font: boldFont,
    color: darkColor,
  });
  page.drawText(`${currencySymbol}${calculations.total.toFixed(2)}`, {
    x: 450,
    y,
    size: 14,
    font: boldFont,
    color: darkColor,
  });
  y -= 40;

  // Notes
  page.drawText("NOTES", {
    x: padding,
    y,
    size: 12,
    font: boldFont,
    color: darkColor,
  });
  page.drawText(currentInvoice.notes || "Thank you for your business!", {
    x: padding,
    y: y - 15,
    size: 12,
    font,
    color: greyColor,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
