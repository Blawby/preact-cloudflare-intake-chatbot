import { useState, useEffect } from 'preact/hooks';
import { 
  PhotoIcon, 
  VideoCameraIcon, 
  MusicalNoteIcon, 
  DocumentIcon, 
  DocumentTextIcon, 
  TableCellsIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PresentationChartLineIcon,
  ArchiveBoxIcon,
  CodeBracketIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { 
  aggregateMediaFromMessages, 
  formatFileSize, 
  getFileIconName,
  type MediaGroup,
  type AggregatedMedia 
} from '../utils/mediaAggregation';
import { Button } from './ui/Button';
import Modal from './Modal';
import MediaContent from './MediaContent';
import { useSessionFiles } from '../hooks/useSessionFiles';

interface MediaSidebarProps {
  messages: any[];
  sessionId?: string | null;
}

const iconMap = {
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  DocumentIcon,
  DocumentTextIcon,
  TableCellsIcon,
  PresentationChartLineIcon,
  ArchiveBoxIcon,
  CodeBracketIcon
};

const categoryLabels = {
  image: 'Images',
  video: 'Videos',
  document: 'Documents',
  audio: 'Audio',
  other: 'Other Files'
};

// Helper function to categorize files by MIME type
function getCategoryFromMimeType(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') || 
    mimeType.includes('document') || 
    mimeType.includes('text') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('presentation') ||
    mimeType.includes('spreadsheet')
  ) return 'document';
  return 'other';
}

// Helper function to get specific file icon based on MIME type
function getFileIcon(mimeType: string, fileName: string) {
  // Images
  if (mimeType.startsWith('image/')) return PhotoIcon;
  
  // Videos
  if (mimeType.startsWith('video/')) return VideoCameraIcon;
  
  // Audio
  if (mimeType.startsWith('audio/')) return MusicalNoteIcon;
  
  // Documents by MIME type
  if (mimeType.includes('pdf')) return DocumentIcon;
  if (mimeType.includes('word')) return DocumentTextIcon;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return TableCellsIcon;
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return PresentationChartLineIcon;
  
  // Documents by file extension
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension) {
    if (['txt', 'md', 'rtf'].includes(extension)) return DocumentTextIcon;
    if (['csv', 'xlsx', 'xls'].includes(extension)) return TableCellsIcon;
    if (['ppt', 'pptx'].includes(extension)) return PresentationChartLineIcon;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return ArchiveBoxIcon;
    if (['js', 'ts', 'html', 'css', 'json', 'xml', 'py', 'java', 'cpp', 'c'].includes(extension)) return CodeBracketIcon;
  }
  
  // Default document icon
  if (mimeType.includes('text') || mimeType.includes('document')) return DocumentTextIcon;
  
  // Default for everything else
  return DocumentIcon;
}

