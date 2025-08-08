import { hydrate, prerender as ssr } from 'preact-iso';
import { useState, useRef, useEffect, useCallback, useMemo } from 'preact/hooks';
// Remove direct imports of components that will be lazy-loaded
import MessageComposer from './components/MessageComposer';
import VirtualMessageList from './components/VirtualMessageList';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TeamNotFound } from './components/TeamNotFound';
import TeamProfile from './components/TeamProfile';
import MediaSidebar from './components/MediaSidebar';
import PrivacySupportSidebar from './components/PrivacySupportSidebar';
import LeftSidebar from './components/LeftSidebar';
import BottomNavigation from './components/BottomNavigation';
import features from './config/features';
import MobileSidebar from './components/MobileSidebar';
import MobileTopNav from './components/MobileTopNav';
import PaymentEmbed from './components/PaymentEmbed';
import { debounce } from './utils/debounce';
// Removed unused useDebounce import
// Removed unused LazyComponent import
import { detectSchedulingIntent, createSchedulingResponse } from './utils/scheduling';
import { getFormsEndpoint, getTeamsEndpoint, getAgentEndpoint, getAgentStreamEndpoint } from './config/api';

import {
	DocumentIcon,
	DocumentTextIcon,
	TableCellsIcon,
	MusicalNoteIcon,
	VideoCameraIcon,
	ChatBubbleLeftIcon,
	CloudArrowUpIcon,
	FaceSmileIcon
} from '@heroicons/react/24/outline';
import './style.css';

// Create lazy-loaded components
// Agent handles all functionality - no lazy components needed

// Define position type
interface FileAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

import { ChatMessageUI } from '../worker/types';

const ANIMATION_DURATION = 300;
const RESIZE_DEBOUNCE_DELAY = 100;

// Utility function to format form data for submission
function formatFormData(formData: any, teamId: string) {
	return {
		...formData,
		teamId,
		timestamp: new Date().toISOString()
	};
}

// Utility function to upload a file to backend
async function uploadFileToBackend(file: File, teamId: string, sessionId: string) {
	const formData = new FormData();
	formData.append('file', file);
	formData.append('teamId', teamId);
	formData.append('sessionId', sessionId);

	const response = await fetch('/api/files/upload', {
		method: 'POST',
		body: formData,
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({})) as any;
		throw new Error(error?.error || 'File upload failed');
	}
	const result = await response.json() as any;
	return result.data;
}

