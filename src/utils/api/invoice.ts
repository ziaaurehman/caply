export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  position?: number;
  createdAt?: string;
}

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  contactPerson?: string;
  notes?: string | null;
  status: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface Project {
  id: string;
 
  name: string;
  
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  clientId: string;
  client?: Client; // Populated client
  project?: Project; // Populated client

  projectId?: string;
  invoiceNumber: string;
  companyName?: string;
  companyAddress?: string;
  province?: string;
  isInternational?: boolean;
  paymentMethod?: string;
  companyPhone?: string;
  title: string;
  description?: string;
  subtotal: number;
  discountAmount: string;
  discounttype: "fixed" | "percentage" | "none";
  discountPercentage: string;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: string;
  paidDate?: string;
  poNumber?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  lineItems?: InvoiceLineItem[];
}

export interface CreateInvoiceData {
  clientId: string;
  projectId?: string;
  invoiceNumber: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  isInternational: boolean;
  paymentMethod: string;
  province: string;
  discounttype: string;
  title: string;
  description?: string;
  subtotal?: number;
  discountAmount?: number;
  discountPercentage?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  issueDate: string;
  dueDate: string;
  status?: string;
  poNumber?: string;
  notes?: string;
  lineItems?: Omit<InvoiceLineItem, "id" | "createdAt">[];
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {
  id: string;
}

export interface InvoicesResponse {
  invoices: Invoice[];
}

export interface InvoiceResponse {
  invoice: Invoice;
}

export const invoiceAPI = {
  // Get all invoices
  getInvoices: async (organizationId: string): Promise<InvoicesResponse> => {
    const res = await fetch(`/api/invoices?organizationId=${organizationId}`, {
      headers: { "x-organization-id": organizationId },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to fetch invoices");
    }
    const data = await res.json();
    return { invoices: data.invoices || [] };
  },

  // Get single invoice
  getInvoice: async (
    id: string,
    organizationId: string
  ): Promise<InvoiceResponse> => {
    const res = await fetch(
      `/api/invoices?invoiceId=${id}&organizationId=${organizationId}`,
      {
        headers: { "x-organization-id": organizationId },
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to fetch invoice");
    }
    const data = await res.json();
    return { invoice: data.invoice };
  },

  // Create invoice
  createInvoice: async (
    data: CreateInvoiceData & { organizationId: string }
  ): Promise<InvoiceResponse> => {
    const { organizationId, ...invoiceData } = data;
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify({ ...invoiceData, organizationId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to create invoice");
    }
    const result = await res.json();
    return { invoice: result.invoice };
  },

  // Update invoice
  updateInvoice: async (
    data: UpdateInvoiceData & { organizationId: string }
  ): Promise<InvoiceResponse> => {
    const { organizationId, ...invoiceData } = data;
    const res = await fetch("/api/invoices", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify(invoiceData),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update invoice");
    }
    const result = await res.json();
    return { invoice: result.invoice };
  },

  // Delete invoice
  deleteInvoice: async (id: string, organizationId: string): Promise<void> => {
    const res = await fetch(
      `/api/invoices?invoiceId=${id}&organizationId=${organizationId}`,
      {
        method: "DELETE",
        headers: { "x-organization-id": organizationId },
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete invoice");
    }
  },
};
