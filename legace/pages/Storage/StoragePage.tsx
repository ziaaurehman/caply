import React, { useState, useEffect } from 'react';
import { useStorageStore } from '../../store/storageStore';
import { useAuthStore } from '../../store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  Upload,
  Download,
  Trash2,
  Eye,
  FileText,
  Image as ImageIcon,
  File,
  Share2,
  FolderOpen,
  Filter,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import bytes from 'bytes';
import mime from 'mime-types';

const StoragePage: React.FC = () => {
  const { user } = useAuthStore();
  const { folders, fetchFolders, uploadFile, deleteFile, toggleShared } = useStorageStore();
  const [selectedFolder, setSelectedFolder] = useState<string>('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'application/json',
    ];

    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not supported`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Maximum size is 10MB`);
        continue;
      }

      try {
        await uploadFile(selectedFolder, file);
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon size={24} className="text-primary-500" />;
    }
    if (type.includes('pdf')) {
      return <FileText size={24} className="text-error-500" />;
    }
    if (type.includes('sheet') || type.includes('excel')) {
      return <FileText size={24} className="text-success-500" />;
    }
    return <File size={24} className="text-gray-500" />;
  };

  const currentFolder = folders.find(f => f.type === selectedFolder);
  const filteredFiles = currentFolder?.files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storage</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your files and documents
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => fileInputRef.current?.click()}
          leftIcon={<Upload size={18} />}
        >
          Upload File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.csv,.xlsx,.png,.jpg,.jpeg,.json"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Folders */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Folders</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="space-y-1">
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.type)}
                    className={cn(
                      "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      selectedFolder === folder.type
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <FolderOpen
                      size={20}
                      className={cn(
                        "mr-3",
                        selectedFolder === folder.type
                          ? "text-primary-500"
                          : "text-gray-400"
                      )}
                    />
                    <span className="flex-1 text-left">{folder.name}</span>
                    <span className="ml-3 text-xs text-gray-500">
                      {folder.files.length}
                    </span>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Files */}
        <div className="col-span-9">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{currentFolder?.name}</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <Filter
                      size={16}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg",
                  dragOver ? "border-primary-500 bg-primary-50" : "border-gray-300"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Uploaded
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shared
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredFiles.map(file => (
                        <tr key={file.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getFileIcon(file.type)}
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {file.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {mime.extension(file.type)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {bytes(file.size)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleShared(file.id)}
                              className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                file.sharedWithTeam
                                  ? "bg-success-100 text-success-800"
                                  : "bg-gray-100 text-gray-800"
                              )}
                            >
                              <Share2 size={12} className="mr-1" />
                              {file.sharedWithTeam ? 'Shared' : 'Private'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => window.open(file.url, '_blank')}
                              className="text-primary-600 hover:text-primary-900 mr-4"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = file.url;
                                link.download = file.name;
                                link.click();
                              }}
                              className="text-primary-600 hover:text-primary-900 mr-4"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => deleteFile(file.id)}
                              className="text-error-600 hover:text-error-900"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredFiles.length === 0 && (
                    <div className="text-center py-12">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Drop files here or click upload to add files
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StoragePage;