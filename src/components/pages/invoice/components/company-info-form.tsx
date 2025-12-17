// CompanyInfoForm.tsx
import React from "react";
import { Building2 } from "lucide-react";
import { LocalInvoice } from "./invoice-types";

interface CompanyInfoFormProps {
  currentInvoice: LocalInvoice;
  setCurrentInvoice: React.Dispatch<React.SetStateAction<LocalInvoice>>;
}

export const CompanyInfoForm: React.FC<CompanyInfoFormProps> = ({
  currentInvoice,
  setCurrentInvoice,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        Company Information
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={currentInvoice.companyName}
            onChange={(e) =>
              setCurrentInvoice({
                ...currentInvoice,
                companyName: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Address<span className="text-red-500">*</span>
          </label>
          <textarea
            value={currentInvoice.companyAddress}
            onChange={(e) =>
              setCurrentInvoice({
                ...currentInvoice,
                companyAddress: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone<span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={currentInvoice.companyPhone}
            onChange={(e) =>
              setCurrentInvoice({
                ...currentInvoice,
                companyPhone: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>
    </div>
  );
};
