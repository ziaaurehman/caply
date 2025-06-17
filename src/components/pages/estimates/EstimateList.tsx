"use client"

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Search, Filter, Eye, Edit, Trash2, Check, X } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useEstimateStore } from '@/lib/stores/estimateStore';
import { useRouter } from 'next/navigation';

export default function EstimateList() {
  const { estimates, clients, updateEstimateStatus, deleteEstimate } = useEstimateStore();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');
  
  const filteredEstimates = estimates.filter(estimate => {
    // Apply status filter
    if (statusFilter && estimate.status !== statusFilter) return false;
    
    // Apply client filter
    if (clientFilter && estimate.clientId !== clientFilter) return false;
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const client = clients.find(c => c.id === estimate.clientId);
      return (
        estimate.estimateNumber.toLowerCase().includes(query) ||
        estimate.subject.toLowerCase().includes(query) ||
        (client && client.name.toLowerCase().includes(query))
      );
    }
    
    return true;
  });
  
  const handleStatusChange = (id: string, status: 'draft' | 'sent' | 'accepted' | 'rejected') => {
    updateEstimateStatus(id, status);
  };
  
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this estimate?')) {
      deleteEstimate(id);
    }
  };
  
  const handleCreateNew = () => {
    router.push('/estimates/new');
  };
  
  const handleEdit = (id: string) => {
    router.push(`/estimates/edit/${id}`);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-primary-100 text-primary-800';
      case 'accepted': return 'bg-success-100 text-success-800';
      case 'rejected': return 'bg-error-100 text-error-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage estimates for clients
          </p>
        </div>
        
        <div>
          <Button
            variant="default"
            onClick={handleCreateNew}
            leftIcon={<Plus size={18} />}
          >
            Create Estimate
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <CardTitle>All Estimates</CardTitle>
            <div className="flex flex-wrap gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search estimates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
              
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">All Clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimate #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEstimates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No estimates found. Create a new estimate to get started.
                    </td>
                  </tr>
                ) : (
                  filteredEstimates.map(estimate => {
                    const client = clients.find(c => c.id === estimate.clientId);
                    const total = estimate.items.reduce((sum, item) => sum + item.amount, 0);
                    
                    return (
                      <tr key={estimate.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {estimate.estimateNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(estimate.issueDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client?.name || 'Unknown Client'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {estimate.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {formatCurrency(total, estimate.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            getStatusColor(estimate.status)
                          )}>
                            {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(estimate.id)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(estimate.id, 'accepted')}
                              className={cn(
                                "text-success-600 hover:text-success-900",
                                estimate.status === 'accepted' && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={estimate.status === 'accepted'}
                              title="Accept"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(estimate.id, 'rejected')}
                              className={cn(
                                "text-error-600 hover:text-error-900",
                                estimate.status === 'rejected' && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={estimate.status === 'rejected'}
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(estimate.id)}
                              className="text-error-600 hover:text-error-900"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 