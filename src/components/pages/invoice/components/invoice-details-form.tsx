// InvoiceDetailsForm.tsx
import React from "react";
import { FileText } from "lucide-react";
import { LocalInvoice, PAYMENT_METHODS } from "./invoice-types";

interface InvoiceDetailsFormProps {
  currentInvoice: LocalInvoice;
  setCurrentInvoice: React.Dispatch<React.SetStateAction<LocalInvoice>>;
  projectsData: any;
  isClientSelected: boolean;
}

export const InvoiceDetailsForm: React.FC<InvoiceDetailsFormProps> = ({
  currentInvoice,
  setCurrentInvoice,
  projectsData,
  isClientSelected,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Invoice Details
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Invoice Number (Auto-Generated)
          </label>
          <input
            type="text"
            value={currentInvoice.invoiceNumber}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PO Number (Auto-Generated)
          </label>
          <input
            type="text"
            value={currentInvoice.poNumber}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Issue Date<span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={currentInvoice.issueDate}
            onChange={(e) =>
              setCurrentInvoice({
                ...currentInvoice,
                issueDate: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Due Date<span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={currentInvoice.dueDate}
            onChange={(e) =>
              setCurrentInvoice({
                ...currentInvoice,
                dueDate: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Name<span className="text-red-500">*</span>
          </label>
          <select
            disabled={!isClientSelected}
            value={currentInvoice.projectId}
            onChange={(e) => {
              const selected = projectsData?.projects?.find(
                (p) => p.id === e.target.value
              );
              setCurrentInvoice((prev) => ({
                ...prev,
                projectId: selected?.id || "",
                projectName: selected?.name || "",
              }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select Project</option>
            {projectsData?.projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method<span className="text-red-500">*</span>
          </label>
          <select
            value={currentInvoice.paymentMethod}
            onChange={(e) =>
              setCurrentInvoice({
                ...currentInvoice,
                paymentMethod: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
