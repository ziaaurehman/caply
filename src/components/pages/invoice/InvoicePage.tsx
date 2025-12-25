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
import { ArrowLeft, Currency, Eye } from "lucide-react";
import { DeleteModal } from "./components/delete-model";
import { SaveDraftModal } from "./components/save-draft-modal";

const InvoicePage: React.FC = () => {
  const [view, setView] = useState<"list" | "create" | "view">("list");
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
  const [editingInvoice, setEditingInvoice] = useState<InvoiceType | null>(
    null
  );
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceType | null>(
    null
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
  const [originalInvoice, setOriginalInvoice] = useState<LocalInvoice | null>(
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
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
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
      const initialInvoice: LocalInvoice = {
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
            description: item.description || "",
            quantity: Number(item.quantity || 0),
            unit: "Unit" as string, // InvoiceLineItem doesn't have unit, default to "Unit"
            unitPrice: Number(item.unitPrice || 0),
            amount: Number(item.amount || 0),
          })) || [],
        discountType: editingInvoice.discounttype,
        discount:
          Number(editingInvoice.discountPercentage) ||
          Number(editingInvoice.discountAmount) ||
          0,
        notes: editingInvoice.notes || "",
        status: (editingInvoice.status as LocalInvoice["status"]) || "draft",
        poNumber: editingInvoice.poNumber || "",
      };
      setCurrentInvoice(initialInvoice);
      setOriginalInvoice(JSON.parse(JSON.stringify(initialInvoice))); // Deep copy
      setHasUnsavedChanges(false);
    }
  }, [editingInvoice]);

  useEffect(() => {
    if (viewingInvoice) {
      setCurrentInvoice({
        id: viewingInvoice.id,
        invoiceNumber: viewingInvoice.invoiceNumber,
        clientId: viewingInvoice.clientId,
        clientName: viewingInvoice.client?.name || "",
        clientEmail: viewingInvoice.client?.email || "",
        clientAddress: viewingInvoice.client?.address || "",
        companyName: viewingInvoice.companyName || "",
        companyAddress: viewingInvoice.companyAddress || "",
        companyPhone: viewingInvoice.companyPhone || "",
        issueDate: viewingInvoice.issueDate.split("T")[0],
        dueDate: viewingInvoice.dueDate.split("T")[0],
        projectId: viewingInvoice.projectId || "",
        projectName: viewingInvoice.project?.name || "",
        paymentMethod: viewingInvoice.paymentMethod || "",
        currency: viewingInvoice.currency,
        isInternational: viewingInvoice.isInternational,
        province: viewingInvoice.province || "",
        lineItems:
          viewingInvoice.lineItems?.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity),
            unit: "Unit",
            unitPrice: Number(item.unitPrice),
            amount: Number(item.amount),
          })) || [],
        discountType: viewingInvoice.discounttype,
        discount:
          Number(viewingInvoice.discountPercentage) ||
          Number(viewingInvoice.discountAmount) ||
          0,
        notes: viewingInvoice.notes || "",
        status: (viewingInvoice.status as LocalInvoice["status"]) || "draft",
        poNumber: viewingInvoice.poNumber || "",
      });
    }
  }, [viewingInvoice]);

  // Track changes to detect unsaved changes - only for editing existing invoices
  useEffect(() => {
    if (view === "create" && editingInvoice && originalInvoice) {
      // Compare current invoice with original using the same normalization
      const normalizedCurrent = normalizeInvoiceForComparison(currentInvoice);
      const normalizedOriginal = normalizeInvoiceForComparison(originalInvoice);

      const hasChanges =
        JSON.stringify(normalizedCurrent) !==
        JSON.stringify(normalizedOriginal);
      setHasUnsavedChanges(hasChanges);
    } else if (view === "create" && !editingInvoice) {
      // For new invoices, check if any meaningful data has been entered
      const hasData =
        currentInvoice.clientId !== "" ||
        currentInvoice.companyName !== "" ||
        currentInvoice.lineItems.length > 0 ||
        currentInvoice.clientEmail !== "";
      setHasUnsavedChanges(hasData);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [currentInvoice, view, editingInvoice, originalInvoice]);

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

    // ✅ store applied tax rate
    let appliedTaxRate: { federal: number; provincial: number } | null = null;

    if (!currentInvoice.isInternational && currentInvoice.province) {
      const TAX_RATES: Record<string, { federal: number; provincial: number }> =
        {
          ON: { federal: 5, provincial: 8 },
          QC: { federal: 5, provincial: 9.975 },
          BC: { federal: 5, provincial: 5 },
          AB: { federal: 5, provincial: 0 },
        };

      appliedTaxRate = TAX_RATES[currentInvoice.province] ?? null;

      if (appliedTaxRate) {
        const taxableAmount = subtotal - discountAmount;
        federalTax = taxableAmount * (appliedTaxRate.federal / 100);
        provincialTax = taxableAmount * (appliedTaxRate.provincial / 100);
      }
    }

    const total = subtotal - discountAmount + federalTax + provincialTax;

    return {
      subtotal,
      discountAmount,
      federalTax,
      provincialTax,
      total,
      taxRate: appliedTaxRate, // ✅ returned
      Currency: currentInvoice.currency,
    };
  }, [currentInvoice]);

  const resetStates = () => {
    setShowPreview(false);
    setHasUnsavedChanges(false);
    setShowSaveDraftModal(false);
    setOriginalInvoice(null);
  };

  const handleCreateNew = () => {
    resetStates();
    setEditingInvoice(null);
    setViewingInvoice(null);
    setOriginalInvoice(null);
    setView("create");
  };

  const handleEdit = (invoice: InvoiceType) => {
    resetStates();
    setViewingInvoice(null);
    setEditingInvoice(null);
    setTimeout(() => setEditingInvoice(invoice), 0);
    setView("create");
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
    resetStates();
    setEditingInvoice(null);
    setViewingInvoice(invoice);
    setShowPreview(true);
    setView("view");
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

      resetStates();
      setView("list");
      setEditingInvoice(null);
      setViewingInvoice(null);
      setOriginalInvoice(null);
      setShowSaveDraftModal(false);

      // Show appropriate success message based on status
      if (status === "sent") {
        toast.success("Invoice sent successfully!");
      } else if (status === "draft") {
        toast.success("Invoice saved as draft successfully!");
      } else {
        toast.success("Invoice saved successfully!");
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      alert("Failed to save invoice");
    }
  };

  const handleUpdate = async (status?: string) => {
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
        dueDate: currentInvoice.dueDate,
        paymentMethod: currentInvoice.paymentMethod,
        isInternational: currentInvoice.isInternational,
        province: currentInvoice.province,
        currency: currentInvoice.currency,
        poNumber: currentInvoice.poNumber,
        notes: currentInvoice.notes,
        status: status ?? currentInvoice.status,
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

      await updateInvoiceMutation.mutateAsync({
        ...invoiceData,
        id: currentInvoice.id,
        organizationId,
      } as UpdateInvoiceData & { organizationId: string });

      resetStates();
      setView("list");
      setEditingInvoice(null);
      setViewingInvoice(null);
      setOriginalInvoice(null);
      setShowSaveDraftModal(false);

      if (status === "sent") {
        toast.success("Invoice sent successfully!");
      } else {
        toast.success("Invoice updated successfully!");
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
      alert("Failed to update invoice");
    }
  };

  const validateInvoiceForSending = (): { valid: boolean; error?: string } => {
    if (!currentInvoice.clientId) {
      return { valid: false, error: "Please select a client" };
    }
    if (!currentInvoice.clientEmail || !currentInvoice.clientEmail.trim()) {
      return { valid: false, error: "Please enter client email address" };
    }
    if (!currentInvoice.companyName || !currentInvoice.companyName.trim()) {
      return { valid: false, error: "Please enter company name" };
    }
    if (
      !currentInvoice.companyAddress ||
      !currentInvoice.companyAddress.trim()
    ) {
      return { valid: false, error: "Please enter company address" };
    }
    if (!currentInvoice.companyPhone || !currentInvoice.companyPhone.trim()) {
      return { valid: false, error: "Please enter company phone" };
    }
    if (currentInvoice.lineItems.length === 0) {
      return { valid: false, error: "Please add at least one line item" };
    }
    if (!currentInvoice.invoiceNumber || !currentInvoice.invoiceNumber.trim()) {
      return { valid: false, error: "Invoice number is required" };
    }
    if (!currentInvoice.issueDate) {
      return { valid: false, error: "Issue date is required" };
    }
    if (!currentInvoice.dueDate) {
      return { valid: false, error: "Due date is required" };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentInvoice.clientEmail.trim())) {
      return { valid: false, error: "Please enter a valid email address" };
    }

    return { valid: true };
  };

  const handlePreviewAndSend = () => {
    // Validate before showing preview
    const validation = validateInvoiceForSending();
    if (!validation.valid) {
      toast.error(validation.error || "Please fill all required fields");
      return;
    }
    // Show preview first
    setShowPreview(true);
  };

  // Helper function to normalize invoice for comparison
  const normalizeInvoiceForComparison = (invoice: LocalInvoice) => {
    const sortedLineItems = [...invoice.lineItems]
      .map((item) => ({
        id: item.id,
        description: String(item.description || ""),
        quantity: Number(item.quantity || 0),
        unit: String(item.unit || ""),
        unitPrice: Number(item.unitPrice || 0),
        amount: Number(item.amount || 0),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return {
      id: invoice.id,
      invoiceNumber: String(invoice.invoiceNumber || ""),
      clientId: String(invoice.clientId || ""),
      clientName: String(invoice.clientName || ""),
      clientEmail: String(invoice.clientEmail || ""),
      clientAddress: String(invoice.clientAddress || ""),
      companyName: String(invoice.companyName || ""),
      companyAddress: String(invoice.companyAddress || ""),
      companyPhone: String(invoice.companyPhone || ""),
      issueDate: String(invoice.issueDate || ""),
      dueDate: String(invoice.dueDate || ""),
      projectId: String(invoice.projectId || ""),
      projectName: String(invoice.projectName || ""),
      paymentMethod: String(invoice.paymentMethod || ""),
      currency: String(invoice.currency || ""),
      isInternational: Boolean(invoice.isInternational),
      province: String(invoice.province || ""),
      lineItems: sortedLineItems,
      discountType: String(invoice.discountType || "none"),
      discount: Number(invoice.discount || 0),
      notes: String(invoice.notes || ""),
      status: String(invoice.status || "draft"),
      poNumber: String(invoice.poNumber || ""),
    };
  };

  const handleBack = () => {
    // Check if we're in create/edit mode
    if (view === "create") {
      // If editing an existing invoice, check for changes
      if (editingInvoice && originalInvoice) {
        // Direct comparison to ensure we catch changes
        const normalizedCurrent = normalizeInvoiceForComparison(currentInvoice);
        const normalizedOriginal =
          normalizeInvoiceForComparison(originalInvoice);

        const currentStr = JSON.stringify(normalizedCurrent);
        const originalStr = JSON.stringify(normalizedOriginal);

        if (currentStr !== originalStr) {
          setShowSaveDraftModal(true);
          return;
        }
      } else if (!editingInvoice) {
        // For new invoices, check if any meaningful data has been entered
        const hasData =
          currentInvoice.clientId !== "" ||
          currentInvoice.companyName !== "" ||
          currentInvoice.lineItems.length > 0 ||
          currentInvoice.clientEmail !== "";

        if (hasData) {
          setShowSaveDraftModal(true);
          return;
        }
      }
    }

    // No changes, just go back
    resetStates();
    setView("list");
    setEditingInvoice(null);
    setViewingInvoice(null);
    setOriginalInvoice(null);
  };

  const handleSaveDraftConfirm = async () => {
    try {
      await handleSave("draft");
      setShowSaveDraftModal(false);
    } catch (error) {
      // Error is already handled in handleSave
      console.error("Error saving draft:", error);
    }
  };

  const handleSaveDraftCancel = () => {
    setShowSaveDraftModal(false);
    resetStates();
    setView("list");
    setEditingInvoice(null);
    setViewingInvoice(null);
    setOriginalInvoice(null);
  };

  const handleSendInvoice = async () => {
    // Validate before sending
    const validation = validateInvoiceForSending();
    if (!validation.valid) {
      toast.error(validation.error || "Please fill all required fields");
      return;
    }

    const loadingToast = toast.loading("Sending invoice...");

    try {
      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentInvoice, calculations }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invoice");
      }

      await handleSave("sent");
      toast.dismiss(loadingToast);
      toast.success("Invoice sent successfully!");
      resetStates();
      setView("list");
      setEditingInvoice(null);
      setViewingInvoice(null);
    } catch (error: any) {
      console.error("Send invoice error:", error);
      toast.dismiss(loadingToast);
      toast.error(error.message || "Failed to send invoice. Please try again.");
    }
  };
  const handleSendInvoiceDraft = async () => {
    // Validate before sending
    const validation = validateInvoiceForSending();
    if (!validation.valid) {
      toast.error(validation.error || "Please fill all required fields");
      return;
    }

    const loadingToast = toast.loading("Sending invoice...");

    try {
      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentInvoice, calculations }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invoice");
      }

      await handleUpdate("sent");
      toast.dismiss(loadingToast);
      toast.success("Invoice sent successfully!");
      resetStates();
      setView("list");
      setEditingInvoice(null);
      setViewingInvoice(null);
    } catch (error: any) {
      console.error("Send invoice error:", error);
      toast.dismiss(loadingToast);
      toast.error(error.message || "Failed to send invoice. Please try again.");
    }
  };
  const handleSendInvoicejust = async () => {
    // Validate before sending
    const validation = validateInvoiceForSending();
    if (!validation.valid) {
      toast.error(validation.error || "Please fill all required fields");
      return;
    }

    const loadingToast = toast.loading("Sending invoice...");

    try {
      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentInvoice, calculations }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invoice");
      }

      toast.success("Invoice sent successfully!");
      toast.dismiss(loadingToast);
      resetStates();
      setView("list");
      setEditingInvoice(null);
      setViewingInvoice(null);
    } catch (error: any) {
      console.error("Send invoice error:", error);
      toast.dismiss(loadingToast);
      toast.error(error.message || "Failed to send invoice. Please try again.");
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

    const opt: any = {
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
        <SaveDraftModal
          open={showSaveDraftModal}
          onClose={handleSaveDraftCancel}
          onConfirm={handleSaveDraftConfirm}
          isLoading={
            createInvoiceMutation.isPending || updateInvoiceMutation.isPending
          }
        />
      </>
    );
  }

  if (view === "view") {
    return (
      <div className="bg-gray-50 p-4">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-900 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices
            </button>
            <h1 className="text-2xl font-semibold text-gray-800">
              View Invoice
            </h1>
          </div>
          <InvoicePreview
            currentInvoice={currentInvoice}
            calculations={calculations}
            onDownloadPDF={handleDownloadPDF}
            setPreviewRef={setPreviewRef}
            onSendInvoice={
              viewingInvoice?.status === "draft"
                ? handleSendInvoiceDraft
                : handleSendInvoicejust
            }
            isLoading={
              createInvoiceMutation.isPending || updateInvoiceMutation.isPending
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        {!showPreview && (
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-900 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices
            </button>
            <h1 className="text-2xl font-semibold text-gray-800">
              {editingInvoice ? "Edit Invoice" : "Create Invoice"}
            </h1>
          </div>
        )}
        {showPreview && (
          <div className="mb-6">
            <button
              onClick={() => setShowPreview(false)}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-900 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {editingInvoice ? "Edit" : "Create"}
            </button>
            <h1 className="text-2xl font-semibold text-gray-800">
              Preview Invoice
            </h1>
          </div>
        )}
      </div>
      {!showPreview ? (
        <InvoiceFormContainer
          currentInvoice={currentInvoice}
          setCurrentInvoice={(updater) => {
            if (typeof updater === "function") {
              setCurrentInvoice((prev) => {
                const newInvoice = updater(prev);
                if (view === "create") {
                  setHasUnsavedChanges(true);
                }
                return newInvoice;
              });
            } else {
              setCurrentInvoice(updater);
              if (view === "create") {
                setHasUnsavedChanges(true);
              }
            }
          }}
          clientsData={clientsData}
          projectsData={projectsData}
          showPreview={showPreview}
          isLoading={
            createInvoiceMutation.isPending || updateInvoiceMutation.isPending
          }
          isEditing={!!editingInvoice}
          onBack={handleBack}
          onTogglePreview={() => setShowPreview(!showPreview)}
          onSaveDraft={() => handleSave("draft")}
          onSendInvoice={handleSendInvoice}
          onPreviewAndSend={handlePreviewAndSend}
        />
      ) : (
        <InvoicePreview
          currentInvoice={currentInvoice}
          calculations={calculations}
          onDownloadPDF={handleDownloadPDF}
          setPreviewRef={setPreviewRef}
          onSendInvoice={handleSendInvoice}
          isLoading={
            createInvoiceMutation.isPending || updateInvoiceMutation.isPending
          }
        />
      )}
      <SaveDraftModal
        open={showSaveDraftModal}
        onClose={handleSaveDraftCancel}
        onConfirm={handleSaveDraftConfirm}
        isLoading={
          createInvoiceMutation.isPending || updateInvoiceMutation.isPending
        }
      />
    </div>
  );
};

export default InvoicePage;