export default function MediaSidebar({ messages, sessionId }: MediaSidebarProps) {
  const [selectedMedia, setSelectedMedia] = useState<AggregatedMedia | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get files from database for this session
  const { files: sessionFiles, isLoading: isLoadingFiles, error: filesError, deleteFile, refetch } = useSessionFiles({
    sessionId,
    enabled: !!sessionId
  });

  // Force refresh session files when component mounts to ensure we have latest data
  useEffect(() => {
    if (sessionId && refetch) {
      console.log('🔄 MediaSidebar: Force refreshing session files to clear stale data');
      refetch();
    }
  }, [sessionId, refetch]);

  // Get media from messages (existing functionality)
  const messageMediaGroups = aggregateMediaFromMessages(messages);

  // Convert session files to AggregatedMedia format
  const sessionMediaFiles: (AggregatedMedia & { fileId: string })[] = sessionFiles.map(file => ({
    name: file.original_name,
    url: `/api/files/${file.id}`,
    size: file.file_size,
    category: getCategoryFromMimeType(file.mime_type),
    type: file.mime_type,
    timestamp: new Date(file.created_at).getTime(),
    fileId: file.id // Add file ID for deletion
  }));

  // DEBUG: Log session files and their fileIds
  console.log('🔍 Session files for delete buttons:', sessionFiles.map(f => ({ 
    id: f.id, 
    name: f.original_name,
    hasFileId: !!f.id,
    fullFileObject: f
  })));
  console.log('🔍 Session media files with fileId:', sessionMediaFiles.map(f => ({ 
    name: f.name, 
    fileId: f.fileId,
    hasFileId: !!f.fileId,
    url: f.url
  })));
  
  // DEBUG: Also log message media to see if files are coming from messages instead
  console.log('🔍 Message media groups:', messageMediaGroups.map(group => ({
    category: group.category,
    files: group.files.map(f => ({ name: f.name, hasFileId: !!(f as any).fileId }))
  })));

  // DEBUG: Check for stale data issue
  if (sessionFiles.length === 0 && messageMediaGroups.some(group => group.files.length > 0)) {
    console.log('⚠️ STALE DATA DETECTED: No session files but message media exists. Files may be from old cached message attachments.');
    console.log('⚠️ Consider refreshing the page to clear stale message data.');
  }

  // Create a unified media collection with deduplication and proper categorization
  const allMediaMap = new Map<string, AggregatedMedia & { fileId?: string }>();

  // Add message files first
  messageMediaGroups.forEach(group => {
    group.files.forEach(file => {
      const key = `${file.name}-${file.size}`;
      if (!allMediaMap.has(key)) {
        allMediaMap.set(key, file);
      }
    });
  });

  // Add session files, but avoid duplicates and ensure proper categorization
  sessionMediaFiles.forEach(file => {
    const key = `${file.name}-${file.size}`;
    if (!allMediaMap.has(key)) {
      // New file from session - ensure it has fileId
      allMediaMap.set(key, { ...file, fileId: file.fileId });
    } else {
      // File exists from message, but add fileId for deletion capability
      const existingFile = allMediaMap.get(key)!;
      allMediaMap.set(key, { ...existingFile, fileId: file.fileId });
    }
  });

  // Group files by category
  const categoryMap = new Map<string, (AggregatedMedia & { fileId?: string })[]>();
  
  for (const file of allMediaMap.values()) {
    const category = file.category;
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(file);
  }

  // Convert to MediaGroup format, sorted by timestamp (newest first)
  const allMediaGroups: MediaGroup[] = Array.from(categoryMap.entries()).map(([category, files]) => ({
    category,
    files: files.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  }));

  // Calculate total files
  const totalFiles = allMediaMap.size;

  // DEBUG: Log final media map to see which files have fileId for delete buttons
  console.log('🔍 Final allMediaMap for delete buttons:', 
    Array.from(allMediaMap.entries()).map(([key, media]) => ({ 
      key, 
      name: media.name, 
      fileId: (media as any).fileId,
      hasFileId: !!(media as any).fileId,
      category: media.category
    }))
  );
  
  // Handle file deletion
  const handleDeleteFile = async (fileId: string) => {
    setIsDeleting(true);
    try {
      console.log('🗑️ Attempting to delete file:', fileId);
      const success = await deleteFile(fileId);
      if (success) {
        setFileToDelete(null);
        console.log('✅ File deleted successfully from MediaSidebar');
        
        // Force UI refresh after successful deletion
        // The deleteFile function should already update local state, but this ensures consistency
        if (refetch) {
          console.log('🔄 Refetching session files after deletion');
          await refetch();
        }
        
        // Force component re-render to ensure UI updates
        setRefreshTrigger(prev => prev + 1);
        console.log('🔄 Triggering UI refresh after deletion');
      } else {
        console.error('❌ File deletion failed');
      }
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = (fileId: string) => {
    setFileToDelete(fileId);
  };

  const cancelDelete = () => {
    setFileToDelete(null);
  };

  // Session files are now properly integrated into category groups above

  const handleMediaClick = (media: AggregatedMedia) => {
    try {
      if (media.category === 'image' || media.category === 'video') {
        setSelectedMedia(media);
        setIsModalOpen(true);
      } else {
        // For documents and other files, trigger download
        const link = document.createElement('a');
        link.href = media.url;
        link.download = media.name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Failed to open/download file:', error);
      // Could show a toast notification here
    }
  };

  const handleDownload = (media: AggregatedMedia, e: Event) => {
    try {
      e.stopPropagation();
      const link = document.createElement('a');
      link.href = media.url;
      link.download = media.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download file:', error);
      // Could show a toast notification here
    }
  };

  if (totalFiles === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h4 className="text-xs sm:text-sm lg:text-base font-semibold mb-3 text-gray-900 dark:text-white">Media, Files, and Links</h4>
        <div className="flex flex-col items-center justify-center text-center py-6">
          <PhotoIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500 mb-2" />
          <p className="text-xs sm:text-sm lg:text-base font-medium mb-1 text-gray-900 dark:text-white">No files shared yet</p>
          <p className="text-xs sm:text-sm opacity-70 text-gray-500 dark:text-gray-400">Files you share in the conversation will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <h4 className="text-xs sm:text-sm lg:text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Media, Files, and Links ({totalFiles})
        </h4>
        <div className="flex flex-col gap-4">
          {isLoadingFiles && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-center py-2">
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading files...</div>
              </div>
              {/* Skeleton loader */}
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          )}
          
          {filesError && (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-red-500">Error loading files: {filesError}</div>
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            {allMediaGroups.map((group) => (
              <div key={group.category} className="flex flex-col gap-2">
                <h5 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {categoryLabels[group.category]} ({group.files.length})
                </h5>
                <div className="flex flex-col gap-2">
                  {group.files.map((media) => {
                    const IconComponent = getFileIcon(media.type, media.name);
                    
                    return (
                      <div 
                        key={media.id} 
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover cursor-pointer transition-colors duration-200"
                        onClick={() => handleMediaClick(media)}
                      >
                        {media.category === 'image' ? (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            <img 
                              src={media.url} 
                              alt={media.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                              <EyeIcon className="text-white w-4 h-4" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0">
                            <IconComponent className="text-gray-600 dark:text-gray-400 w-6 h-6" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis" title={media.name}>
                            {media.name.length > 20 ? `${media.name.substring(0, 20)}...` : media.name}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-accent-500">{formatFileSize(media.size)}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDownload(media, e)}
                                title="Download file"
                                className="p-1 hover:bg-gray-200 dark:hover:bg-dark-hover rounded transition-colors duration-200"
                              >
                                <ArrowDownTrayIcon className="w-3 h-3" />
                              </Button>
                              
                              {/* Show delete button for files that have a fileId OR are from session (uploaded files) */}
                              {(() => {
                                const hasFileId = !!(media as any).fileId;
                                const isFromSession = media.url && media.url.startsWith('/api/files/');
                                const shouldShowDelete = hasFileId || isFromSession;
                                
                                console.log(`🔍 Delete button check for ${media.name}:`, { 
                                  fileId: (media as any).fileId, 
                                  hasFileId,
                                  url: media.url,
                                  isFromSession,
                                  shouldShowDelete,
                                  mediaObject: media 
                                });
                                return shouldShowDelete;
                              })() && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Extract fileId from URL if not present in media object
                                    const fileId = (media as any).fileId || 
                                      (media.url && media.url.startsWith('/api/files/') ? 
                                        media.url.split('/api/files/')[1].split('?')[0] : null);
                                    
                                    console.log('🗑️ Delete button clicked - debugging:', {
                                      mediaName: media.name,
                                      mediaUrl: media.url,
                                      directFileId: (media as any).fileId,
                                      extractedFileId: fileId,
                                      fullMedia: media
                                    });
                                    
                                    if (fileId) {
                                      console.log('🗑️ Proceeding with deletion for fileId:', fileId);
                                      confirmDelete(fileId);
                                    } else {
                                      console.error('❌ No fileId found for deletion:', media);
                                    }
                                  }}
                                  title="Delete file"
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors duration-200"
                                  disabled={isDeleting}
                                >
                                  <TrashIcon className="w-3 h-3 text-red-500 hover:text-red-600" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal for viewing images and videos */}
      {isModalOpen && selectedMedia && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMedia(null);
          }}
          type="fullscreen"
          showCloseButton={true}
        >
          <MediaContent media={selectedMedia} />
        </Modal>
      )}

      {/* Confirmation dialog for file deletion */}
      {fileToDelete && (
        <Modal
          isOpen={!!fileToDelete}
          onClose={cancelDelete}
          type="dialog"
          showCloseButton={false}
        >
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-center mb-2 text-gray-900 dark:text-white">
              Delete File
            </h3>
            
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this file? This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-center">
              <Button
                variant="secondary"
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleDeleteFile(fileToDelete)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
} 