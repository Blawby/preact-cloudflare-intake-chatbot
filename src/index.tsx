import { hydrate, prerender as ssr } from 'preact-iso';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { ErrorBoundary } from './components/ErrorBoundary';
import ChatContainer from './components/ChatContainer';
import DragDropOverlay from './components/DragDropOverlay';
import AppLayout from './components/AppLayout';
import { useMessageHandling } from './hooks/useMessageHandling';
import { useFileUpload } from './hooks/useFileUpload';
import { useTeamConfig } from './hooks/useTeamConfig';
import { setupGlobalKeyboardListeners } from './utils/keyboard';
import { submitContactForm } from './utils/forms';
import { debounce } from './utils/debounce';
import { detectSchedulingIntent, createSchedulingResponse } from './utils/scheduling';
import { ChatMessageUI } from '../worker/types';
import './index.css';

const ANIMATION_DURATION = 300;
const RESIZE_DEBOUNCE_DELAY = 100;

export function App() {
	// Core state
	const [inputValue, setInputValue] = useState('');
	const [sessionId] = useState<string>(() => crypto.randomUUID());
	const [currentTab, setCurrentTab] = useState<'chats'>('chats');
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
	const [isRecording, setIsRecording] = useState(false);

	// Use custom hooks
	const { teamId, teamConfig, teamNotFound, handleRetryTeamConfig } = useTeamConfig({
		onError: (error) => console.error('Team config error:', error)
	});

	const { messages, sendMessage, addMessage, updateMessage, setMessages } = useMessageHandling({
		teamId,
		sessionId,
		onError: (error) => console.error('Message handling error:', error)
	});

	const {
		previewFiles,
		isDragging,
		setIsDragging,
		handlePhotoSelect,
		handleCameraCapture,
		handleFileSelect,
		handleMediaCapture,
		removePreviewFile,
		clearPreviewFiles
	} = useFileUpload({
		teamId,
		sessionId,
		onError: (error) => console.error('File upload error:', error)
	});

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
			setMessages([introMessage]);
		}
	}, [teamConfig.introMessage, messages.length, setMessages]);

	// Create stable callback references for keyboard handlers
	const handleEscape = useCallback(() => {
		if (inputValue.trim() || previewFiles.length > 0) {
			setInputValue('');
			clearPreviewFiles();
		}
	}, [inputValue, previewFiles.length, clearPreviewFiles]);

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

	// Create debounced welcome button handlers to prevent spam clicks
	const debouncedCreateMatterStart = useCallback(
		debounce(() => {
			// Send user's matter creation request message
			const matterMessage: ChatMessageUI = {
				id: crypto.randomUUID(),
				content: "I'd like to create a matter and get help with my legal concern.",
				isUser: true,
				role: 'user',
				timestamp: Date.now()
			};
			
			addMessage(matterMessage);
			setInputValue('');
			
			// Add placeholder message with loading indicator (ChatGPT style)
			const loadingMessageId = crypto.randomUUID();
			const loadingMessage: ChatMessageUI = {
				id: loadingMessageId,
				content: "Let me set up your matter creation process...",
				isUser: false,
				role: 'assistant',
				timestamp: Date.now(),
				isLoading: true
			};
			addMessage(loadingMessage);
			
			// Start matter creation flow
			setTimeout(() => {
				const services = teamConfig.availableServices || [];
				const serviceOptions = services.length > 0 
					? services.map(service => `• ${service}`).join('\n')
					: '• Family Law\n• Business Law\n• Employment Law\n• Real Estate\n• Criminal Law\n• Other';
				
				// Update the loading message with actual content
				updateMessage(loadingMessageId, {
					content: `I'm here to help you create a matter and assess your legal situation. We provide legal services for the following areas:\n\n${serviceOptions}\n\nPlease select the type of legal matter you're dealing with, or choose "General Inquiry" if you're not sure:`,
					isLoading: false,
					matterCreation: {
						type: 'service-selection',
						availableServices: services
					}
				});
			}, 1000);
		}, 500), // 500ms debounce delay
		[messages, teamConfig.availableServices, addMessage, updateMessage]
	);

	const debouncedScheduleStart = useCallback(
		debounce(() => {
			// Send user's scheduling request message
			const schedulingMessage: ChatMessageUI = {
				id: crypto.randomUUID(),
				content: "I'd like to request a consultation.",
				isUser: true,
				role: 'user',
				timestamp: Date.now()
			};
			
			addMessage(schedulingMessage);
			setInputValue('');
			
			// Add placeholder message with loading indicator (ChatGPT style)
			const loadingMessageId = crypto.randomUUID();
			const loadingMessage: ChatMessageUI = {
				id: loadingMessageId,
				content: "Let me help you schedule a consultation...",
				isUser: false,
				role: 'assistant',
				timestamp: Date.now(),
				isLoading: true
			};
			addMessage(loadingMessage);
			
			// Use our scheduling utility to create the AI response
			setTimeout(() => {
				const aiResponse = createSchedulingResponse('initial');
				// Update the loading message with actual content
				updateMessage(loadingMessageId, {
					content: aiResponse.content,
					isLoading: false,
					scheduling: aiResponse.scheduling as any
				});
			}, 800);
		}, 500), // 500ms debounce delay
		[messages, addMessage, updateMessage]
	);

	// Add matter creation handlers (now debounced)
	const handleCreateMatterStart = () => {
		// Send matter creation request to agent
		const matterMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: "I'd like to create a new legal matter.",
			isUser: true,
			role: 'user',
			timestamp: Date.now()
		};
		addMessage(matterMessage);
		sendMessage("I'd like to create a new legal matter.", []);
	};

	// Simplified scheduling handlers - agent handles all scheduling logic
	const handleScheduleStart = () => {
		const scheduleMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: "I'd like to schedule a consultation.",
			isUser: true,
			role: 'user',
			timestamp: Date.now()
		};
		addMessage(scheduleMessage);
		sendMessage("I'd like to schedule a consultation.", []);
	};
	
	const handleDateSelect = (date: Date) => {
		const formattedDate = new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		}).format(date);
		
		const dateMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: `I'd like to be contacted on ${formattedDate} for my consultation.`,
			isUser: true,
			role: 'user',
			timestamp: Date.now()
		};
		addMessage(dateMessage);
		sendMessage(`I'd like to be contacted on ${formattedDate} for my consultation.`, []);
	};
	
	const handleTimeOfDaySelect = (timeOfDay: 'morning' | 'afternoon') => {
		const timeOfDayLabel = {
			morning: 'Morning (8:00 AM - 12:00 PM)',
			afternoon: 'Afternoon (12:00 PM - 5:00 PM)'
		}[timeOfDay];
		
		const timeMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: `I prefer to be contacted in the ${timeOfDayLabel}.`,
			isUser: true,
			role: 'user',
			timestamp: Date.now()
		};
		addMessage(timeMessage);
		sendMessage(`I prefer to be contacted in the ${timeOfDayLabel}.`, []);
	};
	
	const handleTimeSlotSelect = (timeSlot: Date) => {
		const formattedTime = new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: 'numeric',
			hour12: true
		}).format(timeSlot);
		
		const formattedDate = new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		}).format(timeSlot);
		
		const timeSlotMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: `I'll be available for a consultation at ${formattedTime} on ${formattedDate}.`,
			isUser: true,
			role: 'user',
			timestamp: Date.now()
		};
		addMessage(timeSlotMessage);
		sendMessage(`I'll be available for a consultation at ${formattedTime} on ${formattedDate}.`, []);
	};
	
	const handleRequestMoreDates = () => {
		const moreDatesMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: "I need to see more date options.",
			isUser: true,
			role: 'user',
			timestamp: Date.now()
		};
		addMessage(moreDatesMessage);
		sendMessage("I need to see more date options.", []);
	};

	// Simplified service selection - agent handles all logic
	const handleServiceSelect = (service: string) => {
		const serviceMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: `I'm looking for legal help with my ${service} issue.`,
			isUser: true,
			role: 'user',
			timestamp: Date.now()
		};
		addMessage(serviceMessage);
		sendMessage(`I'm looking for legal help with my ${service} issue.`, []);
	};

	// Simplified urgency selection - agent handles all logic
	const handleUrgencySelect = (urgency: string) => {
		const urgencyMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: `This is a ${urgency.toLowerCase()} matter.`,
			isUser: true,
			role: 'user',
			timestamp: Date.now()
		};
		addMessage(urgencyMessage);
		sendMessage(`This is a ${urgency.toLowerCase()} matter.`, []);
	};

	// Handle media capture
	const handleMediaCaptureWrapper = (blob: Blob, type: 'audio' | 'video') => {
		const file = handleMediaCapture(blob, type);
		const newMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: '',
			isUser: true,
			role: 'user',
			timestamp: Date.now(),
			files: [file],
		};
		addMessage(newMessage);
	};

	// Handle learn services
	const handleLearnServices = async () => {
		const servicesMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: "Tell me about your firm's services",
			isUser: true,
			role: 'user',
			timestamp: Date.now()
		};
		addMessage(servicesMessage);
		
		// Add placeholder message with loading indicator (ChatGPT style)
		const loadingMessageId = crypto.randomUUID();
		const loadingMessage: ChatMessageUI = {
			id: loadingMessageId,
			content: "Let me tell you about our services...",
			isUser: false,
			isLoading: true,
			role: 'assistant',
			timestamp: Date.now()
		};
		addMessage(loadingMessage);
		
		try {
			// Call the actual API
			await sendMessage("Tell me about your firm's services", []);
			
			// Update the loading message with actual content
			updateMessage(loadingMessageId, {
				content: "Our firm specializes in several practice areas including business law, intellectual property, contract review, and regulatory compliance. We offer personalized legal counsel to help businesses navigate complex legal challenges. Would you like more details about any specific service?",
				isLoading: false
			});
		} catch (error) {
			// Fallback to default response if API fails
			updateMessage(loadingMessageId, {
				content: "Our firm specializes in several practice areas including business law, intellectual property, contract review, and regulatory compliance. We offer personalized legal counsel to help businesses navigate complex legal challenges. Would you like more details about any specific service?",
				isLoading: false
			});
		}
	};

	return (
		<>
			<DragDropOverlay isVisible={isDragging} onClose={() => setIsDragging(false)} />
			
			<AppLayout
				teamNotFound={teamNotFound}
				teamId={teamId}
				onRetryTeamConfig={handleRetryTeamConfig}
				currentTab={currentTab}
				isMobileSidebarOpen={isMobileSidebarOpen}
				onToggleMobileSidebar={setIsMobileSidebarOpen}
				teamConfig={{
					name: teamConfig.name,
					profileImage: teamConfig.profileImage,
					description: teamConfig.description
				}}
				messages={messages}
			>
				<ChatContainer
					messages={messages}
					onSendMessage={sendMessage}
					onDateSelect={handleDateSelect}
					onTimeOfDaySelect={handleTimeOfDaySelect}
					onTimeSlotSelect={handleTimeSlotSelect}
					onRequestMoreDates={handleRequestMoreDates}
					onServiceSelect={handleServiceSelect}
					onUrgencySelect={handleUrgencySelect}
					onCreateMatter={handleCreateMatterStart}
					onScheduleConsultation={handleScheduleStart}
					onLearnServices={handleLearnServices}
					teamConfig={{
						name: teamConfig.name,
						profileImage: teamConfig.profileImage,
						teamId: teamId,
						description: teamConfig.description
					}}
					onOpenSidebar={() => setIsMobileSidebarOpen(true)}
					sessionId={sessionId}
					teamId={teamId}
					onFeedbackSubmit={handleFeedbackSubmit}
					previewFiles={previewFiles}
					removePreviewFile={removePreviewFile}
					handlePhotoSelect={handlePhotoSelect}
					handleCameraCapture={handleCameraCapture}
					handleFileSelect={handleFileSelect}
					handleMediaCapture={handleMediaCaptureWrapper}
					isRecording={isRecording}
					setIsRecording={setIsRecording}
				/>
			</AppLayout>
		</>
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
