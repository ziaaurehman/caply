import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import FileUpload, { FileWithPreview } from './FileUpload';

interface AttachmentSectionProps {
  title?: string;
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
}

const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  title = 'Attachments',
  files,
  onFilesChange,
  maxFiles = 10,
  maxSize = 10,
  accept,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <FileUpload
          files={files}
          onFilesChange={onFilesChange}
          maxFiles={maxFiles}
          maxSize={maxSize}
          accept={accept}
        />
      </CardContent>
    </Card>
  );
};

export default AttachmentSection;