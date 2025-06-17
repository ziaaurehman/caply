import { create } from 'zustand';
import { StorageFile, StorageFolder } from '../lib/types';

type StorageState = {
  folders: StorageFolder[];
  isLoading: boolean;
  error: string | null;
  fetchFolders: () => Promise<void>;
  uploadFile: (folder: string, file: File, sharedWithTeam?: boolean) => Promise<StorageFile>;
  deleteFile: (fileId: string) => Promise<void>;
  toggleShared: (fileId: string) => Promise<void>;
};

// Mock data
const mockFolders: StorageFolder[] = [
  {
    id: '1',
    name: 'Invoices',
    type: 'invoices',
    files: [
      {
        id: '1',
        name: 'Invoice-2025-001.pdf',
        folder: 'invoices',
        size: 245760, // 240KB
        type: 'application/pdf',
        url: 'https://example.com/files/invoice-001.pdf',
        uploadedBy: '1',
        uploadedAt: '2025-02-15T10:30:00Z',
        sharedWithTeam: false,
      },
    ],
  },
  {
    id: '2',
    name: 'Expenses',
    type: 'expenses',
    files: [
      {
        id: '2',
        name: 'Receipt-Feb2025.jpg',
        folder: 'expenses',
        size: 512000, // 500KB
        type: 'image/jpeg',
        url: 'https://example.com/files/receipt-feb.jpg',
        uploadedBy: '1',
        uploadedAt: '2025-02-16T14:20:00Z',
        sharedWithTeam: true,
      },
    ],
  },
  {
    id: '3',
    name: 'Documents',
    type: 'documents',
    files: [
      {
        id: '3',
        name: 'Project-Plan-2025.xlsx',
        folder: 'documents',
        size: 1048576, // 1MB
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        url: 'https://example.com/files/project-plan.xlsx',
        uploadedBy: '1',
        uploadedAt: '2025-02-17T09:15:00Z',
        sharedWithTeam: true,
      },
    ],
  },
];

export const useStorageStore = create<StorageState>((set, get) => ({
  folders: [],
  isLoading: false,
  error: null,

  fetchFolders: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      set({ folders: mockFolders, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch folders', isLoading: false });
    }
  },

  uploadFile: async (folder, file, sharedWithTeam = false) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newFile: StorageFile = {
        id: Date.now().toString(),
        name: file.name,
        folder: folder as 'invoices' | 'expenses' | 'documents',
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        uploadedBy: '1', // Current user ID
        uploadedAt: new Date().toISOString(),
        sharedWithTeam,
      };

      set(state => ({
        folders: state.folders.map(f => 
          f.type === folder
            ? { ...f, files: [...f.files, newFile] }
            : f
        ),
        isLoading: false,
      }));

      return newFile;
    } catch (error) {
      set({ error: 'Failed to upload file', isLoading: false });
      throw error;
    }
  },

  deleteFile: async (fileId) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      set(state => ({
        folders: state.folders.map(folder => ({
          ...folder,
          files: folder.files.filter(file => file.id !== fileId),
        })),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to delete file', isLoading: false });
      throw error;
    }
  },

  toggleShared: async (fileId) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      set(state => ({
        folders: state.folders.map(folder => ({
          ...folder,
          files: folder.files.map(file =>
            file.id === fileId
              ? { ...file, sharedWithTeam: !file.sharedWithTeam }
              : file
          ),
        })),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to update sharing settings', isLoading: false });
      throw error;
    }
  },
}));