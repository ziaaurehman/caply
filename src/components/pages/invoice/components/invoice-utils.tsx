// utils.tsx
import React from "react";
import { LocalInvoice } from "./invoice-types";

export const formatCurrency = (amount: number, currency = "USD"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

export const generateInvoiceNumber = (count: number = 0) => {
  const now = new Date();

  const date = now
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, ""); // YYYYMMDD

  const time = now
    .toTimeString()
    .slice(0, 8)
    .replace(/:/g, ""); // HHMMSS

  const counter = String(count + 1).padStart(3, "0");

  return `INV-${date}-${time}-${counter}`;
};


export const generatePONumber = (): string => {
  return `PO-${Date.now()}`;
};

export const getStatusBadge = (status: LocalInvoice["status"]) => {
  let color = "";
  switch (status) {
    case "paid":
      color = "bg-green-100 text-green-800";
      break;
    case "sent":
      color = "bg-blue-100 text-blue-800";
      break;
    case "overdue":
      color = "bg-red-100 text-red-800";
      break;
    case "draft":
    default:
      color = "bg-gray-100 text-gray-800";
      break;
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
