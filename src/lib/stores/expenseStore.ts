"use client"

import { create } from 'zustand';
import { FileWithPreview } from '@/components/ui/FileUpload';

export interface Expense {
  id: string;
  date: string;
  amount: number;
  currency: string;
  category: string;
  projectId?: string;
  description: string;
  attachments: FileWithPreview[];
  status: 'pending' | 'approved' | 'rejected';
}

export const categories = [
  'Salaries',
  'Software',
  'Travel',
  'Marketing',
  'Infrastructure',
  'Other',
];

export const currencies = [
  { code: 'CAD', symbol: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'USD', symbol: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', symbol: '🇪🇺', name: 'Euro' },
  { code: 'GBP', symbol: '🇬🇧', name: 'British Pound' },
];

interface ExpenseState {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'status'>) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  updateExpenseStatus: (id: string, status: 'pending' | 'approved' | 'rejected') => void;
}

const mockExpenses: Expense[] = [
  {
    id: '1',
    date: '2023-10-15',
    amount: 1250.50,
    currency: 'CAD',
    category: 'Software',
    projectId: '1',
    description: 'Annual subscription for design software',
    attachments: [],
    status: 'approved',
  },
  {
    id: '2',
    date: '2023-10-20',
    amount: 345.75,
    currency: 'CAD',
    category: 'Travel',
    projectId: '2',
    description: 'Client meeting travel expenses',
    attachments: [],
    status: 'pending',
  },
  {
    id: '3',
    date: '2023-10-25',
    amount: 89.99,
    currency: 'USD',
    category: 'Marketing',
    description: 'Social media ads',
    attachments: [],
    status: 'approved',
  },
];

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: mockExpenses,
  
  addExpense: (expense) => set((state) => ({
    expenses: [...state.expenses, {
      ...expense,
      id: Date.now().toString(),
      status: 'pending',
    }],
  })),
  
  updateExpense: (updatedExpense) => set((state) => ({
    expenses: state.expenses.map(expense => 
      expense.id === updatedExpense.id ? updatedExpense : expense
    ),
  })),
  
  deleteExpense: (id) => set((state) => ({
    expenses: state.expenses.filter(expense => expense.id !== id),
  })),
  
  updateExpenseStatus: (id, status) => set((state) => ({
    expenses: state.expenses.map(expense => 
      expense.id === id ? { ...expense, status } : expense
    ),
  })),
})); 