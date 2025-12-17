"use client";

// InvoicePage.tsx
import React, { useState, useEffect } from "react";
import { useClientProjects, useClients } from "@/lib/hooks/useClients";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import type {
  CreateInvoiceData,
  UpdateInvoiceData,
  Invoice as InvoiceType,
} from "@/utils/api/invoice";
import {
  useCreateInvoice,
  useDeleteInvoice,
  useInvoices,
  useUpdateInvoice,
} from "@/lib/hooks/useInvoice";
import { toast } from "sonner";
import { useProjectTimesheets } from "@/lib/hooks/useProjects";
import { LocalInvoice, LineItem } from "./components/invoice-types";
import {
  generateInvoiceNumber,
  generatePONumber,
} from "./components/invoice-utils";
import { InvoiceList } from "./components/invoice-list";
import { InvoiceFormContainer } from "./components/invoice-form-container";
import { InvoicePreview } from "./components/invoice-preview";
import { ArrowLeft, Eye } from "lucide-react";
import { DeleteModal } from "./components/delete-model";

const InvoicePage: React.FC = () => {
  const [view, setView] = useState<"list" | "create">("list");
  const { currentOrganization } = useOrganizationStore();
  const organizationId = currentOrganization?.id || "";

  const { data: invoicesData } = useInvoices(organizationId);
  const { data: clientsData } = useClients(organizationId);
  const createInvoiceMutation = useCreateInvoice(organizationId);
  const updateInvoiceMutation = useUpdateInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();

  const [activeTab, setActiveTab] = useState<
    "all" | "draft" | "sent" | "paid" | "overdue"
  >("all");
  const [showPreview, setShowPreview] = useState(false);
  const [showPreviewIcons, setShowPreviewIcons] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceType | null>(
    null
  );
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: string | null;
  }>({
    open: false,
    id: null,
  });
  const [previewRef, setPreviewRef] = useState<HTMLDivElement | null>(null);
  const [currentInvoice, setCurrentInvoice] = useState<LocalInvoice>({
    id: "",
    invoiceNumber: "",
    clientId: "",
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    companyName: "",
    companyAddress: "",
    companyPhone: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    projectId: "",
    projectName: "",
    paymentMethod: "Bank Transfer",
    currency: "CAD",
    isInternational: false,
    province: "ON",
    lineItems: [],
    discountType: "none",
    discount: 0,
    notes: "",
    status: "draft",
    poNumber: "",
  });

  const { data: projectsData } = useClientProjects(
    currentInvoice.clientId,
    organizationId
  );
  const { data: projectsTimeSheetsData } = useProjectTimesheets(
    currentInvoice.projectId,
    organizationId
  );

  const invoices = invoicesData?.invoices || [];

  // Automatically populate line items from approved timesheets
  useEffect(() => {
    if (
      projectsTimeSheetsData?.approved_timesheets &&
      currentInvoice.projectId
    ) {
      const lineItems: LineItem[] = [];

      projectsTimeSheetsData.approved_timesheets.forEach((timesheet) => {
        timesheet.entries.forEach((entry) => {
          const totalHours =
            Number(entry.monday_hours || 0) +
            Number(entry.tuesday_hours || 0) +
            Number(entry.wednesday_hours || 0) +
            Number(entry.thursday_hours || 0) +
            Number(entry.friday_hours || 0);

          if (totalHours > 0) {
            lineItems.push({
              id: `item-${entry.id}`,
              description: entry.task_description,
              quantity: totalHours,
              unit: "Hour",
              unitPrice: Number(projectsTimeSheetsData.project.billingRate),
              amount:
                Number(projectsTimeSheetsData.project.billingRate) * totalHours,
            });
          }
        });
      });

      if (lineItems.length > 0) {
        setCurrentInvoice((prev) => ({ ...prev, lineItems }));
      }
    }
  }, [projectsTimeSheetsData, currentInvoice.projectId]);

  useEffect(() => {
    if (view === "create" && !editingInvoice) {
      const invoiceNumber = generateInvoiceNumber(invoices.length);
      const poNumber = generatePONumber();
      setCurrentInvoice((prev) => ({
        ...prev,
        id: "",
        invoiceNumber,
        poNumber,
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: new Date().toISOString().split("T")[0],
        lineItems: [],
        discountType: "none",
        discount: 0,
        notes: "",
        status: "draft",
        clientId: "",
        projectId: "",
      }));
    }
  }, [view, editingInvoice, invoices.length]);

  useEffect(() => {
    if (editingInvoice) {
      setCurrentInvoice({
        id: editingInvoice.id,
        invoiceNumber: editingInvoice.invoiceNumber,
        clientId: editingInvoice.clientId,
        clientName: editingInvoice.client?.name || "",
        clientEmail: editingInvoice.client?.email || "",
        clientAddress: editingInvoice.client?.address || "",
        companyName: editingInvoice.companyName || "",
        companyAddress: editingInvoice.companyAddress || "",
        companyPhone: editingInvoice.companyPhone || "",
        issueDate: editingInvoice.issueDate.split("T")[0],
        dueDate: editingInvoice.dueDate.split("T")[0],
        projectId: editingInvoice.projectId || "",
        projectName: editingInvoice.project?.name || "",
        paymentMethod: editingInvoice.paymentMethod || "",
        currency: editingInvoice.currency,
        isInternational: editingInvoice.isInternational,
        province: editingInvoice.province || "",
        lineItems:
          editingInvoice.lineItems?.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity),
            unit: "Unit",
            unitPrice: Number(item.unitPrice),
            amount: Number(item.amount),
          })) || [],
        discountType: editingInvoice.discounttype,
        discount:
          Number(editingInvoice.discountPercentage) ||
          Number(editingInvoice.discountAmount) ||
          0,
        notes: editingInvoice.notes || "",
        status: (editingInvoice.status as LocalInvoice["status"]) || "draft",
        poNumber: editingInvoice.poNumber || "",
      });
      setView("create");
    }
  }, [editingInvoice]);

  const calculations = React.useMemo(() => {
    const subtotal = currentInvoice.lineItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    let discountAmount = 0;

    if (currentInvoice.discountType === "percentage") {
      discountAmount = subtotal * (currentInvoice.discount / 100);
    } else if (currentInvoice.discountType === "fixed") {
      discountAmount = currentInvoice.discount;
    }
    discountAmount = Math.min(discountAmount, subtotal);

    let federalTax = 0;
    let provincialTax = 0;

    if (!currentInvoice.isInternational && currentInvoice.province) {
      const TAX_RATES: any = {
        ON: { federal: 5, provincial: 8 },
        QC: { federal: 5, provincial: 9.975 },
        BC: { federal: 5, provincial: 5 },
        AB: { federal: 5, provincial: 0 },
      };
      const taxRate = TAX_RATES[currentInvoice.province];
      const taxableAmount = subtotal - discountAmount;
      federalTax = taxableAmount * (taxRate.federal / 100);
      provincialTax = taxableAmount * (taxRate.provincial / 100);
    }

    const total = subtotal - discountAmount + federalTax + provincialTax;

    return { subtotal, discountAmount, federalTax, provincialTax, total };
  }, [currentInvoice]);

  const handleCreateNew = () => {
    setEditingInvoice(null);
    setView("create");
  };

  const handleEdit = (invoice: InvoiceType) => {
    setEditingInvoice(null);
    setTimeout(() => setEditingInvoice(invoice), 0);
  };

  const handleDeleteRequest = (id: string) => {
    setConfirmDelete({ open: true, id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteInvoiceMutation.mutateAsync({
        id: confirmDelete.id,
        organizationId,
      });
      setConfirmDelete({ open: false, id: null });
    } catch {
      alert("Failed to delete invoice");
    }
  };

  const handleMarkAsPaid = async (invoice: InvoiceType) => {
    try {
      const invoiceData = {
        clientId: invoice.clientId,
        projectId: invoice.projectId || undefined,
        invoiceNumber: invoice.invoiceNumber,
        title: `Invoice ${invoice.invoiceNumber}`,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        poNumber: invoice.poNumber || undefined,
        notes: invoice.notes || undefined,
        status: "paid" as const,
        subtotal: Number(invoice.subtotal),
        discountAmount: Number(invoice.discountAmount),
        discountPercentage: Number(invoice.discountPercentage),
        taxAmount: Number(invoice.taxAmount),
        totalAmount: Number(invoice.totalAmount),
        lineItems:
          invoice.lineItems?.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            amount: Number(item.amount),
          })) || [],
      };

      await updateInvoiceMutation.mutateAsync({
        ...invoiceData,
        id: invoice.id,
        organizationId,
      } as UpdateInvoiceData & { organizationId: string });

      toast.success("Invoice Marked as Paid.");
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      toast.error("Failed to mark invoice as paid");
    }
  };

  const handleViewPDF = (invoice: InvoiceType) => {
    setEditingInvoice(invoice);
    setTimeout(() => setShowPreviewIcons(true), 100);
  };

  const handleSave = async (status?: string) => {
    if (!currentInvoice.clientId) {
      alert("Please select a client.");
      return;
    }
    if (currentInvoice.lineItems.length === 0) {
      alert("Please add at least one line item.");
      return;
    }

    try {
      const invoiceData = {
        clientId: currentInvoice.clientId,
        companyName: currentInvoice.companyName,
        companyAddress: currentInvoice.companyAddress,
        companyPhone: currentInvoice.companyPhone,
        projectId: currentInvoice.projectId || undefined,
        invoiceNumber: currentInvoice.invoiceNumber,
        title: `Invoice ${currentInvoice.invoiceNumber}`,
        issueDate: currentInvoice.issueDate,
        paymentMethod: currentInvoice.paymentMethod,
        isInternational: currentInvoice.isInternational,
        province: currentInvoice.province,
        dueDate: currentInvoice.dueDate,
        currency: currentInvoice.currency,
        poNumber: currentInvoice.poNumber,
        notes: currentInvoice.notes,
        status: status ? status : currentInvoice.status,
        subtotal: calculations.subtotal,
        discountAmount:
          currentInvoice.discountType === "fixed" ? currentInvoice.discount : 0,
        discountPercentage:
          currentInvoice.discountType === "percentage"
            ? currentInvoice.discount
            : 0,
        discounttype: currentInvoice.discountType,
        taxAmount: calculations.federalTax + calculations.provincialTax,
        totalAmount: calculations.total,
        lineItems: currentInvoice.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
      };

      if (editingInvoice) {
        await updateInvoiceMutation.mutateAsync({
          ...invoiceData,
          id: currentInvoice.id,
          organizationId,
        } as UpdateInvoiceData & { organizationId: string });
      } else {
        await createInvoiceMutation.mutateAsync(
          invoiceData as CreateInvoiceData & { organizationId: string }
        );
      }

      setView("list");

      setEditingInvoice(null);
      toast.success(
        status ? "Invoice sent successfully!" : "Invoice saved successfully!"
      );
    } catch (error) {
      console.error("Error saving invoice:", error);
      alert("Failed to save invoice");
    }
  };

  const handleSendInvoice = async () => {
    try {
      toast.loading("Sending invoice...");

      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentInvoice, calculations }),
      });

      if (!res.ok) throw new Error("Email failed");

      await handleSave("sent");
      toast.success("Invoice sent & marked as sent!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to send invoice. Try again.");
    } finally {
      toast.dismiss();
    }
  };

  const handleDownloadPDF = async () => {
    if (!previewRef) return;
    const { default: html2pdf } = await import("html2pdf.js");

    const element = previewRef;
    const actionButtons = element.querySelector(".no-print-buttons");
    if (actionButtons) {
      (actionButtons as HTMLElement).style.display = "none";
    }

    const opt = {
      margin: 10,
      filename: `invoice-${currentInvoice.invoiceNumber || "draft"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        if (actionButtons) {
          (actionButtons as HTMLElement).style.display = "flex";
        }
      });
  };

  if (view === "list") {
    return (
      <>
        <InvoiceList
          invoices={invoices}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onMarkAsPaid={handleMarkAsPaid}
          onViewPDF={handleViewPDF}
        />
        <DeleteModal
          open={confirmDelete.open}
          onClose={() => setConfirmDelete({ open: false, id: null })}
          onConfirm={confirmDeleteAction}
          title="Delete Invoice"
          description="Are you sure you want to delete this invoice? This action cannot be undone."
        />
      </>
    );
  }

  return (
    <div className="bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        {!showPreviewIcons && (
          <div className="mb-6">
            <button
              onClick={() => {
                setShowPreview(false);
                setView("list");
              }}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-900 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices this
            </button>
            <h1 className="text-2xl font-semibold text-gray-800">
              {/* View Invoice */}
              {editingInvoice ? "Edit Invoice" : "Create Invoice"}
            </h1>
          </div>
        )}{" "}
        {showPreviewIcons && !showPreview && (
          <div className="mb-6">
            <button
              onClick={() => {
                setShowPreviewIcons(false);
                setView("list");
              }}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-900 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices
            </button>
            <h1 className="text-2xl font-semibold text-gray-800">
              {editingInvoice ? "Edit Invoice" : "Create Invoice"}
            </h1>
          </div>
        )}{" "}
        {!showPreview && showPreviewIcons && (
          <button
            onClick={() => setShowPreviewIcons(!showPreviewIcons)}
            className="flex items-center gap-2 px-4 py-2 mb-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            {showPreviewIcons ? "Hide" : "Show"} Preview
          </button>
        )}
      </div>
      {!showPreviewIcons && (
        <InvoiceFormContainer
          currentInvoice={currentInvoice}
          setCurrentInvoice={setCurrentInvoice}
          clientsData={clientsData}
          projectsData={projectsData}
          showPreview={showPreview}
          isLoading={
            createInvoiceMutation.isPending || updateInvoiceMutation.isPending
          }
          isEditing={!!editingInvoice}
          onBack={() => {
            setShowPreview(false);
            setView("list");
          }}
          onTogglePreview={() => setShowPreviewIcons(!showPreviewIcons)}
          onSaveDraft={() => handleSave("draft")}
          onSendInvoice={handleSendInvoice}
        />
      )}

      {showPreview && !showPreviewIcons && (
        <InvoicePreview
          currentInvoice={currentInvoice}
          calculations={calculations}
          onDownloadPDF={handleDownloadPDF}
          setPreviewRef={setPreviewRef}
        />
      )}

      {showPreviewIcons && !showPreview && (
        <InvoicePreview
          currentInvoice={currentInvoice}
          calculations={calculations}
          onDownloadPDF={handleDownloadPDF}
          setPreviewRef={setPreviewRef}
        />
      )}
    </div>
  );
};

export default InvoicePage;
