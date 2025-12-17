export function generateInvoiceHTML(currentInvoice: any, calculations: any) {
  const formatCurrency = (amount: any) =>
    `${currentInvoice.currency || "USD"} ${Number(amount).toFixed(2)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice</title>

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      background: #fff;
      padding: 40px;
      color: #222;
    }

    .container {
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
    }

    .brand {
      font-size: 32px;
      font-weight: 700;
    }

    .invoice-title {
      font-size: 36px;
      font-weight: 700;
    }

    /* Info Blocks */
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-top: 25px;
    }

    .info-block div {
      margin-bottom: 6px;
      font-size: 15px;
    }

    .bold {
      font-weight: 600;
    }

    /* Table Styles */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
    }

    th {
      text-align: left;
      font-size: 14px;
      border-bottom: 2px solid #ddd;
      padding-bottom: 12px;
      font-weight: 600;
    }

    td {
      padding: 16px 0;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }

    .right {
      text-align: right;
    }

    /* Totals */
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 40px;
    }

    .total-table {
      width: 330px;
    }

    .total-table td {
      border: none !important;
      padding: 8px 0;
      font-size: 15px;
    }

    .total {
      font-size: 18px;
      font-weight: 700;
      border-top: 2px solid #ccc;
      padding-top: 12px;
      margin-top: 8px;
    }

    /* Notes */
    .notes {
      margin-top: 40px;
      font-size: 14px;
      line-height: 20px;
    }

    .notes-title {
      font-weight: 600;
      margin-bottom: 6px;
    }
  </style>
</head>

<body>
  <div class="container">

    <!-- Header -->
    <div class="header">
      <div class="brand">Caply</div>
      <div class="invoice-title">INVOICE</div>
    </div>

    <!-- Business & Invoice Info -->
    <div class="info-row">

      <!-- Company Info -->
      <div class="info-block">
        <div class="bold">Caply</div>
        <div>${currentInvoice.companyAddress}</div>
        <div>${currentInvoice.companyPhone}</div>
      </div>

      <!-- Invoice Meta -->
      <div class="info-block">
        <div><span class="bold">Invoice #:</span> ${currentInvoice.invoiceNumber}</div>
        <div><span class="bold">PO Number:</span> ${currentInvoice.poNumber || "-"}</div>
        <div><span class="bold">Issue Date:</span> ${new Date(currentInvoice.issueDate).toLocaleDateString()}</div>
        <div><span class="bold">Due Date:</span> ${new Date(currentInvoice.dueDate).toLocaleDateString()}</div>
      </div>
    </div>

    <!-- Client Info -->
    <div class="info-row" style="margin-top: 40px;">
      <div class="info-block">
        <div class="bold">Bill To</div>
        <div>${currentInvoice.clientName}</div>
        <div>${currentInvoice.clientAddress}</div>
      </div>
      <div class="info-block">
        <div class="bold">Subject</div>
        <div>${currentInvoice.projectName || "-"}</div>
      </div>
    </div>

    <!-- Line Items -->
    <table>
      <thead>
        <tr>
          <th>DESCRIPTION</th>
          <th>QTY</th>
          <th class="right">UNIT PRICE</th>
          <th class="right">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${currentInvoice.lineItems
          ?.map(
            (item) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td class="right">${formatCurrency(item.unitPrice)}</td>
                <td class="right"><b>${formatCurrency(item.amount)}</b></td>
              </tr>
          `
          )
          .join("")}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-wrapper">
      <table class="total-table">

        <tr>
          <td>Subtotal</td>
          <td class="right bold">${formatCurrency(calculations.subtotal)}</td>
        </tr>

        ${
          calculations.discountAmount
            ? `
          <tr>
            <td>Discount</td>
            <td class="right bold">-${formatCurrency(calculations.discountAmount)}</td>
          </tr>
        `
            : ""
        }

        ${
          calculations.federalTax
            ? `
          <tr>
            <td>Federal Tax</td>
            <td class="right bold">${formatCurrency(calculations.federalTax)}</td>
          </tr>
        `
            : ""
        }

        ${
          calculations.provincialTax
            ? `
          <tr>
            <td>Provincial Tax</td>
            <td class="right bold">${formatCurrency(calculations.provincialTax)}</td>
          </tr>
        `
            : ""
        }

        <tr class="total">
          <td class="total">Total</td>
          <td class="right total">${formatCurrency(calculations.total)}</td>
        </tr>

      </table>
    </div>

    <!-- Notes -->
    <div class="notes">
      <div class="notes-title">NOTES</div>
      <div>${currentInvoice.notes || "Thank you for your business!"}</div>
    </div>

  </div>
</body>
</html>

  `;
}
