import { FunctionComponent } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import VirtualMessageList from './VirtualMessageList';
import MessageComposer from './MessageComposer';
import { ChatMessageUI } from '../../worker/types';
import { FileAttachment } from '../../worker/types';
import { createKeyPressHandler } from '../utils/keyboard';

interface ChatContainerProps {
  messages: ChatMessageUI[];
  onSendMessage: (message: string, attachments: FileAttachment[]) => void;
  onScheduleConsultation?: () => void;
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

  // Input control prop
  clearInput?: boolean;
}

const ChatContainer: FunctionComponent<ChatContainerProps> = ({
  messages,
  onSendMessage,
  onScheduleConsultation,
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

    // Blur the textarea to collapse mobile keyboard
    if (textareaRef.current) {
      textareaRef.current.blur();
    }
  };

  const handleKeyPress = createKeyPressHandler(handleSubmit);

  return (
    <div className="flex flex-col h-screen w-full m-0 p-0 relative overflow-hidden bg-white dark:bg-dark-bg">
      <main className="flex flex-col h-full w-full overflow-hidden relative bg-white dark:bg-dark-bg">
        <VirtualMessageList
          messages={messages}
          onScheduleConsultation={onScheduleConsultation}
          teamConfig={teamConfig}
          onOpenSidebar={onOpenSidebar}
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
          handleScheduleStart={onScheduleConsultation}
          isRecording={isRecording}
          handleMediaCapture={handleMediaCapture}
          setIsRecording={setIsRecording}
          onSubmit={handleSubmit}
          onKeyPress={handleKeyPress}
          textareaRef={textareaRef}
          isReadyToUpload={isReadyToUpload}
        />
      </main>
    </div>
  );
};

export default ChatContainer; 