// Existing types...

export type StorageFile = {
  id: string;
  name: string;
  folder: 'invoices' | 'expenses' | 'documents';
  size: number;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  sharedWithTeam: boolean;
};

export type StorageFolder = {
  id: string;
  name: string;
  type: 'invoices' | 'expenses' | 'documents';
  files: StorageFile[];
};