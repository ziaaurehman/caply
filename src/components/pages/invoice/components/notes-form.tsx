// NotesForm.tsx
import React from "react";
import { LocalInvoice } from "./invoice-types";

interface NotesFormProps {
  currentInvoice: LocalInvoice;
  setCurrentInvoice: React.Dispatch<React.SetStateAction<LocalInvoice>>;
}

export const NotesForm: React.FC<NotesFormProps> = ({
  currentInvoice,
  setCurrentInvoice,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Notes<span className="text-red-500">*</span></h2>
      <textarea
        value={currentInvoice.notes}
        onChange={(e) =>
          setCurrentInvoice({
            ...currentInvoice,
            notes: e.target.value,
          })
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        rows={4}
        placeholder="Add any notes or payment instructions for the client"
      />
    </div>
  );
};
