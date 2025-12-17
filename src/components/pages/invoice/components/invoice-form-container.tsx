// InvoiceFormContainer.tsx
import React from "react";
import { ArrowLeft } from "lucide-react";
import { LocalInvoice } from "./invoice-types";
import { CompanyInfoForm } from "./company-info-form";
import { ClientInfoForm } from "./client-info-form";
import { InvoiceDetailsForm } from "./invoice-details-form";
import { CurrencyTaxForm } from "./currency-tax-form";
import { LineItemsForm } from "./line-items-form";
import { NotesForm } from "./notes-form";
import { InvoiceActions } from "./invoice-actions";
import { DiscountForm } from "./discount-form";

interface InvoiceFormContainerProps {
  currentInvoice: LocalInvoice;
  setCurrentInvoice: React.Dispatch<React.SetStateAction<LocalInvoice>>;
  clientsData: any;
  projectsData: any;
  showPreview: boolean;
  isLoading: boolean;
  isEditing: boolean;
  onBack: () => void;
  onTogglePreview: () => void;
  onSaveDraft: () => void;
  onSendInvoice: () => void;
}

export const InvoiceFormContainer: React.FC<InvoiceFormContainerProps> = ({
  currentInvoice,
  setCurrentInvoice,
  clientsData,
  projectsData,
  showPreview,
  isLoading,
  isEditing,
  onBack,
  onTogglePreview,
  onSaveDraft,
  onSendInvoice,
}) => {
  const isClientSelected = Boolean(currentInvoice.clientId);
  const isProjectSelected = Boolean(currentInvoice.projectId);

  return (
    <>
      <div className="flex gap-8">
        {/* Form Section */}
        {!showPreview && (
          <div className="flex-1 space-y-6">
            <CompanyInfoForm
              currentInvoice={currentInvoice}
              setCurrentInvoice={setCurrentInvoice}
            />

            <ClientInfoForm
              currentInvoice={currentInvoice}
              setCurrentInvoice={setCurrentInvoice}
              clientsData={clientsData}
            />

            <InvoiceDetailsForm
              currentInvoice={currentInvoice}
              setCurrentInvoice={setCurrentInvoice}
              projectsData={projectsData}
              isClientSelected={isClientSelected}
            />

            <CurrencyTaxForm
              currentInvoice={currentInvoice}
              setCurrentInvoice={setCurrentInvoice}
            />

            <LineItemsForm
              currentInvoice={currentInvoice}
              setCurrentInvoice={setCurrentInvoice}
              disabled={!isProjectSelected} // 🔥 disable until project selected
            />

            <DiscountForm
              currentInvoice={currentInvoice}
              setCurrentInvoice={setCurrentInvoice}
            />

            <NotesForm
              currentInvoice={currentInvoice}
              setCurrentInvoice={setCurrentInvoice}
            />

            <InvoiceActions
              showPreview={showPreview}
              isLoading={isLoading}
              onBack={onBack}
              onTogglePreview={onTogglePreview}
              onSaveDraft={onSaveDraft}
              onSendInvoice={onSendInvoice}
            />
          </div>
        )}
      </div>
    </>
  );
};
