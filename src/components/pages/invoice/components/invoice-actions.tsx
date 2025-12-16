// InvoiceActions.tsx
import React from "react";
import { ArrowLeft, Eye, Save, Send, Loader2 } from "lucide-react";

interface InvoiceActionsProps {
  showPreview: boolean;
  isLoading: boolean;
  onBack: () => void;
  onTogglePreview: () => void;
  onSaveDraft: () => void;
  onSendInvoice: () => void;
}

export const InvoiceActions: React.FC<InvoiceActionsProps> = ({
  showPreview,
  isLoading,
  onBack,
  onTogglePreview,
  onSaveDraft,
  onSendInvoice,
}) => {
  return (
    <div className="flex gap-3 mb-6 no-print-buttons">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <button
        onClick={onTogglePreview}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <Eye className="h-4 w-4" />
        {showPreview ? "Hide" : "Show"} Preview
      </button>
      <button
        onClick={onSaveDraft}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Draft
      </button>
      <button
        onClick={onSendInvoice}
        disabled={isLoading}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Send Invoice
      </button>
    </div>
  );
};
