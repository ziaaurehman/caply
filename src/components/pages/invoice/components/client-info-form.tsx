// ClientInfoForm.tsx
import React from "react";
import { User } from "lucide-react";
import { LocalInvoice } from "./invoice-types";

interface ClientInfoFormProps {
  currentInvoice: LocalInvoice;
  setCurrentInvoice: React.Dispatch<React.SetStateAction<LocalInvoice>>;
  clientsData: any;
}

export const ClientInfoForm: React.FC<ClientInfoFormProps> = ({
  currentInvoice,
  setCurrentInvoice,
  clientsData,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <User className="h-5 w-5" />
        Client Information
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Name<span className="text-red-500">*</span>
          </label>
          <select
            value={currentInvoice.clientId}
            onChange={(e) => {
              const selected = clientsData?.clients?.find(
                (c) => c.id === e.target.value
              );
              setCurrentInvoice((prev) => ({
                ...prev,
                clientId: selected?.id || "",
                clientName: selected?.name || "",
                clientAddress: selected?.address || "",
              }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select Client</option>
            {clientsData?.clients?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Address
          </label>
          <textarea
            value={currentInvoice.clientAddress}
            onChange={(e) =>
              setCurrentInvoice({
                ...currentInvoice,
                clientAddress: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};
