"use client"

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, File } from 'lucide-react';
import { FileWithPreview } from './FileUpload';

interface AttachmentSectionProps {
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  title: string;
  maxFiles?: number;
  maxSize?: number; // in MB
  accept?: string;
}

export default function AttachmentSection({
  files,
  onFilesChange,
  title,
  maxFiles = 5,
  maxSize = 10, // 10MB default
  accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg',
}: AttachmentSectionProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (files.length + acceptedFiles.length > maxFiles) {
        alert(`You can only upload up to ${maxFiles} files.`);
        return;
      }

      const newFiles = acceptedFiles.map((file) => {
        // Create preview for images
        const isImage = file.type.startsWith('image/');
        const preview = isImage ? URL.createObjectURL(file) : '';
        
        return Object.assign(file, {
          preview,
        });
      });

      onFilesChange([...files, ...newFiles]);
    },
    [files, onFilesChange, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.split(',').reduce((acc, curr) => {
      const mimeType = curr.trim();
      if (mimeType.startsWith('.')) {
        // Convert extension to mime type
        const ext = mimeType.substring(1);
        if (ext === 'jpg' || ext === 'jpeg') {
          acc['image/jpeg'] = [];
        } else if (ext === 'png') {
          acc['image/png'] = [];
        } else if (ext === 'pdf') {
          acc['application/pdf'] = [];
        } else if (ext === 'doc' || ext === 'docx') {
          acc['application/msword'] = [];
          acc['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = [];
        }
      } else {
        acc[mimeType] = [];
      }
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxSize * 1024 * 1024, // Convert to bytes
  });

  const removeFile = (index: number) => {
    const newFiles = [...files];
    const fileToRemove = newFiles[index];
    
    // Revoke object URL to avoid memory leaks
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {title}
      </label>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 flex justify-center items-center cursor-pointer ${
          isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-500'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            {isDragActive
              ? 'Drop the files here...'
              : `Drag & drop files here, or click to select files`}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {`Up to ${maxFiles} files, max ${maxSize}MB each`}
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <div key={index} className="relative group">
              {file.preview ? (
                <div className="aspect-square overflow-hidden rounded-lg border border-gray-200">
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square flex flex-col items-center justify-center bg-gray-100 rounded-lg border border-gray-200 p-4">
                  <File className="h-8 w-8 text-gray-400" />
                  <span className="mt-2 text-xs text-gray-500 truncate w-full text-center">
                    {file.name}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 