export function App() {
	const [messages, setMessages] = useState<ChatMessageUI[]>([]);
	const [inputValue, setInputValue] = useState('');
	// Global loading state removed - using per-message loading instead
	const [previewFiles, setPreviewFiles] = useState<FileAttachment[]>([]);

	const [teamId, setTeamId] = useState<string>('');
	const [sessionId] = useState<string>(() => crypto.randomUUID());
	const [teamNotFound, setTeamNotFound] = useState<boolean>(false);
	const messageListRef = useRef<HTMLDivElement>(null);
	const [isRecording, setIsRecording] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	// Agent handles all conversation flow - no manual state management needed

	// State for team configuration
	const [teamConfig, setTeamConfig] = useState<{
		name: string;
		profileImage: string | null;
		introMessage: string | null;
		description: string | null;
		availableServices: string[];
		serviceQuestions?: Record<string, string[]>;
		jurisdiction?: {
			type: 'national' | 'state';
			description: string;
			supportedStates: string[];
			supportedCountries: string[];
			primaryState?: string;
		};
	}>({
		name: 'Blawby AI',
		profileImage: '/blawby-favicon-iframe.png',
		introMessage: null,
		description: null,
		availableServices: [],
		serviceQuestions: {},
		jurisdiction: {
			type: 'national',
			description: 'Available nationwide',
			supportedStates: ['all'],
			supportedCountries: ['US']
		}
	});

	// Simplified state - agent handles all conversation flow
	const [currentTab, setCurrentTab] = useState<'chats'>('chats');
	
	// State for mobile sidebar
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

	// State to prevent multiple simultaneous requests
	// Simplified state - no complex processing needed

	// Track drag counter for better handling of nested elements
	const dragCounter = useRef(0);

	// Handle feedback submission
	const handleFeedbackSubmit = useCallback((feedback: any) => {
		console.log('Feedback submitted:', feedback);
		// Could show a toast notification here
	}, []);



	// Load matters from messages (convert existing matter canvases to matters)
	useEffect(() => {
		// Removed matter loading logic
	}, [messages]);



	// Parse URL parameters for configuration
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const urlParams = new URLSearchParams(window.location.search);
			const teamIdParam = urlParams.get('teamId');
			const hostname = window.location.hostname;
			
			// Domain-based team routing
			if (hostname === 'northcarolinalegalservices.blawby.com') {
				setTeamId('north-carolina-legal-services');
				return;
			}
			
			// Check if we're on the root domain with no parameters - redirect to Blawby AI
			if (hostname === 'ai.blawby.com' && 
				window.location.pathname === '/' && 
				!teamIdParam) {
				// Redirect to Blawby AI
				window.location.href = 'https://ai.blawby.com/?teamId=blawby-ai';
				return;
			}

			// Set teamId if available, otherwise default to blawby-ai
			if (teamIdParam) {
				setTeamId(teamIdParam);
			} else {
				setTeamId('blawby-ai');
			}
		}
	}, []);



	const handleInputChange = useCallback((e: Event) => {
		const target = e.currentTarget as HTMLTextAreaElement;
		setInputValue(target.value);
		
		// Simple approach: reset height then set to scrollHeight
		target.style.height = '24px'; // Reset to default height first
		target.style.height = `${Math.max(24, target.scrollHeight)}px`;
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

	// Fetch team configuration
	const fetchTeamConfig = async () => {
		if (!teamId) {
			return; // Don't fetch if no teamId (shouldn't happen with default)
		}
		
		try {
			const response = await fetch(getTeamsEndpoint());
			if (response.ok) {
				const teamsResponse = await response.json() as any;
				const team = teamsResponse.data.find((t: any) => t.slug === teamId || t.id === teamId);
				if (team?.config) {
					const config = {
						name: team.name || 'Blawby AI',
						profileImage: team.config.profileImage || '/blawby-favicon-iframe.png',
						introMessage: team.config.introMessage || null,
						description: team.config.description || null,
						availableServices: team.config.availableServices || [],
						serviceQuestions: team.config.serviceQuestions || {},
						jurisdiction: team.config.jurisdiction || {
							type: 'national',
							description: 'Available nationwide',
							supportedStates: ['all'],
							supportedCountries: ['US']
						}
					};
					setTeamConfig(config);
					setTeamNotFound(false);
				} else {
					setTeamNotFound(true);
				}
			} else {
				setTeamNotFound(true);
			}
		} catch (error) {
			console.warn('Failed to fetch team config:', error);
			setTeamNotFound(true);
		}
	};

	// Fetch team config on mount and when teamId changes
	useEffect(() => {
		fetchTeamConfig();
	}, [teamId]);

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
	}, [teamConfig.introMessage, messages.length]);

	// Retry function for team config
	const handleRetryTeamConfig = () => {
		setTeamNotFound(false);
		fetchTeamConfig();
	};

	const handlePhotoSelect = async (files: File[]) => {
		if (!teamId || !sessionId) {
			alert('Missing team or session ID. Cannot upload files.');
			return;
		}
		for (const file of files) {
			try {
				const uploaded = await uploadFileToBackend(file, teamId, sessionId);
				const fileAttachment: FileAttachment = {
					name: uploaded.fileName,
					size: uploaded.fileSize || file.size,
					type: uploaded.fileType,
					url: uploaded.url,
				};
				setPreviewFiles(prev => [...prev, fileAttachment]);
			} catch (err: any) {
				alert(`Failed to upload file: ${file.name}\n${err.message}`);
			}
		}
	};

	const handleCameraCapture = async (file: File) => {
		if (!teamId || !sessionId) {
			alert('Missing team or session ID. Cannot upload files.');
			return;
		}
		try {
			const uploaded = await uploadFileToBackend(file, teamId, sessionId);
			const fileAttachment: FileAttachment = {
				name: uploaded.fileName,
				size: uploaded.fileSize || file.size,
				type: uploaded.fileType,
				url: uploaded.url,
			};
			setPreviewFiles(prev => [...prev, fileAttachment]);
		} catch (err: any) {
			alert(`Failed to upload file: ${file.name}\n${err.message}`);
		}
	};

	const handleFileSelect = async (files: File[]) => {
		if (!teamId || !sessionId) {
			alert('Missing team or session ID. Cannot upload files.');
			return;
		}
		for (const file of files) {
			try {
				const uploaded = await uploadFileToBackend(file, teamId, sessionId);
				const fileAttachment: FileAttachment = {
					name: uploaded.fileName,
					size: uploaded.fileSize || file.size,
					type: uploaded.fileType,
					url: uploaded.url,
				};
				setPreviewFiles(prev => [...prev, fileAttachment]);
			} catch (err: any) {
				alert(`Failed to upload file: ${file.name}\n${err.message}`);
			}
		}
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

		const newMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: '',
			isUser: true,
			role: 'user',
			timestamp: Date.now(),
			files: [file],
		};

		setMessages((prev) => [...prev, newMessage]);
	};

	// Create debounced welcome button handlers to prevent spam clicks
	const debouncedCreateMatterStart = useMemo(() => 
		debounce(() => {
			// Send user's matter creation request message
			const matterMessage: ChatMessageUI = {
				id: crypto.randomUUID(),
				content: "I'd like to create a matter and get help with my legal concern.",
				isUser: true,
				role: 'user',
				timestamp: Date.now()
			};
			
			setMessages([...messages, matterMessage]);
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
			setMessages(prev => [...prev, loadingMessage]);
			
			// Start matter creation flow
			setTimeout(() => {
				const services = teamConfig.availableServices || [];
				const serviceOptions = services.length > 0 
					? services.map(service => `• ${service}`).join('\n')
					: '• Family Law\n• Business Law\n• Employment Law\n• Real Estate\n• Criminal Law\n• Other';
				
				// Update the loading message with actual content
				setMessages(prev => prev.map(msg => 
					msg.id === loadingMessageId 
						? {
							...msg,
							content: `I'm here to help you create a matter and assess your legal situation. We provide legal services for the following areas:\n\n${serviceOptions}\n\nPlease select the type of legal matter you're dealing with, or choose "General Inquiry" if you're not sure:`,
							isLoading: false,
							matterCreation: {
								type: 'service-selection',
								availableServices: services
							}
						}
						: msg
				));
				
				// Start matter creation flow
						// Agent handles matter creation flow
			}, 1000);
		}, 500), // 500ms debounce delay
		[messages, teamConfig.availableServices]
	);

	const debouncedScheduleStart = useMemo(() => 
		debounce(() => {
			// Send user's scheduling request message
			const schedulingMessage: ChatMessageUI = {
				id: crypto.randomUUID(),
				content: "I'd like to request a consultation.",
				isUser: true,
				role: 'user',
				timestamp: Date.now()
			};
			
			setMessages([...messages, schedulingMessage]);
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
			setMessages(prev => [...prev, loadingMessage]);
			
			// Use our scheduling utility to create the AI response
			setTimeout(() => {
				const aiResponse = createSchedulingResponse('initial');
				// Update the loading message with actual content
				setMessages(prev => prev.map(msg => 
					msg.id === loadingMessageId 
						? {
							...msg,
							content: aiResponse.content,
							isLoading: false,
							scheduling: aiResponse.scheduling
						}
						: msg
				));
			}, 800);
		}, 500), // 500ms debounce delay
		[messages]
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
		setMessages(prev => [...prev, matterMessage]);
		sendMessageToAPI("I'd like to create a new legal matter.", []);
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
		setMessages(prev => [...prev, scheduleMessage]);
		sendMessageToAPI("I'd like to schedule a consultation.", []);
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
		setMessages(prev => [...prev, dateMessage]);
		sendMessageToAPI(`I'd like to be contacted on ${formattedDate} for my consultation.`, []);
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
		setMessages(prev => [...prev, timeMessage]);
		sendMessageToAPI(`I prefer to be contacted in the ${timeOfDayLabel}.`, []);
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
		setMessages(prev => [...prev, timeSlotMessage]);
		sendMessageToAPI(`I'll be available for a consultation at ${formattedTime} on ${formattedDate}.`, []);
	};
	
	const handleRequestMoreDates = () => {
		const moreDatesMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: "I need to see more date options.",
			isUser: true,
			role: 'user',
			timestamp: Date.now()
		};
		setMessages(prev => [...prev, moreDatesMessage]);
		sendMessageToAPI("I need to see more date options.", []);
	};

	// Make real API calls to ai.blawby.com with SSE support
	const sendMessageToAPI = async (message: string, attachments: FileAttachment[] = []) => {
		
		// In a real implementation, this would be a call to your AI service API
		try {
			// Create user message
			const userMessage: ChatMessageUI = {
				id: crypto.randomUUID(),
				content: message,
				isUser: true,
				role: 'user',
				timestamp: Date.now(),
				files: attachments
			};
			
			setMessages(prev => [...prev, userMessage]);
			setInputValue('');
			setPreviewFiles([]);
			
			// Add a placeholder AI message immediately that will be updated
			const placeholderId = Date.now().toString();
			const placeholderMessage: ChatMessageUI = {
				id: placeholderId,
				content: '',
				isUser: false,
				role: 'assistant',
				timestamp: Date.now(),
				isLoading: true
			};
			
			setMessages(prev => [...prev, placeholderMessage]);
			
			// Agent handles all conversation flow - no manual form processing needed
			
			// Create message history from existing messages
			const messageHistory = messages.map(msg => ({
				role: msg.isUser ? 'user' : 'assistant',
				content: msg.content
			}));
			
			// Add current message
			messageHistory.push({
				role: 'user',
				content: message
			});
			
			// Try streaming first, fallback to regular API
			try {
				await sendMessageWithStreaming(messageHistory, teamId, sessionId, placeholderId);
			} catch (streamingError) {
				console.warn('Streaming failed, falling back to regular API:', streamingError);
				await sendMessageWithRegularAPI(messageHistory, teamId, sessionId, placeholderId);
			}
			
		} catch (error) {
			console.error('Error sending message:', error);
			
			// Update placeholder with error message - use the placeholderId from the outer scope
			const placeholderId = Date.now().toString();
			setMessages(prev => prev.map(msg => 
				msg.id === placeholderId ? { 
					...msg, 
					content: "Sorry, there was an error processing your request. Please try again.",
					isLoading: false 
				} : msg
			));
		}
	};

	// New streaming message handler using EventSource
	const sendMessageWithStreaming = async (
		messageHistory: any[], 
		teamId: string, 
		sessionId: string, 
		placeholderId: string
	) => {
		const apiEndpoint = getAgentStreamEndpoint();
		
		// Create the request body
		const requestBody = {
			messages: messageHistory,
			teamId: teamId,
			sessionId: sessionId
		};

		// Use fetch with POST to send the request and get the stream
		const response = await fetch(apiEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			throw new Error(`Streaming API error: ${response.status}`);
		}

		// Get the response body as a readable stream
		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error('No response body available');
		}

		const decoder = new TextDecoder();
		let buffer = '';
		let currentContent = '';

		try {
			while (true) {
				const { done, value } = await reader.read();
				
				if (done) break;
				
				// Decode the chunk and add to buffer
				buffer += decoder.decode(value, { stream: true });
				
				// Process complete SSE events
				const lines = buffer.split('\n');
				buffer = lines.pop() || ''; // Keep incomplete line in buffer
				
				for (const line of lines) {
					if (line.startsWith('data: ')) {
						try {
							const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix
							
							switch (data.type) {
								case 'connected':
									// Connection established, start showing typing indicator
									setMessages(prev => prev.map(msg => 
										msg.id === placeholderId ? { 
											...msg, 
											content: 'AI is thinking...',
											isLoading: true 
										} : msg
									));
									break;
									
								case 'text':
									// Add text chunk to current content
									currentContent += data.text;
									setMessages(prev => prev.map(msg => 
										msg.id === placeholderId ? { 
											...msg, 
											content: currentContent,
											isLoading: false 
										} : msg
									));
									break;
									
								case 'typing':
									// Show typing indicator during tool calls
									setMessages(prev => prev.map(msg => 
										msg.id === placeholderId ? { 
											...msg, 
											content: currentContent + '...',
											isLoading: true 
										} : msg
									));
									break;
									
								case 'tool_call':
									// Tool call detected, show processing message
									setMessages(prev => prev.map(msg => 
										msg.id === placeholderId ? { 
											...msg, 
											content: currentContent + '\n\nProcessing your request...',
											isLoading: true 
										} : msg
									));
									break;
									
								case 'tool_result':
									// Tool result received, update content
									if (data.result && data.result.message) {
										currentContent = data.result.message;
										
																				// Extract payment embed data from streaming response
										const paymentEmbed = data.result?.data?.payment_embed;
										
										if (paymentEmbed) {
											console.log('Payment embed data received via streaming');
										}
										

										
										setMessages(prev => prev.map(msg => 
											msg.id === placeholderId ? { 
												...msg, 
												content: currentContent,
												paymentEmbed: paymentEmbed || undefined,
												isLoading: false 
											} : msg
										));
									}
									break;
									
								case 'final':
									// Final response received
									setMessages(prev => prev.map(msg => 
										msg.id === placeholderId ? { 
											...msg, 
											content: data.response || currentContent,
											isLoading: false 
										} : msg
									));
									break;
									
								case 'error':
									// Error occurred
									setMessages(prev => prev.map(msg => 
										msg.id === placeholderId ? { 
											...msg, 
											content: data.message || 'An error occurred while processing your request.',
											isLoading: false 
										} : msg
									));
									break;
									
								case 'security_block':
									// Security block
									setMessages(prev => prev.map(msg => 
										msg.id === placeholderId ? { 
											...msg, 
											content: data.response || 'This request was blocked for security reasons.',
											isLoading: false 
										} : msg
									));
									break;
									
								case 'complete':
									// Stream completed
									setMessages(prev => prev.map(msg => 
										msg.id === placeholderId ? { 
											...msg, 
											isLoading: false 
										} : msg
									));
									break;
							}
						} catch (parseError) {
							console.warn('Failed to parse SSE data:', parseError);
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	};

	// Fallback to regular API
	const sendMessageWithRegularAPI = async (
		messageHistory: any[], 
		teamId: string, 
		sessionId: string, 
		placeholderId: string
	) => {
		// Use the new agent API endpoint
		const apiEndpoint = getAgentEndpoint();
		
		try {
			const response = await fetch(apiEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					messages: messageHistory,
					teamId: teamId,
					sessionId: sessionId
				})
			});
			
			if (!response.ok) {
				throw new Error(`API response error: ${response.status}`);
			}
			
			// Handle JSON response from agent API
			const data = await response.json() as any;
			
			const aiResponseText = data.data?.response || data.response || 'I apologize, but I encountered an error processing your request.';
			
			// Extract payment embed data from regular API response
			const paymentEmbed = data.data?.metadata?.toolResult?.data?.payment_embed;
			
			if (paymentEmbed) {
				console.log('Payment embed data received via regular API');
			}
			

			
			// Update the placeholder message with the response
			setMessages(prev => prev.map(msg => 
				msg.id === placeholderId ? { 
					...msg, 
					content: aiResponseText,
					paymentEmbed: paymentEmbed || undefined,
					isLoading: false 
				} : msg
			));
			
			// Handle any actions returned by the agent
			if (data.data?.actions && data.data.actions.length > 0) {
				console.log('Agent actions:', data.data.actions);
				// Actions are handled on the backend, but we can log them here
			}
			
		} catch (error) {
			console.error('Error fetching from Agent API:', error);
			
			// Update placeholder with error message
			setMessages(prev => prev.map(msg => 
				msg.id === placeholderId ? { 
					...msg, 
					content: "Sorry, there was an error connecting to our AI service. Please try again later.",
					isLoading: false 
				} : msg
			));
		}
	};

	// Submit contact form to API
	const submitContactForm = async (formData: any) => {
		// Add placeholder message with loading indicator (ChatGPT style)
		const loadingMessageId = crypto.randomUUID();
		
		try {
			const loadingMessage: ChatMessageUI = {
				id: loadingMessageId,
				content: "Thank you! Let me submit your information to our legal team...",
				isUser: false,
				role: 'assistant',
				timestamp: Date.now(),
				isLoading: true
			};
			setMessages(prev => [...prev, loadingMessage]);
			

			
			const formPayload = formatFormData(formData, teamId);
			const response = await fetch(getFormsEndpoint(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formPayload)
			});

			if (response.ok) {
				const result = await response.json();
				console.log('Form submitted successfully:', result);
				
				// Fetch team configuration to check payment requirements
				let teamConfig = null;
				try {
					const teamsResponse = await fetch(getTeamsEndpoint());
					if (teamsResponse.ok) {
						const teamsJson = await teamsResponse.json() as any;
						teamConfig = teamsJson.data.find((team: any) => team.slug === teamId || team.id === teamId);
					}
				} catch (error) {
					console.warn('Failed to fetch team config:', error);
				}
				

				
				// Create confirmation message based on payment requirements and matter creation status
				let confirmationContent = "";
				
				// Check if this came from matter creation flow
				const hasMatter = formData.matterDescription && formData.matterDescription !== '';
				
				if (hasMatter) {
					// Show matter canvas focus message
					confirmationContent = `✅ Perfect! Your complete matter information has been submitted successfully and updated below.`;
				} else {
					// Regular form submission
					if (teamConfig?.config?.requiresPayment) {
						const fee = teamConfig.config.consultationFee;
						const paymentLink = teamConfig.config.paymentLink;
						
						confirmationContent = `✅ Thank you! Your information has been submitted successfully.\n\n` +
							`💰 **Consultation Fee**: $${fee}\n\n` +
							`To schedule your consultation with our lawyer, please complete the payment first. ` +
							`This helps us prioritize your matter and ensures we can provide you with the best legal assistance.\n\n` +
							`🔗 **Payment Link**: ${paymentLink}\n\n` +
							`Once payment is completed, a lawyer will review your matter and contact you within 24 hours. ` +
							`Thank you for choosing ${teamConfig.name}!`;
					} else {
						confirmationContent = `✅ Your information has been submitted successfully! A lawyer will review your matter and contact you within 24 hours. Thank you for choosing our firm.`;
					}
				}
				
				// Update the loading message with confirmation
				setTimeout(() => {
					setMessages(prev => prev.map(msg => 
						msg.id === loadingMessageId 
							? {
								...msg,
								content: confirmationContent,
								isLoading: false
							}
							: msg
					));
				}, 300);
				
				// Show updated matter canvas with contact information (only if from matter creation)
				if (hasMatter) {
					setTimeout(() => {
						// Find the last message with a matter canvas to get the matter data
						setMessages(prev => {
							let lastMatterCanvas = null;
							for (let i = prev.length - 1; i >= 0; i--) {
								if (prev[i].matterCanvas) {
									lastMatterCanvas = prev[i].matterCanvas;
									break;
								}
							}
							
							if (lastMatterCanvas) {
								// Create updated matter summary with contact information
								const updatedMatterSummary = lastMatterCanvas.matterSummary + 
									`\n\n## 📞 Contact Information\n` +
									`- **Email**: ${formData.email}\n` +
									`- **Phone**: ${formData.phone}\n` +
									`- **Status**: ✅ Ready for Attorney Review\n` +
									`- **Submitted**: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
								
								// Show the updated matter canvas as a new message
								const updatedMatterMessage: ChatMessageUI = {
									id: crypto.randomUUID(),
									content: "Here's your complete matter information with contact details:",
									isUser: false,
									role: 'assistant',
									timestamp: Date.now(),
									matterCanvas: {
										...lastMatterCanvas,
										matterSummary: updatedMatterSummary
									}
								};
								return [...prev, updatedMatterMessage];
							}
							return prev;
						});
						
						// Add payment/next steps message after matter canvas
						setTimeout(() => {
							let nextStepsMessage = "";
							
							if (teamConfig?.config?.requiresPayment) {
								const fee = teamConfig.config.consultationFee;
								const paymentLink = teamConfig.config.paymentLink;
								
								nextStepsMessage = `💰 **Consultation Fee**: $${fee}\n\n` +
									`To schedule your consultation with our lawyer, please complete the payment first. ` +
									`This helps us prioritize your matter and ensures we can provide you with the best legal assistance.\n\n` +
									`🔗 **Payment Link**: ${paymentLink}\n\n` +
									`Once payment is completed, a lawyer will review your matter and contact you within 24 hours. ` +
									`Thank you for choosing ${teamConfig.name}!`;
							} else {
								nextStepsMessage = `A lawyer will review your complete matter information and contact you within 24 hours. Thank you for choosing our firm!`;
							}
							
							const nextStepsMsg: ChatMessageUI = {
								id: crypto.randomUUID(),
								content: nextStepsMessage,
								isUser: false,
								role: 'assistant',
								timestamp: Date.now()
							};
							setMessages(prev => [...prev, nextStepsMsg]);
						}, 500);
					}, 1000);
				}
				
				// Reset form state
				// setFormState({
				// 	step: 'idle',
				// 	data: {},
				// 	isActive: false
				// });


				
			} else {
				throw new Error('Form submission failed');
			}
		} catch (error) {
			console.error('Error submitting form:', error);
			
			// Update loading message with error content
			setTimeout(() => {
				setMessages(prev => prev.map(msg => 
					msg.id === loadingMessageId 
						? {
							...msg,
							content: "Sorry, there was an error submitting your information. Please try again or contact us directly.",
							isLoading: false
						}
						: msg
				));
			}, 300);
		}
	};

	// Update handleSubmit to use the new API function


	// Simplified submit function - agent handles all conversation flow
	const handleSubmit = () => {
		if (!inputValue.trim() && previewFiles.length === 0) return;

		const message = inputValue.trim();
		const attachments = [...previewFiles];
		
		// Send message to API - agent handles all conversation flow
		sendMessageToAPI(message, attachments);
		
		// Reset input and focus
		setInputValue('');
		setPreviewFiles([]);
		
		// Just focus the textarea
		const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
		if (textarea) {
			textarea.focus();
		}
	};

	// Agent handles all matter creation - no manual API needed

	// Simplified service selection - agent handles all logic
	const handleServiceSelect = (service: string) => {
		const serviceMessage: ChatMessageUI = {
			id: crypto.randomUUID(),
			content: `I'm looking for legal help with my ${service} issue.`,
			isUser: true,
			role: 'user',
			timestamp: Date.now()
		};
		setMessages(prev => [...prev, serviceMessage]);
		sendMessageToAPI(`I'm looking for legal help with my ${service} issue.`, []);
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
		setMessages(prev => [...prev, urgencyMessage]);
		sendMessageToAPI(`This is a ${urgency.toLowerCase()} matter.`, []);
	};


	// Agent handles all matter creation flow - no manual step handling needed

	const handleKeyPress = (e: KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	// Enhanced keyboard navigation
	const handleKeyDown = (e: KeyboardEvent) => {
		// Escape key to clear input or close modals
		if (e.key === 'Escape') {
			if (inputValue.trim() || previewFiles.length > 0) {
				setInputValue('');
				setPreviewFiles([]);
			}
		}
		
		// Ctrl/Cmd + Enter to send message (alternative to Enter)
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			handleSubmit();
		}
		
		// Ctrl/Cmd + K to focus input (common chat shortcut)
		if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
			if (textarea) {
				textarea.focus();
			}
		}
	};

	// Add a helper function to get the appropriate file icon based on file type
	const getFileIcon = (file: FileAttachment) => {
		// Get file extension
		const ext = file.name.split('.').pop()?.toLowerCase();
		
		// PDF icon
		if (file.type === 'application/pdf' || ext === 'pdf') {
			return (
				<DocumentTextIcon className="w-6 h-6" />
			);
		}
		
		// Word document icon
		if (file.type === 'application/msword' ||
			file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			ext === 'doc' || ext === 'docx') {
			return (
				<DocumentIcon className="w-6 h-6" />
			);
		}
		
		// Excel spreadsheet icon
		if (file.type === 'application/vnd.ms-excel' ||
			file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
			ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
			return (
				<TableCellsIcon className="w-6 h-6" />
			);
		}
		
		// Audio file icon
		if (file.type.startsWith('audio/')) {
			return (
				<MusicalNoteIcon className="w-6 h-6" />
			);
		}
		
		// Video file icon
		if (file.type.startsWith('video/')) {
			return (
				<VideoCameraIcon className="w-6 h-6" />
			);
		}
		
		// Default file icon
		return (
			<DocumentIcon className="w-6 h-6" />
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

	// Register global drag handlers and keyboard shortcuts on the document body
	useEffect(() => {
		if (typeof document !== 'undefined') {
			document.body.addEventListener('dragenter', handleDragEnter);
			document.body.addEventListener('dragleave', handleDragLeave);
			document.body.addEventListener('dragover', handleDragOver);
			document.body.addEventListener('drop', handleDrop);
			document.addEventListener('keydown', handleKeyDown);

			return () => {
				document.body.removeEventListener('dragenter', handleDragEnter);
				document.body.removeEventListener('dragleave', handleDragLeave);
				document.body.removeEventListener('dragover', handleDragOver);
				document.body.removeEventListener('drop', handleDrop);
				document.removeEventListener('keydown', handleKeyDown);
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

	// Add state for selected service


	return (
		<>
			{isDragging && (
				<div 
					className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-white/85 to-white/95 dark:from-dark-bg/85 dark:to-dark-bg/95 backdrop-blur-sm" 
					role="dialog"
					aria-label="File upload"
					aria-modal="true"
				>
					<div className="flex flex-col items-center justify-center gap-3 text-gray-900 dark:text-white text-lg sm:text-xl lg:text-2xl text-center p-6 sm:p-10 rounded-2xl bg-white/80 dark:bg-dark-bg/80 shadow-2xl border border-gray-200 dark:border-dark-border max-w-[90%] relative z-[10000]">
						<CloudArrowUpIcon className="w-10 h-10 sm:w-14 sm:h-14 text-amber-500 mb-1" aria-hidden="true" />
						<h3 className="text-lg sm:text-2xl lg:text-3xl font-semibold m-0 text-gray-900 dark:text-white">Drop Files to Upload</h3>
						<p className="text-xs sm:text-sm lg:text-base opacity-80 m-0 text-gray-600 dark:text-gray-300">We accept images, videos, and document files</p>
					</div>
				</div>
			)}
		
			{teamNotFound ? (
				<TeamNotFound teamId={teamId} onRetry={handleRetryTeamConfig} />
			) : (
				<div id="app" className="h-screen w-screen">
					{/* Left Column */}
					{features.enableLeftSidebar && (
						<div className="grid-left bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border overflow-y-auto">
							<LeftSidebar 
								currentRoute={currentTab}
								onOpenMenu={() => setIsMobileSidebarOpen(true)}
								teamConfig={{
									name: teamConfig.name,
									profileImage: teamConfig.profileImage,
									teamId: teamId
								}}
							/>
						</div>
					)}

					{/* Center Column - Main Content */}
					<div className="grid-center bg-white dark:bg-dark-bg overflow-y-auto">
						<ErrorBoundary>
							<div 
								className="flex flex-col h-screen w-full m-0 p-0 relative overflow-hidden bg-white dark:bg-dark-bg pt-16 lg:pt-0" 
								role="application" 
								aria-label="Main interface"
								aria-expanded={true}
							>
								<main className="flex flex-col h-full w-full overflow-hidden relative bg-white dark:bg-dark-bg">
								<VirtualMessageList
									messages={messages}
									onDateSelect={handleDateSelect}
									onTimeOfDaySelect={handleTimeOfDaySelect}
									onTimeSlotSelect={handleTimeSlotSelect}
									onRequestMoreDates={handleRequestMoreDates}
									onServiceSelect={handleServiceSelect}
									onUrgencySelect={handleUrgencySelect}
									onCreateMatter={handleCreateMatterStart}
									onScheduleConsultation={handleScheduleStart}
									onLearnServices={async () => {
										const servicesMessage: ChatMessageUI = {
											id: crypto.randomUUID(),
											content: "Tell me about your firm's services",
											isUser: true,
											role: 'user',
											timestamp: Date.now()
										};
										setMessages(prev => [...prev, servicesMessage]);
										
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
										setMessages(prev => [...prev, loadingMessage]);
										
										try {
											// Call the actual API
											const response = await sendMessageToAPI("Tell me about your firm's services");
											
											// Update the loading message with actual content
											setMessages(prev => prev.map(msg => 
												msg.id === loadingMessageId 
													? {
														...msg,
														content: response,
														isLoading: false
													}
													: msg
											));
										} catch (error) {
											// Fallback to default response if API fails
											setMessages(prev => prev.map(msg => 
												msg.id === loadingMessageId 
													? {
														...msg,
														content: "Our firm specializes in several practice areas including business law, intellectual property, contract review, and regulatory compliance. We offer personalized legal counsel to help businesses navigate complex legal challenges. Would you like more details about any specific service?",
														isLoading: false
													}
													: msg
											));
										}
									}}
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
								/>
                                <MessageComposer
                                    inputValue={inputValue}
                                    setInputValue={setInputValue}
                                    previewFiles={previewFiles}
                                    removePreviewFile={removePreviewFile}
                                    handlePhotoSelect={handlePhotoSelect}
                                    handleCameraCapture={handleCameraCapture}
                                    handleFileSelect={handleFileSelect}
                                    handleScheduleStart={handleScheduleStart}
                                    isRecording={isRecording}
                                    handleMediaCapture={handleMediaCapture}
                                    setIsRecording={setIsRecording}
                                    onSubmit={handleSubmit}
                                    onKeyPress={handleKeyPress as any}
                                />

								</main>
							</div>
						</ErrorBoundary>
					</div>

					{/* Right Column - Hidden on mobile, content moved to mobile sidebar */}
					<div className="grid-right bg-white dark:bg-dark-bg border-l border-gray-200 dark:border-dark-border overflow-y-auto hidden lg:block">
						<div className="p-6 text-gray-900 dark:text-white flex flex-col gap-6">
							<TeamProfile
								name={teamConfig.name}
								profileImage={teamConfig.profileImage}
								teamId={teamId}
								description={teamConfig.description}
								variant="sidebar"
								showVerified={true}
							/>

							{/* Media Section */}
							<div className="border-t border-gray-200 dark:border-dark-border pt-4">
								<MediaSidebar messages={messages} />
							</div>

							{/* Privacy & Support Section */}
							<PrivacySupportSidebar />
						</div>
					</div>

					{/* Mobile Top Navigation */}
					<MobileTopNav
						teamConfig={{
							name: teamConfig.name,
							profileImage: teamConfig.profileImage,
							teamId: teamId,
							description: teamConfig.description
						}}
						onOpenSidebar={() => setIsMobileSidebarOpen(true)}
					/>

                    {/* Mobile Bottom Navigation */}
                    {features.enableMobileBottomNav && (
                        <BottomNavigation 
                            activeTab={currentTab}
                        />
                    )}

					{/* Mobile Sidebar */}
					<MobileSidebar
						isOpen={isMobileSidebarOpen}
						onClose={() => setIsMobileSidebarOpen(false)}
						teamConfig={{
							name: teamConfig.name,
							profileImage: teamConfig.profileImage,
							teamId: teamId,
							description: teamConfig.description
						}}
						messages={messages}
					/>
				</div>
			)}
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
