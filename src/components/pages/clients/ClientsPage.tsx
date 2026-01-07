"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import { useConfirmation } from "@/lib/hooks/useConfirmation";
import { createDeleteConfirmation } from "@/utils/confirmations";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import ClientModal from "./ClientModal";
import Pagination from "@/components/ui/Pagination";
import { Input } from "@/components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useClients, useDeleteClient } from "@/lib/hooks/useClients";
import { Client } from "@/utils/api/client";
import { useSearchParams } from "next/navigation";

export default function ClientsPage() {
  const { currentOrganization } = useOrganizationStore();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  const { confirmation, confirm, handleConfirm, handleClose } =
    useConfirmation();

  // Fetch data
  const { data: clientsResponse, isLoading, error } = useClients(
    currentOrganization?.id || ""
  );

  const deleteClientMutation = useDeleteClient();

  const allClients = useMemo(() => clientsResponse?.clients || [], [clientsResponse]);

  // Client-side filtering
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) {
      return allClients;
    }

    const searchLower = searchTerm.toLowerCase();
    return allClients.filter((client) => {
      const name = client.name.toLowerCase();
      const email = client.email?.toLowerCase() || "";
      const contact = client.contactPerson?.toLowerCase() || "";

      return (
        name.includes(searchLower) ||
        email.includes(searchLower) ||
        contact.includes(searchLower)
      );
    });
  }, [allClients, searchTerm]);

  // Client-side pagination
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredClients.slice(startIndex, endIndex);
  }, [filteredClients, currentPage, itemsPerPage]);

  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Reset page on search
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleAddNew = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const client = allClients.find((c) => c.id === id);
    const clientName = client?.name || "this client";

    const confirmation = createDeleteConfirmation({
      itemName: clientName,
      itemType: "Client",
      additionalMessage: "will remove all associated projects and data",
      onDelete: async () => {
        if (!currentOrganization?.id) return;

        await deleteClientMutation.mutateAsync({
          id,
          organizationId: currentOrganization.id,
        });
        toast.success("Client deleted successfully");
      },
    });

    confirm(confirmation.action, confirmation);
  };

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          Error loading clients: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-2">
            Manage your client relationships and contact information
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap text-sm font-medium h-10"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "No clients found" : "No clients yet"}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? `No clients match your search "${searchTerm}"`
                : "Get started by adding your first client"}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAddNew}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                Add Your First Client
              </button>
            )}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-orange-600 hover:text-orange-700 font-medium text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Client Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClients.map((client) => (
                  <TableRow key={client.id} className="group">
                    <TableCell>
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-lg">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">
                            {client.name}
                          </div>
                          {client.website && (
                            <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-orange-600 flex items-center gap-1 mt-0.5">
                              <Globe size={10} /> {client.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">
                        {client.contactPerson || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {client.email && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail size={12} className="mr-2" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone size={12} className="mr-2" />
                            {client.phone}
                          </div>
                        )}
                        {!client.email && !client.phone && (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(client.city || client.country) ? (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin size={14} className="mr-1.5 text-gray-400" />
                          {client.city}{client.city && client.country ? ", " : ""}{client.country}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${client.status === 'active'
                        ? 'bg-green-50 text-green-700 border border-green-100'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                        {client.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          disabled={deleteClientMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {filteredClients.length > 0 && totalPages > 1 && (
              <div className="border-t border-gray-200 p-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        client={selectedClient}
      />

      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={confirmation.confirmText}
        cancelText={confirmation.cancelText}
        type={confirmation.type}
        isLoading={confirmation.isLoading}
      />
    </div>
  );
}
