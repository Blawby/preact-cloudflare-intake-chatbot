import { useState } from 'preact/hooks';
import { 
  PhotoIcon, 
  VideoCameraIcon, 
  MusicalNoteIcon, 
  DocumentIcon, 
  DocumentTextIcon, 
  TableCellsIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { 
  aggregateMediaFromMessages, 
  formatFileSize, 
  getFileIconName,
  type MediaGroup,
  type AggregatedMedia 
} from '../utils/mediaAggregation';
import { Button } from './ui/Button';
import Lightbox from './Lightbox';

interface MediaSidebarProps {
  messages: any[];
}

const iconMap = {
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  DocumentIcon,
  DocumentTextIcon,
  TableCellsIcon
};

const categoryLabels = {
  image: 'Images',
  video: 'Videos',
  document: 'Documents',
  audio: 'Audio',
  other: 'Other Files'
};

export default function MediaSidebar({ messages }: MediaSidebarProps) {
  const [selectedMedia, setSelectedMedia] = useState<AggregatedMedia | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const mediaGroups = aggregateMediaFromMessages(messages);
  const totalFiles = mediaGroups.reduce((sum, group) => sum + group.files.length, 0);

  const handleMediaClick = (media: AggregatedMedia) => {
    if (media.category === 'image' || media.category === 'video') {
      setSelectedMedia(media);
      setIsLightboxOpen(true);
    } else {
      // For documents and other files, trigger download
      const link = document.createElement('a');
      link.href = media.url;
      link.download = media.name;
      link.click();
    }
  };

  const handleDownload = (media: AggregatedMedia, e: Event) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = media.url;
    link.download = media.name;
    link.click();
  };

  if (totalFiles === 0) {
    return (
      <div className="media-sidebar">
        <h4 className="text-xs sm:text-sm lg:text-base font-semibold mb-3 text-gray-900 dark:text-white">Media, Files, and Links</h4>
        <div className="section-content">
          <div className="flex flex-col items-center justify-center text-center py-6">
            <PhotoIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-xs sm:text-sm lg:text-base font-medium mb-1 text-gray-900 dark:text-white">No files shared yet</p>
            <p className="text-xs sm:text-sm opacity-70 text-gray-500 dark:text-gray-400">Files you share in the conversation will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="media-sidebar">
        <h4 className="text-xs sm:text-sm lg:text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Media, Files, and Links ({totalFiles})
        </h4>
        <div className="section-content">
          <div className="media-groups">
            {mediaGroups.map((group) => (
              <div key={group.category} className="media-group">
                <h5 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {categoryLabels[group.category]} ({group.files.length})
                </h5>
                <div className="media-files">
                  {group.files.map((media) => {
                    const IconComponent = iconMap[getFileIconName(media.category, media.name) as keyof typeof iconMap] || DocumentIcon;
                    
                    return (
                      <div 
                        key={media.id} 
                        className="media-file-item"
                        onClick={() => handleMediaClick(media)}
                      >
                        {media.category === 'image' ? (
                          <div className="media-thumbnail image-thumbnail">
                            <img 
                              src={media.url} 
                              alt={media.name}
                              className="thumbnail-image"
                            />
                            <div className="thumbnail-overlay">
                              <EyeIcon className="overlay-icon w-4 h-4" />
                            </div>
                          </div>
                        ) : (
                          <div className="media-thumbnail file-thumbnail">
                            <IconComponent className="file-icon w-6 h-6" />
                          </div>
                        )}
                        
                        <div className="media-file-info">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis" title={media.name}>
                            {media.name.length > 20 ? `${media.name.substring(0, 20)}...` : media.name}
                          </div>
                          <div className="file-meta">
                            <span className="text-xs sm:text-xs text-accent-500">{formatFileSize(media.size)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDownload(media, e)}
                              title="Download file"
                              className="download-button"
                            >
                              <ArrowDownTrayIcon className="download-icon w-3 h-3" />
                            </Button>
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

      {/* Lightbox for viewing images and videos */}
      {isLightboxOpen && selectedMedia && (
        <Lightbox
          isOpen={isLightboxOpen}
          onClose={() => {
            setIsLightboxOpen(false);
            setSelectedMedia(null);
          }}
          media={selectedMedia}
        />
      )}
    </>
  );
} 