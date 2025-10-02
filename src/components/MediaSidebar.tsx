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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/Accordion';
import Modal from './Modal';
import MediaContent from './MediaContent';

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mediaGroups = aggregateMediaFromMessages(messages);
  const totalFiles = mediaGroups.reduce((sum, group) => sum + group.files.length, 0);

  const handleMediaClick = (media: AggregatedMedia) => {
    if (media.category === 'image' || media.category === 'video') {
      setSelectedMedia(media);
      setIsModalOpen(true);
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
      <Accordion type="single" collapsible>
        <AccordionItem value="media-section">
          <AccordionTrigger>Media, Files, and Links</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col items-center justify-center text-center py-6">
              <PhotoIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-xs sm:text-sm lg:text-base font-medium mb-1 text-gray-900 dark:text-white">No files shared yet</p>
              <p className="text-xs sm:text-sm opacity-70 text-gray-500 dark:text-gray-400">Files you share in the conversation will appear here</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <>
      <Accordion type="single" collapsible>
        <AccordionItem value="media-section">
          <AccordionTrigger>Media, Files, and Links ({totalFiles})</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 pt-2">
                {mediaGroups.map((group) => (
                  <div key={group.category} className="flex flex-col gap-2">
                    <h5 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {categoryLabels[group.category]} ({group.files.length})
                    </h5>
                    <div className="flex flex-col gap-2">
                      {group.files.map((media) => {
                        const IconComponent = iconMap[getFileIconName(media.category, media.name) as keyof typeof iconMap] || DocumentIcon;
                        
                        return (
                          <div 
                            key={media.id} 
                            role="button"
                            tabIndex={0}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                            onClick={() => handleMediaClick(media)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleMediaClick(media);
                              }
                            }}
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleDownload(media, e)}
                                  title="Download file"
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-dark-hover rounded transition-colors duration-200"
                                >
                                  <ArrowDownTrayIcon className="w-3 h-3" />
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
    </>
  );
} 