import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Plus, Trash2, Calculator, Send, Eye, X } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { getTaxRates } from '../../lib/tax';

interface EstimateItem {
  id: string;
  type: 'service' | 'product' | 'custom';
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  order: number;
}

const EstimatePage: React.FC = () => {
  // Form state
  const [estimateId, setEstimateId] = useState('EST-' + Date.now());
  const [poNumber, setPoNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [currency, setCurrency] = useState('CAD');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'rejected'>('draft');

  // Mock clients data
  const mockClients = [
    { id: '1', name: 'Acme Corp', country: 'Canada', province: 'Ontario' },
    { id: '2', name: 'Global Tech', country: 'United States' },
    { id: '3', name: 'Canadian Solutions', country: 'Canada', province: 'Quebec' },
  ];

  const client = mockClients.find(c => c.id === selectedClient);

  const handleAddItem = () => {
    const newItem: EstimateItem = {
      id: Date.now().toString(),
      type: 'service',
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      order: items.length,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<EstimateItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        updatedItem.amount = updatedItem.quantity * updatedItem.unitPrice;
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discount = (subtotal * discountPercent) / 100;

    if (!client?.country || client.country !== 'Canada') {
      return {
        subtotal,
        discount,
        tax: 0,
        total: subtotal - discount,
      };
    }

    const { gst, pst, hst } = getTaxRates(client.province as any);
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * (gst + pst + hst);

    return {
      subtotal,
      discount,
      tax,
      total: taxableAmount + tax,
    };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Estimate</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage estimates for clients
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => {/* Preview functionality */}}
            leftIcon={<Eye size={18} />}
          >
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => setStatus('sent')}
            leftIcon={<Send size={18} />}
          >
            Send to Client
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Estimate Details */}
          <Card>
            <CardHeader>
              <CardTitle>Estimate Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Estimate ID
                  </label>
                  <input
                    type="text"
                    value={estimateId}
                    onChange={(e) => setEstimateId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    PO Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="Estimate subject or description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Client
                  </label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  >
                    <option value="">Select client...</option>
                    {mockClients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  >
                    <option value="CAD">🇨🇦 CAD - Canadian Dollar</option>
                    <option value="USD">🇺🇸 USD - US Dollar</option>
                    <option value="EUR">🇪🇺 EUR - Euro</option>
                    <option value="GBP">🇬🇧 GBP - British Pound</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Line Items</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  leftIcon={<Plus size={16} />}
                >
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium text-gray-500">
                  <div className="col-span-2">Type</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2 text-right">Quantity</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-1 text-right">Amount</div>
                  <div className="col-span-1 text-center">Actions</div>
                </div>

                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-2">
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(item.id, { type: e.target.value as EstimateItem['type'] })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="service">Service</option>
                        <option value="product">Product</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        placeholder="Description"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                        min="1"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-right"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                        min="0"
                        step="0.01"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-right"
                      />
                    </div>

                    <div className="col-span-1 text-right text-sm font-medium">
                      {formatCurrency(item.amount, currency)}
                    </div>
                    
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-error-600 hover:text-error-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No items added yet. Click "Add Item" to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Add any notes or special instructions..."
              />
              <p className="mt-2 text-sm text-gray-500">
                Supports basic Markdown: *bold*, _italics_
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal, currency)}</span>
                </div>

                {discountPercent > 0 && (
                  <div className="flex justify-between items-center text-error-600">
                    <span>Discount ({discountPercent}%)</span>
                    <span>-{formatCurrency(totals.discount, currency)}</span>
                  </div>
                )}

                {totals.tax > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">{formatCurrency(totals.tax, currency)}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(totals.total, currency)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                    status === 'draft' && "bg-gray-100 text-gray-800",
                    status === 'sent' && "bg-primary-100 text-primary-800",
                    status === 'accepted' && "bg-success-100 text-success-800",
                    status === 'rejected' && "bg-error-100 text-error-800"
                  )}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EstimatePage;