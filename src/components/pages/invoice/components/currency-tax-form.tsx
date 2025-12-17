// CurrencyTaxForm.tsx
import React from "react";
import { Globe } from "lucide-react";
import { LocalInvoice, CURRENCIES, TAX_RATES } from "./invoice-types";
// import { LocalInvoice } from "./invoice-types";


interface CurrencyTaxFormProps {
  currentInvoice: LocalInvoice;
  setCurrentInvoice: React.Dispatch<React.SetStateAction<LocalInvoice>>;
}

export const CurrencyTaxForm: React.FC<CurrencyTaxFormProps> = ({
  currentInvoice,
  setCurrentInvoice,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5" />
        Currency & Tax<span className="text-red-500">*</span>
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            value={currentInvoice.currency}
            onChange={(e) =>
              setCurrentInvoice({
                ...currentInvoice,
                currency: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {CURRENCIES.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            International<span className="text-red-500">*</span>
          </label>
          <select
            value={currentInvoice.isInternational ? "yes" : "no"}
            onChange={(e) =>
              setCurrentInvoice({
                ...currentInvoice,
                isInternational: e.target.value === "yes",
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        {!currentInvoice.isInternational && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Province<span className="text-red-500">*</span>
            </label>
            <select
              value={currentInvoice.province}
              onChange={(e) =>
                setCurrentInvoice({
                  ...currentInvoice,
                  province: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {Object.entries(TAX_RATES).map(([code, { name }]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
