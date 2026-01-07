// types.ts
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export interface LocalInvoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  issueDate: string;
  dueDate: string;
  projectId: string;
  projectName: string;
  paymentMethod: string;
  currency: string;
  isInternational?: boolean;
  isManualTax?: boolean;
  manualTaxAmount?: number;
  province: string;
  lineItems: LineItem[];
  discountType: "fixed" | "percentage" | "none";
  discount: number;
  notes: string;
  status: "draft" | "sent" | "paid" | "overdue";
  poNumber: string;
}

export interface Calculations {
  subtotal: number;
  discountAmount: number;
  federalTax: number;
  provincialTax: number;
  total: number;
}

export const PAYMENT_METHODS = ["Bank Transfer", "Credit Card", "Check", "PayPal"];
export const CURRENCIES = ["USD", "CAD", "EUR", "GBP"];
export const UNITS = ["Hour", "Day", "Project", "Unit", "Item"];
export const TAX_RATES: {
  [key: string]: { name: string; federal: number; provincial: number };
} = {
  ON: { name: "Ontario", federal: 5, provincial: 8 },
  QC: { name: "Quebec", federal: 5, provincial: 9.975 },
  BC: { name: "British Columbia", federal: 5, provincial: 5 },
  AB: { name: "Alberta", federal: 5, provincial: 0 },
};
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "CA$",
  EUR: "€",
  GBP: "£",
};
