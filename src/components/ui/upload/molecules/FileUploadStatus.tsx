/**
 * FileUploadStatus - Molecule Component
 * 
 * Wrapper around unified FileDisplay component for uploading files.
 * Maintains backward compatibility while using consistent styling.
 */

import { FileDisplay, type FileDisplayStatus } from './FileDisplay';
import type { UploadingFile } from '../../../../hooks/useFileUpload';

interface FileUploadStatusProps {
  file: UploadingFile;
  onCancel?: () => void;
  className?: string;
}

export const FileUploadStatus = ({ file, onCancel, className }: FileUploadStatusProps) => {
  // Map UploadingFile status to FileDisplay status
  const getDisplayStatus = (): FileDisplayStatus => {
    switch (file.status) {
      case 'uploading':
        return 'uploading';
      case 'completed':
        return 'completed';
      default:
        return 'uploading'; // For uploaded, processing, analyzing, failed
    }
  };

  // Create file object with URL for images
  const fileWithUrl = {
    name: file.file.name,
    type: file.file.type,
    size: file.file.size,
    url: file.file.type.startsWith('image/') ? URL.createObjectURL(file.file) : undefined
  };

  return (
    <FileDisplay
      file={fileWithUrl}
      status={getDisplayStatus()}
      progress={file.progress}
      onRemove={onCancel}
      className={className}
    />
  );
};