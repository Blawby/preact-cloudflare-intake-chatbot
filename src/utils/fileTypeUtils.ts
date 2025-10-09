/**
 * File Type Utilities
 * 
 * Pure utility functions for file type detection and configuration.
 * No UI components, just data transformation.
 */

import { 
  DocumentIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  MusicalNoteIcon, 
  CodeBracketIcon, 
  ArchiveBoxIcon, 
  TableCellsIcon, 
  DocumentTextIcon 
} from '@heroicons/react/24/outline';

export interface FileTypeConfig {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export const getFileTypeConfig = (fileName: string, mimeType: string): FileTypeConfig => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // PDF files
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return {
      color: 'bg-light-file-type-pdf dark:bg-dark-file-type-pdf',
      icon: DocumentIcon,
      label: 'PDF'
    };
  }
  
  // Image files
  if (mimeType.startsWith('image/')) {
    return {
      color: 'bg-light-file-type-image dark:bg-dark-file-type-image',
      icon: PhotoIcon,
      label: 'Image'
    };
  }
  
  // Video files
  if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
    return {
      color: 'bg-light-file-type-video dark:bg-dark-file-type-video',
      icon: VideoCameraIcon,
      label: 'Video'
    };
  }
  
  // Audio files
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension)) {
    return {
      color: 'bg-light-file-type-audio dark:bg-dark-file-type-audio',
      icon: MusicalNoteIcon,
      label: 'Audio'
    };
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'].includes(extension)) {
    return {
      color: 'bg-light-file-type-code dark:bg-dark-file-type-code',
      icon: CodeBracketIcon,
      label: 'Code'
    };
  }
  
  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
    return {
      color: 'bg-light-file-type-archive dark:bg-dark-file-type-archive',
      icon: ArchiveBoxIcon,
      label: 'Archive'
    };
  }
  
  // Spreadsheet files
  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
    return {
      color: 'bg-light-file-type-spreadsheet dark:bg-dark-file-type-spreadsheet',
      icon: TableCellsIcon,
      label: 'Spreadsheet'
    };
  }
  
  // Document files
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
    return {
      color: 'bg-light-file-type-document dark:bg-dark-file-type-document',
      icon: DocumentTextIcon,
      label: 'Document'
    };
  }
  
  // Default
  return {
    color: 'bg-light-file-type-default dark:bg-dark-file-type-default',
    icon: DocumentIcon,
    label: extension.toUpperCase() || 'FILE'
  };
};

export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};
