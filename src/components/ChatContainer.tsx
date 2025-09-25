import { FunctionComponent } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import VirtualMessageList from './VirtualMessageList';
import MessageComposer from './MessageComposer';
import { ChatMessageUI } from '../../worker/types';
import { FileAttachment } from '../../worker/types';
import { ContactData } from './ContactForm';
import { createKeyPressHandler } from '../utils/keyboard';

interface ChatContainerProps {
  messages: ChatMessageUI[];
  onSendMessage: (message: string, attachments: FileAttachment[]) => void;
  onContactFormSubmit?: (data: ContactData) => void;
  teamConfig?: {
    name: string;
    profileImage: string | null;
    teamId: string;
    description?: string | null;
  };
  onOpenSidebar?: () => void;
  sessionId?: string;
  teamId?: string;
  onFeedbackSubmit?: (feedback: any) => void;

  // File handling props
  previewFiles: FileAttachment[];
  removePreviewFile: (index: number) => void;
  clearPreviewFiles: () => void;
  handleFileSelect: (files: File[]) => Promise<void>;
  handleCameraCapture: (file: File) => Promise<void>;
  handleMediaCapture: (blob: Blob, type: 'audio' | 'video') => void;
  isRecording: boolean;
  setIsRecording: (v: boolean) => void;
  isReadyToUpload?: boolean;
  isSessionReady?: boolean;

  // Input control prop
  clearInput?: boolean;
}

const ChatContainer: FunctionComponent<ChatContainerProps> = ({
  messages,
  onSendMessage,
  onContactFormSubmit,
  teamConfig,
  onOpenSidebar,
  sessionId,
  teamId,
  onFeedbackSubmit,
  previewFiles,
  removePreviewFile,
  clearPreviewFiles,
  handleFileSelect,
  handleCameraCapture,
  handleMediaCapture,
  isRecording,
  setIsRecording,
  isReadyToUpload,
  isSessionReady,
  clearInput
}) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: Event) => {
    const target = e.currentTarget as HTMLTextAreaElement;
    setInputValue(target.value);

    // Simple approach: reset height then set to scrollHeight
    target.style.height = '24px'; // Reset to default height first
    target.style.height = `${Math.max(24, target.scrollHeight)}px`;
  };

  // Simple resize handler for window size changes
  useEffect(() => {
    const handleResize = () => {
      if (textareaRef.current) {
        // Use the same improved auto-expand logic
        textareaRef.current.style.height = 'auto';
        const newHeight = Math.max(24, textareaRef.current.scrollHeight);
        textareaRef.current.style.height = `${newHeight}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize textarea height on mount
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.max(24, textareaRef.current.scrollHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  // Clear input when clearInput prop is true
  useEffect(() => {
    if (clearInput) {
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.value = '';
        textareaRef.current.style.height = '24px';
      }
    }
  }, [clearInput]);

  const handleSubmit = () => {
    if (!inputValue.trim() && previewFiles.length === 0) return;

    const message = inputValue.trim();
    const attachments = [...previewFiles];

    // Send message to API
    onSendMessage(message, attachments);

    // Clear preview files after sending
    clearPreviewFiles();

    // Reset input
    setInputValue('');

    // Only blur on mobile devices to collapse virtual keyboard
    if (textareaRef.current) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        textareaRef.current.blur();
      }
    }
  };

  const baseKeyHandler = createKeyPressHandler(handleSubmit);

  const handleKeyDown = (e: KeyboardEvent) => {
    // @ts-ignore - isComposing is not in TypeScript's KeyboardEvent but exists at runtime
    if ((e as any).isComposing || e.repeat) {
      return;
    }
    baseKeyHandler(e);
  };

  return (
    <div className="flex flex-col h-screen md:h-screen w-full m-0 p-0 relative overflow-hidden bg-white dark:bg-dark-bg" data-testid="chat-container">
      <main className="flex flex-col h-full w-full overflow-hidden relative bg-white dark:bg-dark-bg">
        <VirtualMessageList
          messages={messages}
          teamConfig={teamConfig}
          onOpenSidebar={onOpenSidebar}
          onContactFormSubmit={onContactFormSubmit}
          sessionId={sessionId}
          teamId={teamId}
          onFeedbackSubmit={onFeedbackSubmit}
        />
        <MessageComposer
          inputValue={inputValue}
          setInputValue={setInputValue}
          previewFiles={previewFiles}
          removePreviewFile={removePreviewFile}
          handleFileSelect={handleFileSelect}
          handleCameraCapture={handleCameraCapture}

          isRecording={isRecording}
          handleMediaCapture={handleMediaCapture}
          setIsRecording={setIsRecording}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRef}
          isReadyToUpload={isReadyToUpload}
          isSessionReady={isSessionReady}
        />
      </main>
    </div>
  );
};

export default ChatContainer; 
