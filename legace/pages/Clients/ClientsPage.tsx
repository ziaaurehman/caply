import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Plus, Filter, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import ClientModal from './ClientModal';

interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  taxNumber?: string;
  type: 'client' | 'supplier' | 'both';
  status: 'active' | 'inactive';
  notes?: string;
}

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'supplier'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const handleAddClient = (client: Omit<Client, 'id'>) => {
    const newClient: Client = {
      ...client,
      id: Date.now().toString(),
    };
    setClients([...clients, newClient]);
    setShowModal(false);
  };

  const handleEditClient = (client: Client) => {
    setClients(clients.map(c => c.id === client.id ? client : c));
    setShowModal(false);
    setSelectedClient(null);
  };

  const toggleRowExpanded = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const filteredClients = clients.filter(client => {
    if (typeFilter !== 'all' && client.type !== typeFilter && client.type !== 'both') return false;
    if (statusFilter !== 'all' && client.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        client.name.toLowerCase().includes(query) ||
        client.company.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients & Suppliers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your business relationships
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => {/* Export functionality */}}
            leftIcon={<Download size={18} />}
          >
            Export
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setSelectedClient(null);
              setShowModal(true);
            }}
            leftIcon={<Plus size={18} />}
          >
            Add Contact
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <CardTitle>Contact List</CardTitle>
            <div className="flex flex-wrap gap-4">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="all">All Types</option>
                <option value="client">Clients</option>
                <option value="supplier">Suppliers</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map(client => {
                  const isExpanded = expandedRows.includes(client.id);

                  return (
                    <React.Fragment key={client.id}>
                      <tr className={cn(isExpanded && "bg-gray-50")}>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleRowExpanded(client.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? (
                              <ChevronUp size={20} />
                            ) : (
                              <ChevronDown size={20} />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {client.company}
                            </div>
                            <div className="text-sm text-gray-500">
                              {client.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.type === 'both' ? 'Client & Supplier' :
                           client.type.charAt(0).toUpperCase() + client.type.slice(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.address.city}, {client.address.country}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                            client.status === 'active' ? "bg-success-100 text-success-800" : "bg-gray-100 text-gray-800"
                          )}>
                            {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedClient(client);
                              setShowModal(true);
                            }}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">Contact Details</h4>
                                <div className="mt-2 text-sm text-gray-500">
                                  <p>Email: {client.email}</p>
                                  <p>Phone: {client.phone}</p>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">Address</h4>
                                <div className="mt-2 text-sm text-gray-500">
                                  <p>{client.address.street}</p>
                                  <p>
                                    {client.address.city}, {client.address.province} {client.address.postalCode}
                                  </p>
                                  <p>{client.address.country}</p>
                                </div>
                              </div>
                              {client.taxNumber && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">Tax Information</h4>
                                  <div className="mt-2 text-sm text-gray-500">
                                    <p>Tax Number: {client.taxNumber}</p>
                                  </div>
                                </div>
                              )}
                              {client.notes && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">Notes</h4>
                                  <div className="mt-2 text-sm text-gray-500">
                                    <p>{client.notes}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ClientModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedClient(null);
        }}
        onSubmit={selectedClient ? handleEditClient : handleAddClient}
        client={selectedClient}
      />
    </div>
  );
};

export default ClientsPage;