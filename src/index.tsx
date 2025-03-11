import { hydrate, prerender as ssr } from 'preact-iso';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
// Remove direct imports of components that will be lazy-loaded
// import FileMenu from './components/FileMenu';
import LoadingIndicator from './components/LoadingIndicator';
// import MediaControls from './components/MediaControls';
import VirtualMessageList from './components/VirtualMessageList';
import { ErrorBoundary } from './components/ErrorBoundary';
import { debounce } from './utils/debounce';
import createLazyComponent from './utils/LazyComponent';
import features from './config/features';
import { detectSchedulingIntent, createSchedulingResponse } from './utils/scheduling';
import './style.css';

// Create lazy-loaded components
const LazyMediaControls = createLazyComponent(
	() => import('./components/MediaControls'),
	'MediaControls'
);

const LazyFileMenu = createLazyComponent(
	() => import('./components/FileMenu'),
	'FileMenu'
);

// Lazy-load other components that might not be needed immediately
const LazyLightbox = createLazyComponent(
	() => import('./components/Lightbox'),
	'Lightbox'
);

const LazyCameraModal = createLazyComponent(
	() => import('./components/CameraModal'),
	'CameraModal'
);

// Lazy-load scheduling components
const LazyScheduleButton = createLazyComponent(
	() => import('./components/scheduling/ScheduleButton'),
	'ScheduleButton'
);

// Define position type
type ChatPosition = 'widget' | 'inline';

interface FileAttachment {
	name: string;
	size: number;
	type: string;
	url: string;
}

// Add scheduling interface
interface SchedulingData {
	type: 'date-selection' | 'time-of-day-selection' | 'time-slot-selection' | 'confirmation';
	selectedDate?: Date;
	timeOfDay?: 'morning' | 'afternoon' | 'evening';
	scheduledDateTime?: Date;
}

interface ChatMessage {
	content: string;
	isUser: boolean;
	files?: FileAttachment[];
	scheduling?: SchedulingData;
	id?: string;
}

const ANIMATION_DURATION = 300;
const RESIZE_DEBOUNCE_DELAY = 100;

