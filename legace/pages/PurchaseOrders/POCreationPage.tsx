import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Plus, Trash2, FileText, Send, Eye, Upload } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import POPreviewModal from './POPreviewModal';

interface LineItem {
  id: string;
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
}

interface Client {
  id: string;
  name: string;
  country: string;
  province?: string;
}

const mockClients: Client[] = [
  { id: '1', name: 'Acme Corp', country: 'Canada', province: 'Ontario' },
  { id: '2', name: 'Global Tech', country: 'United States' },
  { id: '3', name: 'Canadian Solutions', country: 'Canada', province: 'Quebec' },
  { id: '4', name: 'West Coast Systems', country: 'Canada', province: 'British Columbia' },
];

const POCreationPage: React.FC = () => {
  const [poNumber, setPoNumber] = useState('');
  const [estimateId, setEstimateId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [currency, setCurrency] = useState('CAD');
  const [removeTax, setRemoveTax] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'sent' | 'approved'>('draft');
  const [showPreview, setShowPreview] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);

  const client = mockClients.find(c => c.id === selectedClient);

  const getTaxRates = (province?: string) => {
    if (!province) return { gst: 0, pst: 0, hst: 0 };
    
    switch (province) {
      case 'Alberta':
      case 'Yukon':
      case 'Northwest Territories':
      case 'Nunavut':
        return { gst: 0.05, pst: 0, hst: 0 };
      case 'British Columbia':
        return { gst: 0.05, pst: 0.07, hst: 0 };
      case 'Manitoba':
        return { gst: 0.05, pst: 0.07, hst: 0 };
      case 'Saskatchewan':
        return { gst: 0.05, pst: 0.06, hst: 0 };
      case 'Quebec':
        return { gst: 0.05, pst: 0.09975, hst: 0 };
      case 'Ontario':
        return { gst: 0, pst: 0, hst: 0.13 };
      case 'Nova Scotia':
      case 'New Brunswick':
      case 'Prince Edward Island':
      case 'Newfoundland and Labrador':
        return { gst: 0, pst: 0, hst: 0.15 };
      default:
        return { gst: 0, pst: 0, hst: 0 };
    }
  };

  const calculateLineItemTotal = (item: LineItem) => {
    return item.quantity * item.unitPrice;
  };

  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      type: 'Service',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxable: true,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    );

    if (removeTax || !client?.country === 'Canada') {
      return {
        subtotal,
        gst: 0,
        pst: 0,
        hst: 0,
        total: subtotal,
      };
    }

    const { gst, pst, hst } = getTaxRates(client?.province);
    const taxableAmount = lineItems
      .filter(item => item.taxable)
      .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const gstAmount = taxableAmount * gst;
    const pstAmount = taxableAmount * pst;
    const hstAmount = taxableAmount * hst;

    return {
      subtotal,
      gst: gstAmount,
      pst: pstAmount,
      hst: hstAmount,
      total: subtotal + gstAmount + pstAmount + hstAmount,
    };
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo file size must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setLogo(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Purchase Order</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage purchase orders
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
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
          <Button
            variant="outline"
            onClick={() => {/* Export functionality */}}
            leftIcon={<FileText size={18} />}
          >
            Export as PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Company Logo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  {logo ? (
                    <div className="relative w-32 h-32">
                      <img
                        src={logo}
                        alt="Company Logo"
                        className="w-full h-full object-contain"
                      />
                      <button
                        onClick={() => setLogo(null)}
                        className="absolute top-0 right-0 bg-error-100 text-error-600 p-1 rounded-full hover:bg-error-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Upload size={24} className="mx-auto text-gray-400" />
                        <span className="mt-2 block text-sm font-medium text-gray-600">
                          Upload Logo
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg"
                      onChange={handleLogoUpload}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary-50 file:text-primary-700
                        hover:file:bg-primary-100"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Supported formats: PNG, JPG, SVG. Max size: 2MB
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    PO Number
                  </label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="Auto-generated"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Estimate ID (Optional)
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
                    placeholder="Project or delivery description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Client
                  </label>
                  <select
                    value={selectedClient}
                    onChange={(e) => {
                      setSelectedClient(e.target.value);
                      const client = mockClients.find(c => c.id === e.target.value);
                      setRemoveTax(client?.country !== 'Canada');
                    }}
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
                    <option value="USD">🇺🇸 USD - United States Dollar</option>
                  </select>
                </div>
              </div>

              {client?.country !== 'Canada' && (
                <div className="mt-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={removeTax}
                      onChange={(e) => setRemoveTax(e.target.checked)}
                      className="rounded text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      Remove tax – Client is outside Canada
                    </span>
                  </label>
                </div>
              )}
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
                  onClick={handleAddLineItem}
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
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-1 text-center">Tax</div>
                </div>

                {lineItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-2">
                      <select
                        value={item.type}
                        onChange={(e) => updateLineItem(item.id, { type: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option>Service</option>
                        <option>Product</option>
                      </select>
                    </div>
                    
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                        placeholder="Description"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, { quantity: Number(e.target.value) })}
                        min="1"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-right"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, { unitPrice: Number(e.target.value) })}
                        min="0"
                        step="0.01"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-right"
                      />
                    </div>

                    <div className="col-span-1 text-right text-sm font-medium">
                      {formatCurrency(calculateLineItemTotal(item), currency)}
                    </div>
                    
                    <div className="col-span-1 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={item.taxable}
                        onChange={(e) => updateLineItem(item.id, { taxable: e.target.checked })}
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                ))}

                {lineItems.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No items added yet. Click "Add Item" to get started.
                  </div>
                )}

                {lineItems.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-8 text-right font-medium text-gray-500">
                        Subtotal:
                      </div>
                      <div className="col-span-3 text-right font-medium">
                        {formatCurrency(totals.subtotal, currency)}
                      </div>
                      <div className="col-span-1" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Add any internal notes here (not visible to client)"
              />
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
                  <span className="font-medium">{currency} {totals.subtotal.toFixed(2)}</span>
                </div>

                {!removeTax && client?.country === 'Canada' && (
                  <>
                    {totals.gst > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">GST (5%)</span>
                        <span className="font-medium">{currency} {totals.gst.toFixed(2)}</span>
                      </div>
                    )}
                    {totals.pst > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          {client?.province === 'Quebec' ? 'QST' : 'PST'}
                          ({(getTaxRates(client?.province).pst * 100).toFixed(1)}%)
                        </span>
                        <span className="font-medium">{currency} {totals.pst.toFixed(2)}</span>
                      </div>
                    )}
                    {totals.hst > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          HST ({(getTaxRates(client?.province).hst * 100).toFixed(1)}%)
                        </span>
                        <span className="font-medium">{currency} {totals.hst.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total</span>
                    <span>{currency} {totals.total.toFixed(2)}</span>
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
                    status === 'approved' && "bg-success-100 text-success-800"
                  )}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <POPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        data={{
          poNumber,
          estimateId,
          issueDate,
          subject,
          client: mockClients.find(c => c.id === selectedClient),
          currency,
          lineItems,
          totals: calculateTotals(),
          status,
          logo,
        }}
      />
    </div>
  );
};

export default POCreationPage;