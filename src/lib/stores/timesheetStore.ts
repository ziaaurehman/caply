import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface TimesheetEntry {
  id: string;
  employeeId: string;
  date: string;
  projectId: string;
  taskId?: string;
  description: string;
  hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  comment?: string;
}

interface TimesheetStore {
  entries: TimesheetEntry[];
  fetchEntries: () => Promise<void>;
  addEntry: (entry: Omit<TimesheetEntry, 'id' | 'status'>) => Promise<void>;
  updateEntry: (entry: TimesheetEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  approveTimesheets: (ids: string[]) => Promise<void>;
  rejectTimesheets: (ids: string[], reason: string) => Promise<void>;
}

// Mock data
const mockEntries: TimesheetEntry[] = [
  {
    id: '1',
    employeeId: '101',
    date: new Date().toISOString(),
    projectId: '1',
    taskId: 'task-1',
    description: 'Frontend development',
    hours: 8,
    status: 'submitted',
  },
  {
    id: '2',
    employeeId: '102',
    date: new Date().toISOString(),
    projectId: '2',
    taskId: 'task-2',
    description: 'Backend development',
    hours: 6,
    status: 'submitted',
  },
  {
    id: '3',
    employeeId: '103',
    date: new Date().toISOString(),
    projectId: '3',
    taskId: 'task-3',
    description: 'UI design',
    hours: 4,
    status: 'approved',
  },
];

export const useTimesheetStore = create<TimesheetStore>((set) => ({
  entries: [...mockEntries],

  fetchEntries: async () => {
    // In a real app, this would be an API call
    set({ entries: [...mockEntries] });
  },

  addEntry: async (entry) => {
    const newEntry: TimesheetEntry = {
      ...entry,
      id: uuidv4(),
      status: 'draft',
    };

    set((state) => ({
      entries: [...state.entries, newEntry],
    }));
  },

  updateEntry: async (updatedEntry) => {
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id === updatedEntry.id ? updatedEntry : entry
      ),
    }));
  },

  deleteEntry: async (id) => {
    set((state) => ({
      entries: state.entries.filter((entry) => entry.id !== id),
    }));
  },

  approveTimesheets: async (ids) => {
    set((state) => ({
      entries: state.entries.map((entry) =>
        ids.includes(entry.id) ? { ...entry, status: 'approved' } : entry
      ),
    }));
  },

  rejectTimesheets: async (ids, reason) => {
    set((state) => ({
      entries: state.entries.map((entry) =>
        ids.includes(entry.id)
          ? { ...entry, status: 'rejected', comment: reason }
          : entry
      ),
    }));
  },
})); 