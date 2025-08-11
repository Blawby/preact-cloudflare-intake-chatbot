import { useEffect, useRef, RefObject } from 'preact/hooks';
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
  handleFileSelect: (files: File[]) => Promise<void>;
  handleCameraCapture: (file: File) => Promise<void>;
  handleScheduleStart: () => void;
  isRecording: boolean;
  handleMediaCapture: (blob: Blob, type: 'audio' | 'video') => void;
  setIsRecording: (v: boolean) => void;
  onSubmit: () => void;
  onKeyPress: (e: KeyboardEvent) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  isReadyToUpload?: boolean;
}

const MessageComposer = ({
  inputValue,
  setInputValue,
  previewFiles,
  removePreviewFile,
  handleFileSelect,
  handleCameraCapture,
  handleScheduleStart,
  isRecording,
  handleMediaCapture,
  setIsRecording,
  onSubmit,
  onKeyPress,
  textareaRef,
  isReadyToUpload,
}: MessageComposerProps) => {

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 m-0" role="list" aria-label="File attachments">
            {previewFiles.map((file, index) => (
              <div
                className="relative flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                key={index}
                role="listitem"
              >
                {file.type.startsWith('image/') ? (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={file.url} alt={`Preview of ${file.name}`} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">{file.name.split('.').pop()}</span>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis" title={file.name}>
                    {file.name.length > 25 ? `${file.name.substring(0, 25)}...` : file.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {file.type}
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePreviewFile(index)}
                  aria-label={`Remove ${file.name}`}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-dark-hover rounded transition-colors duration-200"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
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
                <FileMenu onFileSelect={handleFileSelect} onCameraCapture={handleCameraCapture} isReadyToUpload={isReadyToUpload} />
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

