"use client"

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

export interface FileWithPreview extends File {
  preview: string;
}

interface FileUploadProps {
  onFilesChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  accept?: string;
  className?: string;
  currentFiles?: FileWithPreview[];
}

export default function FileUpload({
  onFilesChange,
  maxFiles = 5,
  maxSize = 10, // 10MB default
  accept = 'image/*,application/pdf',
  className = '',
  currentFiles = [],
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (currentFiles.length + acceptedFiles.length > maxFiles) {
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
      }) as FileWithPreview[];

      onFilesChange([...currentFiles, ...newFiles]);
    },
    [currentFiles, onFilesChange, maxFiles]
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

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-md p-6 flex justify-center items-center cursor-pointer ${
        isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-500'
      } ${className}`}
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
  );
} 