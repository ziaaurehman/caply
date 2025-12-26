import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceAPI } from "@/utils/api/invoice";
import type {
  Invoice,
  CreateInvoiceData,
  UpdateInvoiceData,
  InvoicesResponse,
  InvoiceResponse,
} from "@/utils/api/invoice";

export const invoiceKeys = {
  all: ["invoices"] as const,
  list: (organizationId: string) => [...invoiceKeys.all, "list", organizationId] as const,
  detail: (invoiceId: string, organizationId: string) =>
    [...invoiceKeys.all, "detail", invoiceId, organizationId] as const,
};

// ===== QUERY HOOKS =====

export function useInvoices(organizationId: string) {
  return useQuery({
    queryKey: invoiceKeys.list(organizationId),
    queryFn: () => invoiceAPI.getInvoices(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvoice(invoiceId: string, organizationId: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(invoiceId, organizationId),
    queryFn: () => invoiceAPI.getInvoice(invoiceId, organizationId),
    enabled: !!invoiceId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

// ===== MUTATIONS =====

export function useCreateInvoice(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoiceData) =>
      invoiceAPI.createInvoice({ ...data, organizationId }),
    onSuccess: (data) => {
      // Invalidate all invoices list queries
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.all,
        exact: false,
      });

      // Invalidate project queries (invoices are related to projects)
      queryClient.invalidateQueries({
        queryKey: ["projects"],
        exact: false,
      });

      queryClient.setQueryData(
        invoiceKeys.detail(data.invoice.id, organizationId),
        data
      );
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateInvoiceData & { organizationId: string }) =>
      invoiceAPI.updateInvoice(data),
    onSuccess: (data, variables) => {
      // Invalidate all invoices list queries
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.all,
        exact: false,
      });

      // Invalidate project queries (invoices are related to projects)
      queryClient.invalidateQueries({
        queryKey: ["projects"],
        exact: false,
      });

      queryClient.setQueryData(
        invoiceKeys.detail(data.invoice.id, variables.organizationId),
        data
      );
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; organizationId: string }) =>
      invoiceAPI.deleteInvoice(data.id, data.organizationId),
    onSuccess: (_, variables) => {
      // Invalidate all invoices list queries
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.all,
        exact: false,
      });

      // Invalidate project queries (invoices are related to projects)
      queryClient.invalidateQueries({
        queryKey: ["projects"],
        exact: false,
      });

      queryClient.removeQueries({
        queryKey: invoiceKeys.detail(variables.id, variables.organizationId)
      });
    },
  });
}