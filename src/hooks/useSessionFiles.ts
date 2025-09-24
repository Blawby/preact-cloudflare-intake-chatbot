import { useState, useEffect, useCallback } from 'preact/hooks';

interface SessionFile {
  id: string;
  original_name: string;
  file_name: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface UseSessionFilesOptions {
  sessionId: string | null;
  enabled?: boolean;
}

interface UseSessionFilesReturn {
  files: SessionFile[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  deleteFile: (fileId: string) => Promise<boolean>;
}

export const useSessionFiles = ({ 
  sessionId, 
  enabled = true 
}: UseSessionFilesOptions): UseSessionFilesReturn => {
  const [files, setFiles] = useState<SessionFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!sessionId || !enabled) {
      setFiles([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/files/list/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data?.files) {
        setFiles(result.data.files);
      } else {
        setFiles([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch files';
      setError(errorMessage);
      console.error('Error fetching session files:', err);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, enabled]);

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Remove the file from local state immediately for better UX
        setFiles(prev => prev.filter(file => file.id !== fileId));
        console.log('✅ File deleted successfully:', result.data.fileName);
        return true;
      } else {
        throw new Error(result.error || 'Delete operation failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      setError(errorMessage);
      console.error('Error deleting file:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    isLoading,
    error,
    refetch: fetchFiles,
    deleteFile
  };
};
