// InvoicePreview.tsx
import React from "react";
import { Download, Send } from "lucide-react";
import { LocalInvoice, Calculations, TAX_RATES } from "./invoice-types";
import { formatCurrency } from "./invoice-utils";

interface InvoicePreviewProps {
  currentInvoice: LocalInvoice;
  calculations: Calculations;
  onDownloadPDF: () => void;
  setPreviewRef: (ref: HTMLDivElement | null) => void;
  onSendInvoice?: () => void;
  isLoading?: boolean;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  currentInvoice,
  calculations,
  onDownloadPDF,
  setPreviewRef,
  onSendInvoice,
  isLoading = false,
}) => {
  return (
    <>
    
      <div className="w-full flex justify-center items-center">
        <div
          ref={setPreviewRef}
          className="sticky top-4 bg-white rounded-lg shadow-lg p-8 overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {currentInvoice.companyName || "Company"}
              </span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">INVOICE</h1>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {currentInvoice.companyName || "Your Company"}
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {currentInvoice.companyAddress || "Your Company Address"}
              </p>
              {currentInvoice.companyPhone && (
                <p className="text-sm text-gray-600">
                  {currentInvoice.companyPhone}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Invoice #
                </span>
                <span className="ml-2 text-sm text-gray-900">
                  {currentInvoice.invoiceNumber}
                </span>
              </div>
              <div className="mb-2">
                <span className="text-sm font-medium text-gray-600">PO #</span>
                <span className="ml-2 text-sm text-gray-900">
                  {currentInvoice.poNumber}
                </span>
              </div>
              <div className="mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Issue Date
                </span>
                <span className="ml-2 text-sm text-gray-900">
                  {currentInvoice.issueDate
                    ? new Date(currentInvoice.issueDate).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )
                    : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Due Date
                </span>
                <span className="ml-2 text-sm text-gray-900">
                  {currentInvoice.dueDate
                    ? new Date(currentInvoice.dueDate).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Bill To</h3>
              <p className="text-sm font-medium text-gray-900">
                {currentInvoice.clientName || "Client Name"}
              </p>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {currentInvoice.clientAddress || "Client Address"}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Subject</h3>
              <p className="text-sm text-gray-900">
                {currentInvoice.projectName || "Project Name"}
              </p>
            </div>
          </div>

          <div className="border-t border-b border-gray-200 py-4 mb-4">
            <div className="grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase mb-3">
              <div className="col-span-5">Description</div>
              <div className="col-span-2 text-right">QTY</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>
            {currentInvoice.lineItems.length > 0 ? (
              currentInvoice.lineItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 text-sm py-3 border-b border-gray-100"
                >
                  <div className="col-span-5 text-gray-900">
                    {item.description || "Service"}
                  </div>
                  <div className="col-span-2 text-right text-gray-900">
                    {item.quantity} {item.unit}
                  </div>
                  <div className="col-span-2 text-right text-gray-900">
                    {formatCurrency(item.unitPrice, currentInvoice.currency)}
                  </div>
                  <div className="col-span-3 text-right font-bold text-gray-900">
                    {formatCurrency(item.amount, currentInvoice.currency)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                No line items added yet
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(
                    calculations.subtotal,
                    currentInvoice.currency
                  )}
                </span>
              </div>
              {calculations.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Discount{" "}
                    {currentInvoice.discountType === "percentage"
                      ? `(${currentInvoice.discount}%)`
                      : ""}
                  </span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(
                      calculations.discountAmount,
                      currentInvoice.currency
                    )}
                  </span>
                </div>
              )}
              {!currentInvoice.isInternational &&
                currentInvoice.province &&
                TAX_RATES[currentInvoice.province] && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        TPS ({TAX_RATES[currentInvoice.province]?.federal}%)
                      </span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(
                          calculations.federalTax,
                          currentInvoice.currency
                        )}
                      </span>
                    </div>
                    {TAX_RATES[currentInvoice.province]?.provincial > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          TVQ ({TAX_RATES[currentInvoice.province]?.provincial}
                          %)
                        </span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(
                            calculations.provincialTax,
                            currentInvoice.currency
                          )}
                        </span>
                      </div>
                    )}
                  </>
                )}
              <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">
                  {formatCurrency(calculations.total, currentInvoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {currentInvoice.notes && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-2">NOTES</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {currentInvoice.notes}
              </p>
            </div>
          )}

          <div className="mt-6 flex gap-2 no-print-buttons">
            <button
              onClick={onDownloadPDF}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            {onSendInvoice && (
              <button
                onClick={onSendInvoice}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isLoading ? "Sending..." : "Send Invoice"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
