"use client"

import { create } from 'zustand';
import { PROVINCES } from '../tax';

export interface EstimateItem {
  id: string;
  type: 'service' | 'product' | 'custom';
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  order: number;
}

export interface Client {
  id: string;
  name: string;
  country: string;
  province?: keyof typeof PROVINCES;
}

export interface Estimate {
  id: string;
  estimateNumber: string;
  poNumber: string;
  issueDate: string;
  subject: string;
  clientId: string;
  currency: string;
  discountPercent: number;
  items: EstimateItem[];
  notes: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
}

interface EstimateState {
  estimates: Estimate[];
  clients: Client[];
  addEstimate: (estimate: Omit<Estimate, 'id'>) => void;
  updateEstimate: (id: string, updates: Partial<Estimate>) => void;
  deleteEstimate: (id: string) => void;
  updateEstimateStatus: (id: string, status: Estimate['status']) => void;
  addEstimateItem: (estimateId: string, item: Omit<EstimateItem, 'id' | 'order'>) => void;
  updateEstimateItem: (estimateId: string, itemId: string, updates: Partial<EstimateItem>) => void;
  removeEstimateItem: (estimateId: string, itemId: string) => void;
}

// Mock clients data
const mockClients: Client[] = [
  { id: '1', name: 'Acme Corp', country: 'Canada', province: 'ON' },
  { id: '2', name: 'Global Tech', country: 'United States' },
  { id: '3', name: 'Canadian Solutions', country: 'Canada', province: 'QC' },
];

// Mock estimates data
const mockEstimates: Estimate[] = [
  {
    id: '1',
    estimateNumber: 'EST-1001',
    poNumber: 'PO-2023-001',
    issueDate: '2023-10-15',
    subject: 'Website Redesign Project',
    clientId: '1',
    currency: 'CAD',
    discountPercent: 0,
    items: [
      {
        id: '101',
        type: 'service',
        description: 'UI/UX Design',
        quantity: 40,
        unitPrice: 120,
        amount: 4800,
        order: 0,
      },
      {
        id: '102',
        type: 'service',
        description: 'Frontend Development',
        quantity: 60,
        unitPrice: 110,
        amount: 6600,
        order: 1,
      }
    ],
    notes: 'Payment due within 30 days of estimate acceptance.',
    status: 'sent',
  },
  {
    id: '2',
    estimateNumber: 'EST-1002',
    poNumber: '',
    issueDate: '2023-10-20',
    subject: 'Mobile App Development',
    clientId: '2',
    currency: 'USD',
    discountPercent: 5,
    items: [
      {
        id: '201',
        type: 'service',
        description: 'iOS App Development',
        quantity: 80,
        unitPrice: 130,
        amount: 10400,
        order: 0,
      },
      {
        id: '202',
        type: 'service',
        description: 'Android App Development',
        quantity: 80,
        unitPrice: 130,
        amount: 10400,
        order: 1,
      }
    ],
    notes: 'Includes 3 rounds of revisions.',
    status: 'draft',
  }
];

export const useEstimateStore = create<EstimateState>((set) => ({
  estimates: mockEstimates,
  clients: mockClients,
  
  addEstimate: (estimate) => set((state) => ({
    estimates: [...state.estimates, { ...estimate, id: Date.now().toString() }],
  })),
  
  updateEstimate: (id, updates) => set((state) => ({
    estimates: state.estimates.map(estimate => 
      estimate.id === id ? { ...estimate, ...updates } : estimate
    ),
  })),
  
  deleteEstimate: (id) => set((state) => ({
    estimates: state.estimates.filter(estimate => estimate.id !== id),
  })),
  
  updateEstimateStatus: (id, status) => set((state) => ({
    estimates: state.estimates.map(estimate => 
      estimate.id === id ? { ...estimate, status } : estimate
    ),
  })),
  
  addEstimateItem: (estimateId, item) => set((state) => {
    const estimate = state.estimates.find(e => e.id === estimateId);
    if (!estimate) return state;
    
    const newItem: EstimateItem = {
      ...item,
      id: Date.now().toString(),
      order: estimate.items.length,
      amount: item.quantity * item.unitPrice,
    };
    
    return {
      estimates: state.estimates.map(e => 
        e.id === estimateId 
          ? { ...e, items: [...e.items, newItem] } 
          : e
      ),
    };
  }),
  
  updateEstimateItem: (estimateId, itemId, updates) => set((state) => {
    const estimate = state.estimates.find(e => e.id === estimateId);
    if (!estimate) return state;
    
    const updatedItems = estimate.items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, ...updates };
        // Recalculate amount if quantity or unitPrice changed
        if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
          updatedItem.amount = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    });
    
    return {
      estimates: state.estimates.map(e => 
        e.id === estimateId ? { ...e, items: updatedItems } : e
      ),
    };
  }),
  
  removeEstimateItem: (estimateId, itemId) => set((state) => {
    const estimate = state.estimates.find(e => e.id === estimateId);
    if (!estimate) return state;
    
    const updatedItems = estimate.items
      .filter(item => item.id !== itemId)
      .map((item, index) => ({ ...item, order: index }));
    
    return {
      estimates: state.estimates.map(e => 
        e.id === estimateId ? { ...e, items: updatedItems } : e
      ),
    };
  }),
})); 