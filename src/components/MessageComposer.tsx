import type { RefObject, JSX } from 'preact';
import { useLayoutEffect } from 'preact/hooks';
import { Button } from './ui/Button';
import FileMenu from './FileMenu';
import MediaControls from './MediaControls';
import { ArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { features } from '../config/features';
import { FileAttachment } from '../../worker/types';

interface MessageComposerProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  previewFiles: FileAttachment[];
  removePreviewFile: (index: number) => void;
  handleFileSelect: (files: File[]) => Promise<void>;
  handleCameraCapture: (file: File) => Promise<void>;
  isRecording: boolean;
  handleMediaCapture: (blob: Blob, type: 'audio' | 'video') => void;
  setIsRecording: (recording: boolean) => void;
  onSubmit: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  isReadyToUpload?: boolean;
  isSessionReady?: boolean;

}

const MessageComposer = ({
  inputValue,
  setInputValue,
  previewFiles,
  removePreviewFile,
  handleFileSelect,
  handleCameraCapture,
  isRecording,
  handleMediaCapture,
  setIsRecording,
  onSubmit,
  onKeyDown,
  textareaRef,
  isReadyToUpload,
  isSessionReady,
}: MessageComposerProps) => {
  const handleInput = (e: JSX.TargetedEvent<HTMLTextAreaElement, Event>) => {
    const t = e.currentTarget;
    setInputValue(t.value);
    t.style.height = 'auto';
    t.style.height = `${Math.max(32, t.scrollHeight)}px`;
  };

  const handleSubmit = () => {
    if (!inputValue.trim() && previewFiles.length === 0) return;
    if (isSessionReady === false) return;
    onSubmit();
    const el = textareaRef.current;
    if (el) { el.style.height = ''; }
  };

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(32, el.scrollHeight)}px`;
  }, [inputValue]);

    return (
    <form 
      className="pl-4 pr-4 bg-white dark:bg-dark-bg h-auto flex flex-col w-full sticky bottom-0 z-[1000] backdrop-blur-md" 
      aria-label="Message composition"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div className="flex flex-col w-full relative bg-gray-200 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl p-2 min-h-[48px] gap-2 h-auto overflow-visible">
        {previewFiles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 m-0" role="list" aria-label="File attachments">
            {previewFiles.map((file, index) => (
              <div
                className="relative flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                key={file.url || `${file.name}-${index}`}
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

        <div className="flex items-center gap-3 w-full">
          {!isRecording && (
            <div className="flex-shrink-0">
              <FileMenu
                onFileSelect={handleFileSelect}
                onCameraCapture={handleCameraCapture}
                isReadyToUpload={isSessionReady === false ? false : isReadyToUpload}
              />
            </div>
          )}
          
          <div className="flex-1 flex items-center">
            <textarea
              ref={textareaRef}
              data-testid="message-input"
              className="w-full min-h-8 py-1 m-0 text-sm sm:text-base leading-6 text-gray-900 dark:text-white bg-transparent border-none resize-none outline-none overflow-hidden box-border placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder="Type a message..."
              rows={1}
              value={inputValue}
              onInput={handleInput}
              onKeyDown={onKeyDown}
              aria-label="Message input"
              disabled={isSessionReady === false}
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {features.enableAudioRecording && (
              <MediaControls onMediaCapture={handleMediaCapture} onRecordingStateChange={setIsRecording} />
            )}
            <Button
              type="submit"
              variant={inputValue.trim() || previewFiles.length > 0 ? 'primary' : 'secondary'}
              size="sm"
              disabled={(!inputValue.trim() && previewFiles.length === 0) || isSessionReady === false}
              aria-label={isSessionReady === false
                ? 'Send message (waiting for secure session)'
                : (!inputValue.trim() && previewFiles.length === 0
                  ? 'Send message (disabled)'
                  : 'Send message')}
              className="w-8 h-8 p-0 rounded-full"
              icon={<ArrowUpIcon className="w-3.5 h-3.5" aria-hidden="true" />}
              data-testid="message-send-button"
            />
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400 text-center py-1 opacity-80 mt-1">
        {isSessionReady === false
          ? 'Setting up a secure session...'
          : 'Blawby can make mistakes. Check for important information.'}
      </div>
    </form>
  );
};

export default MessageComposer;