export function App() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputValue, setInputValue] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [previewFiles, setPreviewFiles] = useState<FileAttachment[]>([]);
	const [position, setPosition] = useState<ChatPosition>('widget');
	const [isOpen, setIsOpen] = useState(position === 'inline' ? true : false);
	const [teamId, setTeamId] = useState<string>('demo');
	const messageListRef = useRef<HTMLDivElement>(null);
	const [isRecording, setIsRecording] = useState(false);
	const [isDragging, setIsDragging] = useState(false);

	// Track drag counter for better handling of nested elements
	const dragCounter = useRef(0);

	// Parse URL parameters for configuration
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const urlParams = new URLSearchParams(window.location.search);
			const positionParam = urlParams.get('position');
			const teamIdParam = urlParams.get('teamId');
			
			// Add a visible debug element to the DOM
			const debugEl = document.createElement('div');
			debugEl.style.padding = '10px';
			debugEl.style.background = '#f0f0f0';
			debugEl.style.border = '1px solid #ccc';
			debugEl.style.position = 'fixed';
			debugEl.style.top = '0';
			debugEl.style.left = '0';
			debugEl.style.zIndex = '9999';
			debugEl.style.fontSize = '12px';
			debugEl.style.fontFamily = 'monospace';
			debugEl.innerHTML = `
				<strong>URL Debug:</strong><br>
				Search: ${window.location.search}<br>
				Position: ${positionParam || 'not set'}<br>
				TeamId: ${teamIdParam || 'not set'}<br>
			`;
			document.body.appendChild(debugEl);
			
			// Set position based on URL parameter
			if (positionParam === 'widget' || positionParam === 'inline') {
				setPosition(positionParam);
				// Immediately update isOpen based on position
				if (positionParam === 'inline') {
					setIsOpen(true);
				} else {
					setIsOpen(false);
				}
			}

			// Set teamId if available, otherwise keep the default "demo"
			if (teamIdParam) {
				setTeamId(teamIdParam);
			}
		}
	}, []);

	// Set up postMessage communication with parent frame
	useEffect(() => {
		// Function to notify parent frame of state changes
		const notifyParent = (eventType: string, data: any = {}) => {
			if (window.parent !== window) {
				window.parent.postMessage({
					type: eventType,
					...data
				}, '*');
			}
		};

		// Notify parent when open/closed state changes
		notifyParent('chatStateChange', { isOpen });

		// Listen for messages from parent
		const handleParentMessage = (event: MessageEvent) => {
			if (event.data && event.data.type && position === 'widget') {
				switch (event.data.type) {
					case 'toggleChat':
						setIsOpen(prev => !prev);
						break;
					case 'openChat':
						setIsOpen(true);
						break;
					case 'closeChat':
						setIsOpen(false);
						break;
				}
			}
		};

		window.addEventListener('message', handleParentMessage);
		
		return () => {
			window.removeEventListener('message', handleParentMessage);
		};
	}, [isOpen, position]);

	const handleInputChange = useCallback((e: Event) => {
		const target = e.currentTarget as HTMLTextAreaElement;
		setInputValue(target.value);
		
		// More reliable auto-expand logic
		// Set to 0 first to force a recalculation of scrollHeight
		target.style.height = '0';
		// Add a small buffer to the scrollHeight to avoid text cutting off
		const newHeight = Math.max(24, target.scrollHeight + 2);
		target.style.height = `${newHeight}px`;
		
		// Force the browser to recalculate layout
		setTimeout(() => {
			// Double check the height after browser layout is updated
			if (target.scrollHeight > parseInt(target.style.height)) {
				target.style.height = `${target.scrollHeight + 2}px`;
			}
		}, 0);
	}, []);

	// Simple resize handler for window size changes
	useEffect(() => {
		const handleResize = () => {
			const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
			if (textarea) {
				// Use the same improved auto-expand logic
				textarea.style.height = '0';
				const newHeight = Math.max(24, textarea.scrollHeight);
				textarea.style.height = `${newHeight}px`;
			}
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Initialize textarea height on mount
	useEffect(() => {
		const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
		if (textarea && textarea.value) {
			textarea.style.height = '0';
			const newHeight = Math.max(24, textarea.scrollHeight);
			textarea.style.height = `${newHeight}px`;
		}
	}, []);

	const handlePhotoSelect = async (files: File[]) => {
		const fileAttachments: FileAttachment[] = await Promise.all(
			files.map(async (file) => ({
				name: file.name,
				size: file.size,
				type: file.type,
				url: URL.createObjectURL(file),
			}))
		);

		setPreviewFiles(prev => [...prev, ...fileAttachments]);
	};

	const handleCameraCapture = async (file: File) => {
		const fileAttachment: FileAttachment = {
			name: file.name,
			size: file.size,
			type: file.type,
			url: URL.createObjectURL(file),
		};

		setPreviewFiles(prev => [...prev, fileAttachment]);
	};

	const handleFileSelect = async (files: File[]) => {
		const fileAttachments: FileAttachment[] = await Promise.all(
			files.map(async (file) => ({
				name: file.name,
				size: file.size,
				type: file.type,
				url: URL.createObjectURL(file),
			}))
		);

		setPreviewFiles(prev => [...prev, ...fileAttachments]);
	};

	const removePreviewFile = (index: number) => {
		setPreviewFiles(prev => prev.filter((_, i) => i !== index));
	};

	const handleMediaCapture = (blob: Blob, type: 'audio' | 'video') => {
		const url = URL.createObjectURL(blob);
		const file: FileAttachment = {
			name: `Recording_${new Date().toISOString()}.webm`,
			size: blob.size,
			type: blob.type,
			url,
		};

		const newMessage: ChatMessage = {
			content: '',
			isUser: true,
			files: [file],
		};

		setMessages((prev) => [...prev, newMessage]);
	};

	// Add scheduling handlers
	const handleScheduleStart = () => {
		// Send user's scheduling request message
		const schedulingMessage: ChatMessage = {
			content: "I'd like to schedule something with you.",
			isUser: true
		};
		
		setMessages([...messages, schedulingMessage]);
		setInputValue('');
		setIsLoading(true);
		
		// Use our scheduling utility to create the AI response
		setTimeout(() => {
			const aiResponse = createSchedulingResponse('initial');
			setMessages(prev => [...prev, aiResponse]);
			setIsLoading(false);
		}, 800);
	};
	
	const handleDateSelect = (date: Date) => {
		// Send user's selected date as a message
		const formattedDate = new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		}).format(date);
		
		const dateSelectionMessage: ChatMessage = {
			content: `I'd like to schedule on ${formattedDate}.`,
			isUser: true
		};
		
		setMessages(prev => [...prev, dateSelectionMessage]);
		setIsLoading(true);
		
		// Simulate AI response with time of day options
		setTimeout(() => {
			const aiResponse: ChatMessage = {
				content: `Great! What time on ${formattedDate} works best for you?`,
				isUser: false,
				scheduling: {
					type: 'time-of-day-selection',
					selectedDate: date
				}
			};
			
			setMessages(prev => [...prev, aiResponse]);
			setIsLoading(false);
		}, 800);
	};
	
	const handleTimeOfDaySelect = (timeOfDay: 'morning' | 'afternoon' | 'evening') => {
		// Get the most recent selected date from messages
		const lastDateSelection = [...messages]
			.reverse()
			.find(msg => msg.scheduling?.selectedDate)?.scheduling?.selectedDate;
			
		if (!lastDateSelection) return;
		
		// Map time of day to human-readable string
		const timeOfDayLabel = {
			morning: 'Morning (8:00 AM - 12:00 PM)',
			afternoon: 'Afternoon (12:00 PM - 5:00 PM)',
			evening: 'Evening (5:00 PM - 9:00 PM)'
		}[timeOfDay];
		
		// Format the date
		const formattedDate = new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		}).format(lastDateSelection);
		
		// Send user's time of day selection as a message
		const timeSelectionMessage: ChatMessage = {
			content: `I prefer ${timeOfDayLabel} on ${formattedDate}.`,
			isUser: true
		};
		
		setMessages(prev => [...prev, timeSelectionMessage]);
		setIsLoading(true);
		
		// Simulate AI response with specific time slots
		setTimeout(() => {
			const aiResponse: ChatMessage = {
				content: `Great! Here are the available time slots for ${formattedDate} in the ${timeOfDay}:`,
				isUser: false,
				scheduling: {
					type: 'time-slot-selection',
					selectedDate: lastDateSelection,
					timeOfDay
				}
			};
			
			setMessages(prev => [...prev, aiResponse]);
			setIsLoading(false);
		}, 800);
	};
	
	const handleTimeSlotSelect = (timeSlot: Date) => {
		// Format the time
		const formattedTime = new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: 'numeric',
			hour12: true
		}).format(timeSlot);
		
		// Format the full date
		const formattedDate = new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		}).format(timeSlot);
		
		// Send user's time slot selection as a message
		const timeSlotSelectionMessage: ChatMessage = {
			content: `I'd like to schedule for ${formattedTime} on ${formattedDate}.`,
			isUser: true
		};
		
		setMessages(prev => [...prev, timeSlotSelectionMessage]);
		setIsLoading(true);
		
		// Simulate AI confirmation response
		setTimeout(() => {
			const aiResponse: ChatMessage = {
				content: `Perfect! I've scheduled our appointment for ${formattedTime} on ${formattedDate}. Is there anything specific you'd like to discuss during our meeting?`,
				isUser: false,
				scheduling: {
					type: 'confirmation',
					scheduledDateTime: timeSlot
				}
			};
			
			setMessages(prev => [...prev, aiResponse]);
			setIsLoading(false);
		}, 800);
	};
	
	const handleRequestMoreDates = () => {
		// Send user's request for more dates as a message
		const moreDatesMessage: ChatMessage = {
			content: "I need to see more date options.",
			isUser: true
		};
		
		setMessages(prev => [...prev, moreDatesMessage]);
		setIsLoading(true);
		
		// Find the most recent date-selection message
		const latestDateSelectionMsg = [...messages]
			.reverse()
			.find(msg => msg.scheduling?.type === 'date-selection');
			
		// Calculate new start date - add 9 days to the previous start date
		let startDate = new Date();
		if (latestDateSelectionMsg?.scheduling?.selectedDate) {
			startDate = new Date(latestDateSelectionMsg.scheduling.selectedDate);
			startDate.setDate(startDate.getDate() + 9); // Add 9 days
		}
		
		// Simulate AI response with more dates
		setTimeout(() => {
			const aiResponse: ChatMessage = {
				content: "Here are some additional dates to choose from:",
				isUser: false,
				scheduling: {
					type: 'date-selection',
					selectedDate: startDate
				}
			};
			
			setMessages(prev => [...prev, aiResponse]);
			setIsLoading(false);
		}, 800);
	};

	// Make real API calls to ai.blawby.com with SSE support
	const sendMessageToAPI = async (message: string, attachments: FileAttachment[] = []) => {
		setIsLoading(true);
		
		// In a real implementation, this would be a call to your AI service API
		try {
			// Create user message
			const userMessage: ChatMessage = {
				content: message,
				isUser: true,
				files: attachments
			};
			
			setMessages(prev => [...prev, userMessage]);
			setInputValue('');
			setPreviewFiles([]);
			
			// Add a placeholder AI message immediately that will be updated
			const placeholderId = Date.now().toString();
			const placeholderMessage: ChatMessage = {
				content: '',
				isUser: false,
				id: placeholderId
			};
			
			setMessages(prev => [...prev, placeholderMessage]);
			
			// Check if this is a scheduled message (could come from API in real implementation)
			const hasSchedulingIntent = detectSchedulingIntent(message);
			
			// This simulates the AI detecting scheduling intent and responding
			if (hasSchedulingIntent) {
				// Start typing after a short delay
				setTimeout(() => {
					setIsLoading(false); // Remove loading indicator once typing begins
					
					// Create a scheduling response using our utility
					const aiResponse = createSchedulingResponse('initial');
					
					// Replace the placeholder message with the actual response
					setMessages(prev => prev.map(msg => 
						msg.id === placeholderId ? { ...aiResponse, id: placeholderId } : msg
					));
				}, 1000);
				
				return;
			}
			
			// Simulate normal AI response for non-scheduling messages
			setTimeout(() => {
				setIsLoading(false); // Remove loading indicator once typing begins
				
				const aiResponse: ChatMessage = {
					content: `This is a simulated response to: "${message}"`,
					isUser: false,
					id: placeholderId
				};
				
				// Replace the placeholder message with the actual response
				setMessages(prev => prev.map(msg => 
					msg.id === placeholderId ? aiResponse : msg
				));
			}, 1000);
			
		} catch (error) {
			console.error('Error sending message:', error);
			setIsLoading(false);
			
			// Add error message
			const errorMessage: ChatMessage = {
				content: "Sorry, there was an error processing your request. Please try again.",
				isUser: false
			};
			
			setMessages(prev => [...prev, errorMessage]);
		}
	};

	// Update handleSubmit to use the new API function
	const handleSubmit = () => {
		if (!inputValue.trim() && previewFiles.length === 0) return;

		const placeholderId = Date.now().toString();
		const attachments = [...previewFiles];
		
		// Send message to API
		sendMessageToAPI(inputValue.trim(), attachments);
		
		// Reset input and focus
		setInputValue('');
		setPreviewFiles([]);
		
		// Properly reset textarea height after sending message
		const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
		if (textarea) {
			textarea.style.height = '24px'; // Reset to minimum height
			textarea.focus();
		}
	};

	const handleKeyPress = (e: KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	// Add a helper function to get the appropriate file icon based on file type
	const getFileIcon = (file: FileAttachment) => {
		// Get file extension
		const ext = file.name.split('.').pop()?.toLowerCase();
		
		// PDF icon
		if (file.type === 'application/pdf' || ext === 'pdf') {
			return (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<path fill="currentColor" d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm12 6V9c0-.55-.45-1-1-1h-2v5h2c.55 0 1-.45 1-1zm-2-3h1v3h-1V9zm4 2h1v-1h-1V9h1V8h-2v5h1v-1zm-8 0h1c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1H9v5h1v-2zm0-2h1v1h-1V9z"/>
				</svg>
			);
		}
		
		// Word document icon
		if (file.type === 'application/msword' || 
			file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			ext === 'doc' || ext === 'docx') {
			return (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm10-9h-4v1h4v-1zm0 3H8v1h8v-1zm0 3H8v1h8v-1z"/>
				</svg>
			);
		}
		
		// Excel spreadsheet icon
		if (file.type === 'application/vnd.ms-excel' || 
			file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
			ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
			return (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm7-7H8v-2h5v2zm0 4H8v-2h5v2zm2-2v-2h2v2h-2zm0 4v-2h2v2h-2z"/>
				</svg>
			);
		}
		
		// Audio file icon
		if (file.type.startsWith('audio/')) {
			return (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm-2 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
				</svg>
			);
		}
		
		// Video file icon
		if (file.type.startsWith('video/')) {
			return (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
				</svg>
			);
		}
		
		// Default file icon
		return (
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
				<path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v6h6v10H6z" />
			</svg>
		);
	};

	// Handle file drag-and-drop events
	const handleDragEnter = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounter.current += 1;
		setIsDragging(true);
	};

	const handleDragLeave = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		
		dragCounter.current -= 1;
		
		// Only reset dragging state when we've left all drag elements
		if (dragCounter.current === 0) {
			setIsDragging(false);
		}
	};

	const handleDragOver = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = async (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounter.current = 0;
		setIsDragging(false);

		// Get all files from the drop event
		const droppedFiles = Array.from(e.dataTransfer?.files || []);
		
		if (droppedFiles.length === 0) return;

		// Separate different types of files
		const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
		const videoFiles = droppedFiles.filter(file => file.type.startsWith('video/'));
		const otherFiles = droppedFiles.filter(file => 
			!file.type.startsWith('image/') && 
			!file.type.startsWith('video/')
		);

		// Apply file type validation
		const mediaFiles = [...imageFiles, ...videoFiles];
		const safeOtherFiles = otherFiles.filter(file => {
			const fileExtension = file.name.split('.').pop()?.toLowerCase();
			const disallowedExtensions = ['zip', 'exe', 'bat', 'cmd', 'msi', 'app'];
			return !disallowedExtensions.includes(fileExtension || '');
		});

		// Handle media files
		if (mediaFiles.length > 0) {
			await handlePhotoSelect(mediaFiles);
		}

		// Handle other valid files
		if (safeOtherFiles.length > 0) {
			await handleFileSelect(safeOtherFiles);
		}

		// Show alert if any files were filtered out
		if (safeOtherFiles.length < otherFiles.length) {
			alert('Some files were not uploaded because they have disallowed file extensions (zip, exe, etc.)');
		}
	};

	// Register global drag handlers on the document body
	useEffect(() => {
		if (typeof document !== 'undefined') {
			document.body.addEventListener('dragenter', handleDragEnter);
			document.body.addEventListener('dragleave', handleDragLeave);
			document.body.addEventListener('dragover', handleDragOver);
			document.body.addEventListener('drop', handleDrop);

			return () => {
				document.body.removeEventListener('dragenter', handleDragEnter);
				document.body.removeEventListener('dragleave', handleDragLeave);
				document.body.removeEventListener('dragover', handleDragOver);
				document.body.removeEventListener('drop', handleDrop);
			};
		}
	}, []);

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

	return (
		<>
			{isDragging && (
				<div 
					className="drag-overlay" 
					role="dialog"
					aria-label="File upload"
					aria-modal="true"
				>
					<div className="drag-message">
						<svg 
							className="drag-message-icon" 
							xmlns="http://www.w3.org/2000/svg" 
							viewBox="0 0 24 24" 
							fill="none" 
							stroke="currentColor" 
							stroke-width="2" 
							stroke-linecap="round" 
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
							<path d="M12 12v9"></path>
							<path d="m16 16-4-4-4 4"></path>
						</svg>
						<h3 className="drag-message-title">Drop Files to Upload</h3>
						<p className="drag-message-subtitle">We accept images, videos, and document files</p>
					</div>
				</div>
			)}
		
			{/* Place toggle button outside main container for widget mode */}
			{position === 'widget' && (
				<button 
					className={`chat-toggle standalone ${isOpen ? 'chat-open' : 'chat-closed'}`}
					onClick={() => setIsOpen(prev => !prev)}
					aria-label={isOpen ? "Minimize chat" : "Open chat"}
					title={isOpen ? "Minimize chat" : "Open chat"}
				>
					{isOpen ? (
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
							<path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
						</svg>
					) : (
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
							<path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
						</svg>
					)}
				</button>
			)}
		
			<div 
				className={`chat-container ${position} ${position === 'widget' ? (isOpen ? 'open' : 'closed') : ''}`} 
				role="application" 
				aria-label="Chat interface"
				aria-expanded={position === 'inline' ? true : isOpen}
			>
				<ErrorBoundary>
					{(position === 'inline' || isOpen) && (
						<main className="chat-main">
							{messages.length === 0 && (
								<div className="welcome-message">
									<h1>What can I help with?</h1>
								</div>
							)}
							<VirtualMessageList 
								messages={messages}
								isLoading={isLoading}
								onDateSelect={handleDateSelect}
								onTimeOfDaySelect={handleTimeOfDaySelect}
								onTimeSlotSelect={handleTimeSlotSelect}
								onRequestMoreDates={handleRequestMoreDates}
							/>
							<div className="input-area" role="form" aria-label="Message composition">
								<div className="input-container">
									{previewFiles.length > 0 && (
										<div className="input-preview" role="list" aria-label="File attachments">
											{previewFiles.map((file, index) => (
												<div 
													className={`input-preview-item ${file.type.startsWith('image/') ? 'image-preview' : 'file-preview'}`}
													key={index}
													role="listitem"
												>
													{file.type.startsWith('image/') ? (
														<>
															<img src={file.url} alt={`Preview of ${file.name}`} />
														</>
													) : (
														<>
															<div className="file-thumbnail" aria-hidden="true">
																{getFileIcon(file)}
															</div>
															<div className="file-info">
																<div className="file-name">{file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}</div>
																<div className="file-ext">{file.name.split('.').pop()}</div>
															</div>
														</>
													)}
													<button
														type="button"
														className="input-preview-remove"
														onClick={() => removePreviewFile(index)}
														title="Remove file"
														aria-label={`Remove ${file.name}`}
													>
														<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
															<path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
														</svg>
													</button>
												</div>
											))}
										</div>
									)}
									<div className="textarea-wrapper">
										<textarea
											className="message-input"
											placeholder="Type a message..."
											rows={1}
											value={inputValue}
											onInput={handleInputChange}
											onKeyPress={handleKeyPress}
											disabled={isLoading}
											aria-label="Message input"
											aria-multiline="true"
											style={{ 
												minHeight: '24px',
												width: '100%'
											}}
										/>
									</div>
									<span id="input-instructions" className="sr-only">
										Type your message and press Enter to send. Use the buttons below to attach files or record audio.
									</span>
									<div className="input-controls-row">
										<div className="input-controls">
											{!isRecording && (
												<div className="input-left-controls">
													<LazyFileMenu
														onPhotoSelect={handlePhotoSelect}
														onCameraCapture={handleCameraCapture}
														onFileSelect={handleFileSelect}
													/>
													
													<LazyScheduleButton
														onClick={handleScheduleStart}
														disabled={isLoading}
													/>
												</div>
											)}
											
											<div className="send-controls">
												{features.enableAudioRecording && (
													<LazyMediaControls
														onMediaCapture={handleMediaCapture}
														onRecordingStateChange={setIsRecording}
													/>
												)}
												
												<button
													className="send-button"
													type="button"
													onClick={handleSubmit}
													disabled={(!inputValue.trim() && previewFiles.length === 0) || isLoading}
													aria-label={(!inputValue.trim() && previewFiles.length === 0) ? "Send message (disabled)" : "Send message"}
												>
													<svg
														viewBox="0 0 24 24"
														className="send-icon"
														xmlns="http://www.w3.org/2000/svg"
														aria-hidden="true"
													>
														{(!inputValue.trim() && previewFiles.length === 0) ? (
															// Paper plane icon when nothing to send
															<path
																fill="currentColor"
																d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
															/>
														) : (
															// Up arrow icon when ready to send
															<path
																fill="currentColor"
																d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"
															/>
														)}
													</svg>
												</button>
											</div>
										</div>
									</div>
								</div>
							</div>
						</main>
					)}
				</ErrorBoundary>
			</div>
		</>
	);
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.getElementById('app'));
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
