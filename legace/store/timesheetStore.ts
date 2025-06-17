import { create } from 'zustand';
import { TimeEntry } from '../lib/types';

type TimesheetState = {
  entries: TimeEntry[];
  isLoading: boolean;
  error: string | null;
  fetchEntries: () => Promise<void>;
  fetchEntriesByEmployee: (employeeId: string) => Promise<TimeEntry[]>;
  fetchEntriesByProject: (projectId: string) => Promise<TimeEntry[]>;
  addEntry: (entry: Omit<TimeEntry, 'id'>) => Promise<TimeEntry>;
  updateEntry: (id: string, entry: Partial<TimeEntry>) => Promise<TimeEntry>;
  deleteEntry: (id: string) => Promise<void>;
  submitTimesheets: (ids: string[]) => Promise<void>;
  approveTimesheets: (ids: string[]) => Promise<void>;
  rejectTimesheets: (ids: string[], reason: string) => Promise<void>;
  getWeeklyHours: (employeeId: string, startDate: string, endDate: string) => number;
};

// Mock data for demo purposes
const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    employeeId: '1',
    projectId: '1',
    taskId: '1',
    date: '2025-02-01',
    hours: 7.5,
    description: 'Working on homepage redesign',
    status: 'submitted',
  },
  {
    id: '2',
    employeeId: '1',
    projectId: '1',
    taskId: '2',
    date: '2025-02-02',
    hours: 8,
    description: 'Implementing new navigation',
    status: 'submitted',
  },
  {
    id: '3',
    employeeId: '2',
    projectId: '1',
    taskId: '3',
    date: '2025-02-01',
    hours: 4,
    description: 'Wireframes for product pages',
    status: 'submitted',
  },
  {
    id: '4',
    employeeId: '1',
    projectId: '2',
    taskId: '4',
    date: '2025-02-03',
    hours: 6,
    description: 'Setting up mobile app structure',
    status: 'submitted',
  },
  {
    id: '5',
    employeeId: '3',
    projectId: '2',
    taskId: '5',
    date: '2025-02-03',
    hours: 8,
    description: 'API development for user authentication',
    status: 'submitted',
  },
];

export const useTimesheetStore = create<TimesheetState>((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,
  
  fetchEntries: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      set({ entries: mockTimeEntries, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch timesheet entries', isLoading: false });
    }
  },
  
  fetchEntriesByEmployee: async (employeeId) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const filteredEntries = mockTimeEntries.filter(entry => entry.employeeId === employeeId);
      set({ isLoading: false });
      
      return filteredEntries;
    } catch (error) {
      set({ error: 'Failed to fetch employee timesheet entries', isLoading: false });
      throw error;
    }
  },
  
  fetchEntriesByProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const filteredEntries = mockTimeEntries.filter(entry => entry.projectId === projectId);
      set({ isLoading: false });
      
      return filteredEntries;
    } catch (error) {
      set({ error: 'Failed to fetch project timesheet entries', isLoading: false });
      throw error;
    }
  },
  
  addEntry: async (entry) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newEntry: TimeEntry = {
        ...entry,
        id: (get().entries.length + 1).toString(),
        status: 'draft',
      };
      
      set(state => ({ 
        entries: [...state.entries, newEntry], 
        isLoading: false 
      }));
      
      return newEntry;
    } catch (error) {
      set({ error: 'Failed to add timesheet entry', isLoading: false });
      throw error;
    }
  },
  
  updateEntry: async (id, entryData) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedEntries = get().entries.map(entry => 
        entry.id === id ? { ...entry, ...entryData } : entry
      );
      
      set({ entries: updatedEntries, isLoading: false });
      
      const updatedEntry = updatedEntries.find(entry => entry.id === id);
      if (!updatedEntry) {
        throw new Error('Entry not found');
      }
      
      return updatedEntry;
    } catch (error) {
      set({ error: 'Failed to update timesheet entry', isLoading: false });
      throw error;
    }
  },
  
  deleteEntry: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedEntries = get().entries.filter(entry => entry.id !== id);
      set({ entries: updatedEntries, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to delete timesheet entry', isLoading: false });
      throw error;
    }
  },
  
  submitTimesheets: async (ids) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedEntries = get().entries.map(entry => 
        ids.includes(entry.id) ? { ...entry, status: 'submitted' } : entry
      );
      
      set({ entries: updatedEntries, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to submit timesheets', isLoading: false });
      throw error;
    }
  },
  
  approveTimesheets: async (ids) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedEntries = get().entries.map(entry => 
        ids.includes(entry.id) ? { ...entry, status: 'approved' } : entry
      );
      
      set({ entries: updatedEntries, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to approve timesheets', isLoading: false });
      throw error;
    }
  },
  
  rejectTimesheets: async (ids, reason) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedEntries = get().entries.map(entry => 
        ids.includes(entry.id) ? { ...entry, status: 'rejected', rejectionReason: reason } : entry
      );
      
      set({ entries: updatedEntries, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to reject timesheets', isLoading: false });
      throw error;
    }
  },
  
  getWeeklyHours: (employeeId, startDate, endDate) => {
    const employeeEntries = get().entries.filter(
      entry => 
        entry.employeeId === employeeId && 
        entry.date >= startDate && 
        entry.date <= endDate
    );
    
    return employeeEntries.reduce((total, entry) => total + entry.hours, 0);
  },
}));