import { hydrate, prerender as ssr } from 'preact-iso';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { ErrorBoundary } from './components/ErrorBoundary';
import ChatContainer from './components/ChatContainer';
import DragDropOverlay from './components/DragDropOverlay';
import AppLayout from './components/AppLayout';
import { SEOHead } from './components/SEOHead';
import { ToastProvider } from './contexts/ToastContext';
import { useMessageHandling } from './hooks/useMessageHandling';
import { useFileUpload } from './hooks/useFileUpload';
import { useTeamConfig } from './hooks/useTeamConfig';
import { useChatSession } from './hooks/useChatSession';
import { setupGlobalKeyboardListeners } from './utils/keyboard';
import { ChatMessageUI } from '../worker/types';
import './index.css';



export function App() {
	// Core state
	const [clearInputTrigger, setClearInputTrigger] = useState(0);
	const [currentTab, setCurrentTab] = useState<'chats' | 'matter'>('chats');
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
	const [isRecording, setIsRecording] = useState(false);

	// Use custom hooks
	const { teamId, teamConfig, teamNotFound, handleRetryTeamConfig } = useTeamConfig({
		onError: (error) => console.error('Team config error:', error)
	});

	const {
		sessionId,
		isInitializing: isSessionInitializing,
		error: sessionError,
		refreshSession
	} = useChatSession(teamId);

	const { messages, sendMessage, handleContactFormSubmit, addMessage, cancelStreaming } = useMessageHandling({
		teamId,
		sessionId,
		onError: (error) => console.error('Message handling error:', error)
	});

	const {
		previewFiles,
		isDragging,
		setIsDragging,
		handleCameraCapture,
		handleFileSelect,
		handleMediaCapture,
		removePreviewFile,
		clearPreviewFiles,
		isReadyToUpload
	} = useFileUpload({
		teamId,
		sessionId,
		onError: (error) => console.error('File upload error:', error)
	});

	useEffect(() => {
		if (sessionError) {
			console.error('Session initialization error:', sessionError);
		}
	}, [sessionError]);

	const isSessionReady = Boolean(sessionId);

	const handleRetrySession = useCallback(() => {
		refreshSession().catch((error) => console.error('Session retry failed:', error));
	}, [refreshSession]);

	// Add intro message when team config is loaded and no messages exist
	useEffect(() => {
		if (teamConfig.introMessage && messages.length === 0) {
			// Add intro message only (team profile is now a UI element)
			const introMessage: ChatMessageUI = {
				id: crypto.randomUUID(),
				content: teamConfig.introMessage,
				isUser: false,
				role: 'assistant',
				timestamp: Date.now()
			};
			addMessage(introMessage);
		}
	}, [teamConfig.introMessage, messages.length, addMessage]);

	// Create stable callback references for keyboard handlers
	const handleEscape = useCallback(() => {
		if (previewFiles.length > 0) {
			clearPreviewFiles();
			setClearInputTrigger(prev => prev + 1);
		}
	}, [previewFiles.length, clearPreviewFiles]);

	const handleFocusInput = useCallback(() => {
			const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
			if (textarea) {
			textarea.focus();
			}
	}, []);

	// Setup global event handlers
	useEffect(() => {
		// Setup keyboard handlers
		const cleanupKeyboard = setupGlobalKeyboardListeners({
			onEscape: handleEscape,
			onSubmit: () => {
				// This will be handled by ChatContainer
			},
			onFocusInput: handleFocusInput
		});

		return () => {
			cleanupKeyboard?.();
		};
	}, [handleEscape, handleFocusInput]);

	// Setup scroll behavior
	useEffect(() => {
		if (typeof document === 'undefined') return;
		
		const messageList = document.querySelector('.message-list');
		if (!messageList) return;
		
		let scrollTimer: number | null = null;
		
		const handleScroll = () => {
			// Add scrolling class when scrolling starts
			messageList.classList.add('scrolling');
			
			// Clear any existing timer
			if (scrollTimer) {
				clearTimeout(scrollTimer);
				scrollTimer = null;
			}
			
			// Set a timer to remove the scrolling class after scrolling stops
			scrollTimer = window.setTimeout(() => {
				messageList.classList.remove('scrolling');
			}, 1000); // Hide scrollbar 1 second after scrolling stops
		};
		
		messageList.addEventListener('scroll', handleScroll);
		
		return () => {
			messageList.removeEventListener('scroll', handleScroll);
			if (scrollTimer) {
				clearTimeout(scrollTimer);
			}
		};
	}, []);

	// Handle feedback submission
	const handleFeedbackSubmit = useCallback((feedback: any) => {
		console.log('Feedback submitted:', feedback);
		// Could show a toast notification here
	}, []);





	// Handle media capture
	const handleMediaCaptureWrapper = async (blob: Blob, type: 'audio' | 'video') => {
		try {
			// Create a File object from the blob
			const fileName = `Recording_${new Date().toISOString()}.${type === 'audio' ? 'webm' : 'mp4'}`;
			const file = new File([blob], fileName, { type: blob.type });
			
			// Upload the file to backend and get metadata
			const uploadedFiles = await handleFileSelect([file]);
			
			// Send a message with the uploaded file metadata
			sendMessage(`I've recorded a ${type} message.`, uploadedFiles);
			
		} catch (error) {
			console.error('Failed to upload captured media:', error);
			// Show error message to user
			sendMessage("I'm sorry, I couldn't upload the recorded media. Please try again.", []);
		}
	};





	// Handle navigation to chats - removed since bottom nav is disabled

	return (
		<ToastProvider>
			<SEOHead 
				teamConfig={teamConfig}
				currentUrl={typeof window !== 'undefined' ? window.location.href : undefined}
			/>
			<DragDropOverlay isVisible={isDragging} onClose={() => setIsDragging(false)} />
			
			<AppLayout
				teamNotFound={teamNotFound}
				teamId={teamId}
				onRetryTeamConfig={handleRetryTeamConfig}
				currentTab={currentTab}
				onTabChange={setCurrentTab}
				isMobileSidebarOpen={isMobileSidebarOpen}
				onToggleMobileSidebar={setIsMobileSidebarOpen}
				teamConfig={{
					name: teamConfig.name,
					profileImage: teamConfig.profileImage,
					description: teamConfig.description
				}}
				messages={messages}
				onSendMessage={sendMessage}
				onUploadDocument={async (files: File[], _metadata?: { documentType?: string; matterId?: string }) => {
					return await handleFileSelect(files);
				}}
			>
				<div className="relative h-full">
					<ChatContainer
						messages={messages}
						onSendMessage={sendMessage}
						onContactFormSubmit={handleContactFormSubmit}
						teamConfig={{
							name: teamConfig.name,
							profileImage: teamConfig.profileImage,
							teamId,
							description: teamConfig.description
						}}
						onOpenSidebar={() => setIsMobileSidebarOpen(true)}
						sessionId={sessionId}
						teamId={teamId}
						onFeedbackSubmit={handleFeedbackSubmit}
						previewFiles={previewFiles}
						removePreviewFile={removePreviewFile}
						clearPreviewFiles={clearPreviewFiles}
						handleCameraCapture={handleCameraCapture}
						handleFileSelect={async (files: File[]) => {
							await handleFileSelect(files);
						}}
							handleMediaCapture={handleMediaCaptureWrapper}
							isRecording={isRecording}
							setIsRecording={setIsRecording}
							clearInput={clearInputTrigger}
							isReadyToUpload={isReadyToUpload}
							isSessionReady={isSessionReady}
						/>
				</div>
			</AppLayout>
		</ToastProvider>
	);
}

if (typeof window !== 'undefined') {
	// Initialize theme from localStorage with fallback to system preference
	const savedTheme = localStorage.getItem('theme');
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
	
	if (shouldBeDark) {
		document.documentElement.classList.add('dark');
	}
	
	hydrate(<App />, document.getElementById('app'));
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
