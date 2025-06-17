import { create } from 'zustand';
import { Invoice, Expense, PLCategory } from '../lib/types';
import { addMonths, format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

// Mock categories
const mockCategories: PLCategory[] = [
  // Revenue categories
  { id: '1', name: 'Consulting Services', type: 'revenue', code: 'REV-CONS' },
  { id: '2', name: 'Development', type: 'revenue', code: 'REV-DEV' },
  { id: '3', name: 'Support & Maintenance', type: 'revenue', code: 'REV-SUPP' },
  
  // Expense categories
  { id: '4', name: 'Salaries & Benefits', type: 'expense', code: 'EXP-SAL' },
  { id: '5', name: 'Software & Tools', type: 'expense', code: 'EXP-SOFT' },
  { id: '6', name: 'Office & Admin', type: 'expense', code: 'EXP-ADMIN' },
  { id: '7', name: 'Marketing', type: 'expense', code: 'EXP-MKT' },
];

// Generate random mock data
const generateMockData = () => {
  const invoices: Invoice[] = [];
  const expenses: Expense[] = [];
  
  // Generate data for the last 12 months
  const endDate = new Date();
  const startDate = addMonths(endDate, -11);
  
  eachMonthOfInterval({ start: startDate, end: endDate }).forEach(date => {
    // Generate 3-5 invoices per month
    const numInvoices = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < numInvoices; i++) {
      const subtotal = Math.random() * 15000 + 5000;
      const tax = subtotal * 0.13;
      invoices.push({
        id: `INV-${format(date, 'yyyyMM')}-${i + 1}`,
        clientId: `CLIENT-${Math.floor(Math.random() * 5) + 1}`,
        issueDate: format(date, 'yyyy-MM-dd'),
        dueDate: format(addMonths(date, 1), 'yyyy-MM-dd'),
        items: [
          {
            id: '1',
            description: 'Professional Services',
            quantity: 1,
            unitPrice: subtotal,
            amount: subtotal,
            category: mockCategories[Math.floor(Math.random() * 3)].code,
          }
        ],
        status: Math.random() > 0.1 ? 'paid' : 'overdue',
        subtotal,
        tax,
        total: subtotal + tax,
      });
    }
    
    // Generate 5-8 expenses per month
    const numExpenses = Math.floor(Math.random() * 4) + 5;
    for (let i = 0; i < numExpenses; i++) {
      expenses.push({
        id: `EXP-${format(date, 'yyyyMM')}-${i + 1}`,
        date: format(date, 'yyyy-MM-dd'),
        amount: Math.random() * 5000 + 1000,
        category: mockCategories[Math.floor(Math.random() * 4) + 3].code,
        description: 'Monthly expense',
        status: 'approved',
      });
    }
  });
  
  return { invoices, expenses };
};

const mockData = generateMockData();

type PLState = {
  categories: PLCategory[];
  invoices: Invoice[];
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  fetchData: (startDate: Date, endDate: Date) => Promise<void>;
  getMonthlyPL: (date: Date) => {
    revenue: { [key: string]: number };
    expenses: { [key: string]: number };
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  };
};

export const usePLStore = create<PLState>((set, get) => ({
  categories: mockCategories,
  invoices: mockData.invoices,
  expenses: mockData.expenses,
  isLoading: false,
  error: null,
  
  fetchData: async (startDate: Date, endDate: Date) => {
    set({ isLoading: true, error: null });
    try {
      // In a real app, we would fetch data from an API
      await new Promise(resolve => setTimeout(resolve, 800));
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch P&L data', isLoading: false });
    }
  },
  
  getMonthlyPL: (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    const monthlyInvoices = get().invoices.filter(
      inv => inv.status === 'paid' && 
      new Date(inv.issueDate) >= start &&
      new Date(inv.issueDate) <= end
    );
    
    const monthlyExpenses = get().expenses.filter(
      exp => exp.status === 'approved' &&
      new Date(exp.date) >= start &&
      new Date(exp.date) <= end
    );
    
    // Calculate revenue by category
    const revenue = monthlyInvoices.reduce((acc, inv) => {
      inv.items.forEach(item => {
        acc[item.category] = (acc[item.category] || 0) + item.amount;
      });
      return acc;
    }, {} as { [key: string]: number });
    
    // Calculate expenses by category
    const expenses = monthlyExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as { [key: string]: number });
    
    const totalRevenue = Object.values(revenue).reduce((sum, val) => sum + val, 0);
    const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
    
    return {
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  },
}));