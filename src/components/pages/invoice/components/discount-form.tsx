// DiscountForm.tsx
import React from "react";
import { Percent } from "lucide-react";
import { LocalInvoice } from "./invoice-types";

interface DiscountFormProps {
  currentInvoice: LocalInvoice;
  setCurrentInvoice: React.Dispatch<React.SetStateAction<LocalInvoice>>;
}

export const DiscountForm: React.FC<DiscountFormProps> = ({
  currentInvoice,
  setCurrentInvoice,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Percent className="h-5 w-5" />
        Discount
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Discount Type<span className="text-red-500">*</span>
          </label>
          <select
            value={currentInvoice.discountType}
            onChange={(e) =>
              setCurrentInvoice({
                ...currentInvoice,
                discountType: e.target.value as
                  | "fixed"
                  | "percentage"
                  | "none",
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="none">None</option>
            <option value="fixed">Fixed Amount</option>
            <option value="percentage">Percentage</option>
          </select>
        </div>
        {currentInvoice.discountType !== "none" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount{" "}
              {currentInvoice.discountType === "percentage"
                ? "(%)"
                : `(${currentInvoice.currency})`}
            </label>
            <input
              type="number"
              value={currentInvoice.discount}
              onChange={(e) =>
                setCurrentInvoice({
                  ...currentInvoice,
                  discount: Number.parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};
