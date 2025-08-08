import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import { FileAttachment } from '../../worker/types';

interface UseFileUploadOptions {
  teamId: string;
  sessionId: string;
  onError?: (error: string) => void;
}

// Utility function to upload a file to backend
async function uploadFileToBackend(file: File, teamId: string, sessionId: string, signal?: AbortSignal) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('teamId', teamId);
    formData.append('sessionId', sessionId);

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
      signal,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as any;
      throw new Error(error?.error || 'File upload failed');
    }
    
    const result = await response.json() as any;
    return result.data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Upload cancelled');
    }
    throw error;
  }
}

export const useFileUpload = ({ teamId, sessionId, onError }: UseFileUploadOptions) => {
  const [previewFiles, setPreviewFiles] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Shared file upload logic
  const uploadFiles = useCallback(async (files: File[]) => {
    if (!teamId || !sessionId) {
      const error = 'Missing team or session ID. Cannot upload files.';
      onError?.(error);
      return;
    }
    
    try {
      // Upload files in parallel for better UX
      const uploadPromises = files.map(async (file) => {
        try {
          const uploaded = await uploadFileToBackend(file, teamId, sessionId);
          return {
            name: uploaded.fileName,
            size: uploaded.fileSize || file.size,
            type: uploaded.fileType,
            url: uploaded.url,
          } as FileAttachment;
        } catch (err: any) {
          const error = `Failed to upload file: ${file.name}\n${err.message}`;
          onError?.(error);
          return null; // Return null for failed uploads
        }
      });
      
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((result): result is FileAttachment => result !== null);
      
      if (successfulUploads.length > 0) {
        setPreviewFiles(prev => [...prev, ...successfulUploads]);
      }
    } catch (error) {
      console.error('Upload batch failed:', error);
    }
  }, [teamId, sessionId, onError]);

  // Handle photo selection
  const handlePhotoSelect = useCallback(async (files: File[]) => {
    await uploadFiles(files);
  }, [uploadFiles]);

  // Handle camera capture
  const handleCameraCapture = useCallback(async (file: File) => {
    await uploadFiles([file]);
  }, [uploadFiles]);

  // Handle file selection
  const handleFileSelect = useCallback(async (files: File[]) => {
    await uploadFiles(files);
  }, [uploadFiles]);

  // Remove preview file
  const removePreviewFile = useCallback((index: number) => {
    setPreviewFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all preview files
  const clearPreviewFiles = useCallback(() => {
    setPreviewFiles([]);
  }, []);

  // Handle media capture (audio/video)
  const handleMediaCapture = useCallback((blob: Blob, type: 'audio' | 'video') => {
    const url = URL.createObjectURL(blob);
    const file: FileAttachment = {
      name: `Recording_${new Date().toISOString()}.webm`,
      size: blob.size,
      type: blob.type,
      url,
    };

    return file;
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current -= 1;
    
    // Only reset dragging state when we've left all drag elements
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    // Get all files from the drop event
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    
    if (droppedFiles.length === 0) return;

    // Separate different types of files
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
    const videoFiles = droppedFiles.filter(file => file.type.startsWith('video/'));
    const otherFiles = droppedFiles.filter(file => 
      !file.type.startsWith('image/') && 
      !file.type.startsWith('video/')
    );

    // Apply file type validation
    const mediaFiles = [...imageFiles, ...videoFiles];
    const safeOtherFiles = otherFiles.filter(file => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const disallowedExtensions = ['zip', 'exe', 'bat', 'cmd', 'msi', 'app'];
      return !disallowedExtensions.includes(fileExtension || '');
    });

    // Handle media files
    if (mediaFiles.length > 0) {
      await handlePhotoSelect(mediaFiles);
    }

    // Handle other valid files
    if (safeOtherFiles.length > 0) {
      await handleFileSelect(safeOtherFiles);
    }

    // Show alert if any files were filtered out
    if (safeOtherFiles.length < otherFiles.length) {
      onError?.('Some files were not uploaded because they have disallowed file extensions (zip, exe, etc.)');
    }
  }, [handlePhotoSelect, handleFileSelect, onError]);

  // Setup global drag handlers with automatic cleanup
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.addEventListener('dragenter', handleDragEnter);
      document.body.addEventListener('dragleave', handleDragLeave);
      document.body.addEventListener('dragover', handleDragOver);
      document.body.addEventListener('drop', handleDrop);

      return () => {
        document.body.removeEventListener('dragenter', handleDragEnter);
        document.body.removeEventListener('dragleave', handleDragLeave);
        document.body.removeEventListener('dragover', handleDragOver);
        document.body.removeEventListener('drop', handleDrop);
      };
    }
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return {
    previewFiles,
    isDragging,
    setIsDragging,
    handlePhotoSelect,
    handleCameraCapture,
    handleFileSelect,
    handleMediaCapture,
    removePreviewFile,
    clearPreviewFiles
  };
}; 