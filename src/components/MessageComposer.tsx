import { useEffect, useRef } from 'preact/hooks';
import { Button } from './ui/Button';
import FileMenu from './FileMenu';
import MediaControls from './MediaControls';
import ScheduleButton from './scheduling/ScheduleButton';
import { ArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import features from '../config/features';

interface PreviewFile {
  url: string;
  name: string;
  type: string;
}

interface MessageComposerProps {
  inputValue: string;
  setInputValue: (v: string) => void;
  previewFiles: PreviewFile[];
  removePreviewFile: (index: number) => void;
  handlePhotoSelect: (files: File[]) => Promise<void>;
  handleCameraCapture: (file: File) => Promise<void>;
  handleFileSelect: (files: File[]) => Promise<void>;
  handleScheduleStart: () => void;
  isRecording: boolean;
  handleMediaCapture: (blob: Blob, type: 'audio' | 'video') => void;
  setIsRecording: (v: boolean) => void;
  onSubmit: () => void;
  onKeyPress: (e: KeyboardEvent) => void;
}

const MessageComposer = ({
  inputValue,
  setInputValue,
  previewFiles,
  removePreviewFile,
  handlePhotoSelect,
  handleCameraCapture,
  handleFileSelect,
  handleScheduleStart,
  isRecording,
  handleMediaCapture,
  setIsRecording,
  onSubmit,
  onKeyPress,
}: MessageComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleInput = (e: Event) => {
    const target = e.currentTarget as HTMLTextAreaElement;
    setInputValue(target.value);
    // Reset to 0 then grow; use a larger baseline to account for padding/line-height
    target.style.height = '0px';
    target.style.height = `${Math.max(40, target.scrollHeight)}px`;
  };

  const handleSubmit = () => {
    onSubmit();
    const el = textareaRef.current;
    if (el) {
      el.style.height = '40px';
      el.focus();
    }
  };

  // Reset height when value is cleared externally (e.g., Enter submit path)
  useEffect(() => {
    if (!inputValue && textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }
  }, [inputValue]);

  return (
    <div className="pl-4 pr-4 bg-white dark:bg-dark-bg h-auto flex flex-col w-full sticky bottom-8 z-[1000] backdrop-blur-md" role="form" aria-label="Message composition">
      <div className="flex flex-col w-full relative bg-white dark:bg-dark-input-bg border border-gray-200 dark:border-dark-border border-t-0 rounded-2xl p-3 min-h-[56px] gap-3 h-auto overflow-visible">
        {previewFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 m-0" role="list" aria-label="File attachments">
            {previewFiles.map((file, index) => (
              <div
                className={`relative w-15 h-15 rounded-lg overflow-hidden shadow-sm bg-gray-100 dark:bg-dark-hover ${file.type.startsWith('image/') ? 'w-15 h-15' : 'w-[165px] h-15 flex items-center pr-5 gap-1'}`}
                key={index}
                role="listitem"
              >
                {file.type.startsWith('image/') ? (
                  <img src={file.url} alt={`Preview of ${file.name}`} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="w-15 h-15 flex-shrink-0 flex items-center justify-center bg-amber-500 text-white p-2" aria-hidden="true">
                      {/* getFileIcon is app-level; keep previews consistent without it here */}
                      <span className="text-xs font-semibold uppercase">{file.name.split('.').pop()}</span>
                    </div>
                    <div className="flex-1 flex flex-col p-1 pr-2 overflow-hidden">
                      <div className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis mb-1">{file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}</div>
                      <div className="text-[10px] text-amber-500 uppercase font-semibold">{file.name.split('.').pop()}</div>
                    </div>
                  </>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePreviewFile(index)}
                  aria-label={`Remove ${file.name}`}
                  className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full bg-black/60 text-white border-none flex items-center justify-center cursor-pointer text-base leading-none p-0 opacity-90 transition-opacity duration-200 z-[2] hover:opacity-100"
                >
                  <XMarkIcon className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="w-full relative block flex-1">
          <textarea
            ref={textareaRef}
            className="flex-1 min-h-6 py-2 m-0 text-sm sm:text-base leading-6 text-gray-900 dark:text-white bg-transparent border-none resize-none outline-none overflow-hidden box-border block w-full z-[1] placeholder:text-gray-500 dark:placeholder:text-gray-400"
            placeholder="Type a message..."
            rows={1}
            value={inputValue}
            onInput={handleInput}
            onKeyPress={onKeyPress}
            aria-label="Message input"
            aria-multiline="true"
          />
        </div>

        <span id="input-instructions" className="sr-only">Type your message and press Enter to send. Use the buttons below to attach files or record audio.</span>

        <div className="flex items-center gap-3 w-full p-0">
          <div className="flex justify-between w-full items-center">
            {!isRecording && (
              <div className="flex items-center">
                <FileMenu onPhotoSelect={handlePhotoSelect} onCameraCapture={handleCameraCapture} onFileSelect={handleFileSelect} />
                {features.enableConsultationButton && (
                  <ScheduleButton onClick={handleScheduleStart} disabled={false} />
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              {features.enableAudioRecording && (
                <MediaControls onMediaCapture={handleMediaCapture} onRecordingStateChange={setIsRecording} />
              )}
              <Button
                variant="icon"
                onClick={handleSubmit}
                disabled={!inputValue.trim() && previewFiles.length === 0}
                aria-label={!inputValue.trim() && previewFiles.length === 0 ? 'Send message (disabled)' : 'Send message'}
                className="flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover transition-all duration-200 border-none bg-transparent hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUpIcon className="w-5 h-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400 text-center py-1 opacity-80 mt-1">
        Blawby can make mistakes. Check for important information.
      </div>
    </div>
  );
};

export default MessageComposer;

