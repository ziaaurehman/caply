// InvoiceList.tsx
import React from "react";
import {
  Plus,
  FileText,
  Hash,
  Pencil,
  Trash2,
  Eye,
  CheckCircle,
} from "lucide-react";
import { formatCurrency, getStatusBadge } from "./invoice-utils";
import { LocalInvoice } from "./invoice-types";

interface InvoiceListProps {
  invoices: any[];
  activeTab: "all" | "draft" | "sent" | "paid" | "overdue";
  setActiveTab: (tab: "all" | "draft" | "sent" | "paid" | "overdue") => void;
  onCreateNew: () => void;
  onEdit: (invoice: any) => void;
  onDelete: (id: string) => void;
  onMarkAsPaid: (invoice: any) => void;
  onViewPDF: (invoice: any) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  activeTab,
  setActiveTab,
  onCreateNew,
  onEdit,
  onDelete,
  onMarkAsPaid,
  onViewPDF,
}) => {
  const tabCounts = React.useMemo(() => {
    const counts = { all: 0, draft: 0, sent: 0, paid: 0, overdue: 0 };
    invoices.forEach((invoice) => {
      counts.all++;
      if (invoice.status === "draft") counts.draft++;
      if (invoice.status === "sent") counts.sent++;
      if (invoice.status === "paid") counts.paid++;
      if (invoice.status === "overdue") counts.overdue++;
    });
    return counts;
  }, [invoices]);

  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((invoice) => {
      if (activeTab === "all") return true;
      if (activeTab === "draft" && invoice.status === "draft") return true;
      if (activeTab === "sent" && invoice.status === "sent") return true;
      if (activeTab === "paid" && invoice.status === "paid") return true;
      if (activeTab === "overdue" && invoice.status === "overdue") return true;
      return false;
    });
  }, [invoices, activeTab]);

  return (
    <div className=" bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Invoices</h1>
            <p className="text-sm text-gray-500">
              Manage and track all your invoices
            </p>
          </div>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Generate Invoice
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { key: "all", label: "All Invoices" },
                { key: "draft", label: "Draft" },
                { key: "sent", label: "Sent" },
                { key: "paid", label: "Paid" },
                { key: "overdue", label: "Overdue" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                    {tabCounts[tab.key as keyof typeof tabCounts]}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Invoice Table */}
          <div className="overflow-x-auto">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No invoices found
                </h3>
                <p className="text-gray-500 mb-4">
                  {activeTab === "all"
                    ? "Get started by creating your first invoice"
                    : `No ${activeTab} invoices at the moment`}
                </p>
                <button
                  onClick={onCreateNew}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4" />
                  Generate Invoice
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Hash className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.client?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(
                            Number(invoice.totalAmount),
                            invoice.currency
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(
                          invoice.status as LocalInvoice["status"]
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {invoice.status === "paid" && (
                          <button
                            onClick={() => onViewPDF(invoice)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="View PDF"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}

                        {invoice.status !== "paid" && (
                          <>
                            <button
                              onClick={() => onMarkAsPaid(invoice)}
                              className="text-green-600 hover:text-green-900 mr-3"
                              title="Mark as Paid"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => onEdit(invoice)}
                              className="text-orange-600 hover:text-orange-900 mr-3"
                              title="Edit Invoice"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => onDelete(invoice.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Invoice"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
