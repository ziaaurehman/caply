import React from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    invoiceId: string;
    poNumber: string;
    issueDate: string;
    dueDate: string;
    subject: string;
    client: {
      name: string;
      country: string;
      province?: string;
    } | undefined;
    currency: string;
    lineItems: Array<{
      type: string;
      description: string;
      quantity: number;
      unitPrice: number;
      taxable: boolean;
      projectId?: string;
    }>;
    totals: {
      subtotal: number;
      gst: number;
      pst: number;
      hst: number;
      total: number;
    };
    status: string;
    logo: string | null;
    notes: string;
  };
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen) return null;

  const calculateDueDate = () => {
    if (data.dueDate === '0') return 'Due upon receipt';
    if (data.dueDate === 'custom') return new Date(data.dueDate).toLocaleDateString();
    return `Due in ${data.dueDate} days`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Invoice Preview
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Company Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              {data.logo ? (
                <img
                  src={data.logo}
                  alt="Company Logo"
                  className="h-16 object-contain mb-4"
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">Caply Inc.</h1>
              )}
              <p className="text-gray-600">123 Business Street</p>
              <p className="text-gray-600">Toronto, ON M5V 2H1</p>
              <p className="text-gray-600">Canada</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-900">Invoice</h2>
              <p className="text-gray-600">Invoice #: {data.invoiceId || 'Auto-generated'}</p>
              {data.poNumber && (
                <p className="text-gray-600">PO #: {data.poNumber}</p>
              )}
              <p className="text-gray-600">Date: {new Date(data.issueDate).toLocaleDateString()}</p>
              <p className="text-gray-600">{calculateDueDate()}</p>
            </div>
          </div>

          {/* Client Information */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bill To:</h3>
            {data.client ? (
              <div>
                <p className="text-gray-800 font-medium">{data.client.name}</p>
                <p className="text-gray-600">{data.client.country}</p>
                {data.client.province && (
                  <p className="text-gray-600">{data.client.province}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 italic">No client selected</p>
            )}
          </div>

          {/* Subject */}
          {data.subject && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Subject:</h3>
              <p className="text-gray-800">{data.subject}</p>
            </div>
          )}

          {/* Line Items */}
          
          <div className="mb-8">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.lineItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(item.unitPrice, data.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(item.quantity * item.unitPrice, data.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mb-8">
            <div className="w-72 ml-auto">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900">{formatCurrency(data.totals.subtotal, data.currency)}</span>
                </div>

                {data.totals.gst > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST (5%):</span>
                    <span className="text-gray-900">{formatCurrency(data.totals.gst, data.currency)}</span>
                  </div>
                )}

                {data.totals.pst > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {data.client?.province === 'Quebec' ? 'QST' : 'PST'}:
                    </span>
                    <span className="text-gray-900">{formatCurrency(data.totals.pst, data.currency)}</span>
                  </div>
                )}

                {data.totals.hst > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">HST:</span>
                    <span className="text-gray-900">{formatCurrency(data.totals.hst, data.currency)}</span>
                  </div>
                )}

                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-gray-900">{formatCurrency(data.totals.total, data.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {data.notes && (
            <div className="border-t pt-8 text-sm text-gray-600">
              <h4 className="font-medium text-gray-900 mb-2">Notes:</h4>
              <p className="whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}

          {/* Payment Instructions */}
          <div className="border-t pt-8 text-sm text-gray-600">
            <h4 className="font-medium text-gray-900 mb-2">Payment Instructions:</h4>
            <p>Please include the invoice number with your payment.</p>
            <p>Make checks payable to: Caply Inc.</p>
            <p>For electronic transfers, please contact us for banking details.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;