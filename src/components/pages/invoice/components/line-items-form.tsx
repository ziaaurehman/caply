// LineItemsForm.tsx
import React from "react";
import { Hash, Plus, Trash2 } from "lucide-react";
import { LocalInvoice, LineItem, UNITS } from "./invoice-types";
import { formatCurrency } from "./invoice-utils";

interface LineItemsFormProps {
  currentInvoice: LocalInvoice;
  setCurrentInvoice: React.Dispatch<React.SetStateAction<LocalInvoice>>;
  disabled: boolean;
}

export const LineItemsForm: React.FC<LineItemsFormProps> = ({
  currentInvoice,
  setCurrentInvoice,
  disabled,
}) => {
  const addLineItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: "",
      quantity: 1,
      unit: "Unit",
      unitPrice: 0,
      amount: 0,
    };
    setCurrentInvoice((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setCurrentInvoice((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updatedItem.amount = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      }),
    }));
  };

  const deleteLineItem = (id: string) => {
    setCurrentInvoice((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== id),
    }));
  };

  return (
    <>
      {disabled ? (
        <p className="text-sm text-red-500 mb-2">
          Select a project to enable line items.
        </p>
      ):(  <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Line Items
        </h2>
        <div className="space-y-4">
          {currentInvoice.lineItems.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 items-end p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) =>
                    updateLineItem(item.id, "description", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  placeholder="Service description"
                />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  QTY
                </label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    updateLineItem(
                      item.id,
                      "quantity",
                      Number.parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={item.unit}
                  onChange={(e) =>
                    updateLineItem(item.id, "unit", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Price
                </label>
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateLineItem(
                      item.id,
                      "unitPrice",
                      Number.parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900">
                  {formatCurrency(item.amount, currentInvoice.currency)}
                </div>
              </div>
              <button
                onClick={() => deleteLineItem(item.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addLineItem}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:text-orange-600"
          >
            <Plus className="h-4 w-4" />
            Add Line Item
          </button>
        </div>
      </div>)}

    
    </>
  );
};
