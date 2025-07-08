import { hydrate, prerender as ssr } from 'preact-iso';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
// Remove direct imports of components that will be lazy-loaded
// import FileMenu from './components/FileMenu';
import LoadingIndicator from './components/LoadingIndicator';
// import MediaControls from './components/MediaControls';
import VirtualMessageList from './components/VirtualMessageList';
import { ErrorBoundary } from './components/ErrorBoundary';
import StickyQualityScore from './components/StickyQualityScore';
import { debounce } from './utils/debounce';
import createLazyComponent from './utils/LazyComponent';
import features from './config/features';
import { detectSchedulingIntent, createSchedulingResponse } from './utils/scheduling';
import { getChatEndpoint, getFormsEndpoint, getTeamsEndpoint, getCaseCreationEndpoint } from './config/api';
import { detectIntent, getIntentResponse } from './utils/intentDetection';
import { 
  FormState, 
  processFormStep, 
  startConversationalForm, 
  extractContactInfo,
  formatFormData 
} from './utils/conversationalForm';
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
	timeOfDay?: 'morning' | 'afternoon';
	scheduledDateTime?: Date;
}

interface CaseCreationData {
	type: 'service-selection' | 'urgency-selection' | 'ai-questions';
	availableServices: string[];
	question?: string;
	totalQuestions?: number;
	currentQuestionIndex?: number;
}

interface ChatMessage {
	content: string;
	isUser: boolean;
	files?: FileAttachment[];
	scheduling?: SchedulingData;
	caseCreation?: CaseCreationData;
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
	const [formState, setFormState] = useState<FormState>({
		step: 'idle',
		data: {},
		isActive: false
	});

	// State for case creation flow
	const [caseState, setCaseState] = useState<{
		step: 'idle' | 'gathering-info' | 'ai-questions' | 'case-details' | 'ai-analysis' | 'ready-for-lawyer';
		data: {
			caseType?: string;
			description?: string;
			urgency?: string;
			location?: string;
			additionalInfo?: string;
			aiAnswers?: Record<string, string>;
		};
		isActive: boolean;
		currentQuestionIndex?: number;
	}>({
		step: 'idle',
		data: {},
		isActive: false,
		currentQuestionIndex: 0
	});

	// State for sticky quality score
	const [stickyQualityScore, setStickyQualityScore] = useState<{
		score: number;
		breakdown: {
			followUpCompletion: number;
			requiredFields: number;
			evidence: number;
			clarity: number;
			urgency: number;
			consistency: number;
			aiConfidence: number;
		};
		suggestions: string[];
		readyForLawyer: boolean;
		color: 'red' | 'yellow' | 'green' | 'blue';
		isVisible: boolean;
	}>({
		score: 0,
		breakdown: {
			followUpCompletion: 0,
			requiredFields: 0,
			evidence: 0,
			clarity: 0,
			urgency: 0,
			consistency: 0,
			aiConfidence: 0
		},
		suggestions: [],
		readyForLawyer: false,
		color: 'red',
		isVisible: false
	});

	// State for team configuration
	const [teamConfig, setTeamConfig] = useState<{
		name: string;
		profileImage: string | null;
		introMessage: string | null;
		availableServices: string[];
		serviceQuestions?: Record<string, string[]>;
	}>({
		name: 'Legal AI Assistant',
		profileImage: null,
		introMessage: null,
		availableServices: [],
		serviceQuestions: {}
	});

	// Track drag counter for better handling of nested elements
	const dragCounter = useRef(0);

	// Parse URL parameters for configuration
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const urlParams = new URLSearchParams(window.location.search);
			const positionParam = urlParams.get('position');
			const teamIdParam = urlParams.get('teamId');
			
			// Check if we're on the root domain with no parameters - redirect to inline demo
			if (window.location.hostname === 'ai.blawby.com' && 
				window.location.pathname === '/' && 
				!positionParam && 
				!teamIdParam) {
				// Redirect to inline demo
				window.location.href = 'https://ai.blawby.com/?position=inline&teamId=demo';
				return;
			}
			
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
		if (!teamId) return;
		
		try {
			const response = await fetch(getTeamsEndpoint());
			if (response.ok) {
				const teams = await response.json();
				const team = teams.find((t: any) => t.id === teamId);
				if (team?.config) {
					const config = {
						name: team.name || 'Legal AI Assistant',
						profileImage: team.config.profileImage || null,
						introMessage: team.config.introMessage || null,
						availableServices: team.config.availableServices || [],
						serviceQuestions: team.config.serviceQuestions || {}
					};
					setTeamConfig(config);
				}
			}
		} catch (error) {
			console.warn('Failed to fetch team config:', error);
		}
	};

	// Fetch team config on mount and when teamId changes
	useEffect(() => {
		fetchTeamConfig();
	}, [teamId]);

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

	// Add case creation handlers
	const handleCreateCaseStart = () => {
		// Send user's case creation request message
		const caseMessage: ChatMessage = {
			content: "I'd like to create a case and get help with my legal concern.",
			isUser: true
		};
		
		setMessages([...messages, caseMessage]);
		setInputValue('');
		setIsLoading(true);
		
		// Start case creation flow
		setTimeout(() => {
			const services = teamConfig.availableServices || [];
			const serviceOptions = services.length > 0 
				? services.map(service => `• ${service}`).join('\n')
				: '• Family Law\n• Business Law\n• Employment Law\n• Real Estate\n• Criminal Law\n• Other';
			
			const aiResponse: ChatMessage = {
				content: `I'm here to help you create a case and assess your legal situation. We provide legal services for the following areas:\n\n${serviceOptions}\n\nPlease select the type of legal matter you're dealing with, or choose "General Inquiry" if you're not sure:`,
				isUser: false,
				caseCreation: {
					type: 'service-selection',
					availableServices: services
				}
			};
			setMessages(prev => [...prev, aiResponse]);
			setIsLoading(false);
			
			// Start case creation flow
			setCaseState({
				step: 'gathering-info',
				data: {},
				isActive: true
			});
		}, 1000);
	};

	// Add scheduling handlers
	const handleScheduleStart = () => {
		// Send user's scheduling request message
		const schedulingMessage: ChatMessage = {
			content: "I'd like to request a consultation.",
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
			content: `I'd like to be contacted on ${formattedDate} for my consultation.`,
			isUser: true
		};
		
		setMessages(prev => [...prev, dateSelectionMessage]);
		setIsLoading(true);
		
		// Simulate AI response with time of day options
		setTimeout(() => {
			const aiResponse: ChatMessage = {
				content: `Great! What time on ${formattedDate} would be best for your consultation?`,
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
	
	const handleTimeOfDaySelect = (timeOfDay: 'morning' | 'afternoon') => {
		// Get the most recent selected date from messages
		const lastDateSelection = [...messages]
			.reverse()
			.find(msg => msg.scheduling?.selectedDate)?.scheduling?.selectedDate;
			
		if (!lastDateSelection) return;
		
		// Map time of day to human-readable string
		const timeOfDayLabel = {
			morning: 'Morning (8:00 AM - 12:00 PM)',
			afternoon: 'Afternoon (12:00 PM - 5:00 PM)'
		}[timeOfDay];
		
		// Format the date
		const formattedDate = new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		}).format(lastDateSelection);
		
		// Send user's time of day selection as a message
		const timeSelectionMessage: ChatMessage = {
			content: `I prefer to be contacted in the ${timeOfDayLabel} on ${formattedDate}.`,
			isUser: true
		};
		
		setMessages(prev => [...prev, timeSelectionMessage]);
		setIsLoading(true);
		
		// Simulate AI response with specific time slots
		setTimeout(() => {
			const aiResponse: ChatMessage = {
				content: `Great! Please select a specific time when you'll be available for your consultation on ${formattedDate}:`,
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
			content: `I'll be available for a consultation at ${formattedTime} on ${formattedDate}.`,
			isUser: true
		};
		
		setMessages(prev => [...prev, timeSlotSelectionMessage]);
		setIsLoading(true);
		
		// Simulate AI confirmation response
		setTimeout(() => {
			const aiResponse: ChatMessage = {
				content: `Thank you! Your consultation request has been submitted for ${formattedTime} on ${formattedDate}. A team member will contact you at this time. Is there anything specific you'd like to discuss during your consultation?`,
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
			
			// Check if we're in an active form collection state
			if (formState.isActive) {
				// Process form step
				const extractedInfo = extractContactInfo(message);
				const { newState, response, shouldSubmit } = processFormStep(formState, message, extractedInfo);
				
				setFormState(newState);
				
				// Update the placeholder message with form response
				setTimeout(() => {
					setIsLoading(false);
					setMessages(prev => prev.map(msg => 
						msg.id === placeholderId ? { 
							...msg, 
							content: response,
							id: placeholderId 
						} : msg
					));
					
					// Submit form if complete
					if (shouldSubmit && newState.data.email && newState.data.phone && newState.data.caseDetails) {
						submitContactForm(newState.data);
					}
				}, 1000);
				
				return;
			}
			
			// Check if user typed a service name directly
			const availableServices = teamConfig.availableServices || [];
			const isServiceName = availableServices.some(service => 
				message.toLowerCase().trim() === service.toLowerCase() ||
				message.toLowerCase().trim() === service.toLowerCase().replace(/-/g, ' ')
			);
			
			// Also check for "General Inquiry"
			const isGeneralInquiry = message.toLowerCase().trim() === 'general inquiry';
			
			if ((isServiceName || isGeneralInquiry) && !caseState.isActive) {
				// Start case creation flow with the typed service
				setCaseState({
					step: 'gathering-info',
					data: {},
					isActive: true
				});
				
				// Process the service selection
				setTimeout(async () => {
					try {
						const result = await handleCaseCreationAPI('service-selection', { service: message });
						
						setCaseState(prev => ({
							...prev,
							data: { ...prev.data, caseType: message },
							step: result.step,
							currentQuestionIndex: result.currentQuestionIndex || 0
						}));
						
						setIsLoading(false);
						setMessages(prev => prev.map(msg => 
							msg.id === placeholderId ? { 
								...msg, 
								content: result.message,
								id: placeholderId 
							} : msg
						));
					} catch (error) {
						console.error('Service selection error:', error);
						setIsLoading(false);
						setMessages(prev => prev.map(msg => 
							msg.id === placeholderId ? { 
								...msg, 
								content: "I apologize, but I encountered an error processing your service selection. Please try again.",
								id: placeholderId 
							} : msg
						));
					}
				}, 1000);
				
				return;
			}
			
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
			
			// Make actual API call using configuration
			const apiEndpoint = getChatEndpoint();
			
			try {
				const response = await fetch(apiEndpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						messages: messageHistory,
						teamId: teamId
					})
				});
				
				if (!response.ok) {
					throw new Error(`API response error: ${response.status}`);
				}
				
				// Handle JSON response (non-streaming)
				const data = await response.json();
				console.log('API Response:', data); // Debug log
				console.log('API Response type:', typeof data); // Debug log
				console.log('API Response keys:', Object.keys(data)); // Debug log
				const aiResponseText = data.response || data.message || data.content || '';
				console.log('Extracted text:', aiResponseText); // Debug log
				console.log('Extracted text type:', typeof aiResponseText); // Debug log
				
				// Check if we should start a form
				if (data.shouldStartForm && !formState.isActive) {
					setFormState(startConversationalForm());
				}
				
				// Update the placeholder message with the response
				setMessages(prev => prev.map(msg => 
					msg.id === placeholderId ? { 
						...msg, 
						content: aiResponseText 
					} : msg
				));
				
				// Set loading to false after response is received
				setIsLoading(false);
			} catch (error) {
				console.error('Error fetching from AI API:', error);
				
				// Update placeholder with error message
				setMessages(prev => prev.map(msg => 
					msg.id === placeholderId ? { 
						...msg, 
						content: "Sorry, there was an error connecting to our AI service. Please try again later." 
					} : msg
				));
			}
			
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

	// Submit contact form to API
	const submitContactForm = async (formData: any) => {
		try {
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
						const teams = await teamsResponse.json();
						teamConfig = teams.find((team: any) => team.id === teamId);
					}
				} catch (error) {
					console.warn('Failed to fetch team config:', error);
				}
				
				// Create confirmation message based on payment requirements
				let confirmationContent = "";
				
				if (teamConfig?.config?.requiresPayment) {
					const fee = teamConfig.config.consultationFee;
					const paymentLink = teamConfig.config.paymentLink;
					
					confirmationContent = `✅ Thank you! Your information has been submitted successfully.\n\n` +
						`💰 **Consultation Fee**: $${fee}\n\n` +
						`To schedule your consultation with our lawyer, please complete the payment first. ` +
						`This helps us prioritize your case and ensures we can provide you with the best legal assistance.\n\n` +
						`🔗 **Payment Link**: ${paymentLink}\n\n` +
						`Once payment is completed, a lawyer will review your case and contact you within 24 hours. ` +
						`Thank you for choosing ${teamConfig.name}!`;
				} else {
					confirmationContent = `✅ Your information has been submitted successfully! A lawyer will review your case and contact you within 24 hours. Thank you for choosing our firm.`;
				}
				
				// Add confirmation message
				const confirmationMessage: ChatMessage = {
					content: confirmationContent,
					isUser: false
				};
				
				setMessages(prev => [...prev, confirmationMessage]);
				
				// Reset form state
				setFormState({
					step: 'idle',
					data: {},
					isActive: false
				});
			} else {
				throw new Error('Form submission failed');
			}
		} catch (error) {
			console.error('Error submitting form:', error);
			
			// Add error message
			const errorMessage: ChatMessage = {
				content: "Sorry, there was an error submitting your information. Please try again or contact us directly.",
				isUser: false
			};
			
			setMessages(prev => [...prev, errorMessage]);
		}
	};

	// Update handleSubmit to use the new API function
	const handleSubmit = async () => {
		if (!inputValue.trim() && previewFiles.length === 0) return;

		const message = inputValue.trim();
		const attachments = [...previewFiles];
		
		// Handle case creation flow
		if (caseState.isActive) {
			await handleCaseCreationStep(message, attachments);
			return;
		}

		// Send message to API
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

	// Handle service selection from buttons
	const handleServiceSelect = async (service: string) => {
		// Add user message
		const userMessage: ChatMessage = {
			content: service,
			isUser: true
		};
		setMessages(prev => [...prev, userMessage]);
		
		try {
			// Ensure case state is properly initialized
			if (!caseState.isActive) {
				setCaseState({
					step: 'gathering-info',
					data: {},
					isActive: true
				});
			}
			
			// Call API for service selection
			const result = await handleCaseCreationAPI('service-selection', { service });
			
			setCaseState(prev => ({
				...prev,
				data: { ...prev.data, caseType: service },
				step: result.step,
				currentQuestionIndex: result.currentQuestionIndex || 0
			}));
			
			// Update sticky quality score if available
			if (result.qualityScore) {
				setStickyQualityScore({
					...result.qualityScore,
					isVisible: true
				});
			}
			
			setTimeout(() => {
				const aiResponse: ChatMessage = {
					content: result.message,
					isUser: false,
					caseCreation: result.step === 'urgency-selection' ? {
						type: 'urgency-selection',
						availableServices: []
					} : undefined
				};
				setMessages(prev => [...prev, aiResponse]);
			}, 800);
		} catch (error) {
			console.error('Service selection error:', error);
			// Fallback to error message
			setTimeout(() => {
				const errorResponse: ChatMessage = {
					content: "I apologize, but I encountered an error processing your service selection. Please try again.",
					isUser: false
				};
				setMessages(prev => [...prev, errorResponse]);
			}, 800);
		}
	};

	// Handle urgency selection from buttons
	const handleUrgencySelect = async (urgency: string) => {
		// Add user message
		const userMessage: ChatMessage = {
			content: urgency,
			isUser: true
		};
		setMessages(prev => [...prev, userMessage]);
		
		try {
			// Call API for urgency selection
			const result = await handleCaseCreationAPI('urgency-selection', {
				service: caseState.data.caseType,
				urgency: urgency
			});
			
			setCaseState(prev => ({
				...prev,
				data: { ...prev.data, urgency: urgency },
				step: result.step,
				currentQuestionIndex: result.currentQuestionIndex || 0
			}));
			
			// If we're moving to AI questions, we need to handle the first question
			if (result.step === 'ai-questions' && result.question) {
				// The AI response will include the question, so we don't need to add it separately
				// The user will see the question in the AI message and can respond in the chat input
			}
			
			// Update sticky quality score if available
			if (result.qualityScore) {
				setStickyQualityScore({
					...result.qualityScore,
					isVisible: true
				});
			}
			
			setTimeout(() => {
				const aiResponse: ChatMessage = {
					content: result.message,
					isUser: false
				};
				setMessages(prev => [...prev, aiResponse]);
			}, 800);
		} catch (error) {
			console.error('Urgency selection error:', error);
			// Fallback to error message
			setTimeout(() => {
				const errorResponse: ChatMessage = {
					content: "I apologize, but I encountered an error processing your urgency selection. Please try again.",
					isUser: false
				};
				setMessages(prev => [...prev, errorResponse]);
			}, 800);
		}
	};

	// API-driven case creation handler
	const handleCaseCreationAPI = async (step: string, data: any = {}) => {
		try {
			const requestBody = {
				teamId: teamId || 'demo',
				service: data.service || caseState.data.caseType,
				step: step,
				currentQuestionIndex: data.currentQuestionIndex,
				answers: data.answers,
				description: data.description,
				urgency: data.urgency
			};
			
			console.log('Case creation API request:', requestBody);
			
			const response = await fetch(getCaseCreationEndpoint(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('API response error:', response.status, errorText);
				throw new Error(`API request failed: ${response.status} - ${errorText}`);
			}

			const result = await response.json();
			console.log('Case creation API response:', result);
			return result;
		} catch (error) {
			console.error('Case creation API error:', error);
			throw error;
		}
	};

	// Handle case creation flow steps
	const handleCaseCreationStep = async (message: string, attachments: FileAttachment[] = []) => {
		// Add user message
		const userMessage: ChatMessage = {
			content: message,
			isUser: true,
			files: attachments
		};
		setMessages(prev => [...prev, userMessage]);
		setInputValue('');
		setPreviewFiles([]);

		try {
			// Process based on current step
			switch (caseState.step) {
				case 'gathering-info':
					// Store case type and start urgency selection
					const selectedService = message;
					
					setCaseState(prev => ({
						...prev,
						data: { ...prev.data, caseType: message },
						step: 'urgency-selection'
					}));
					
					// Call API for service selection
					const serviceResult = await handleCaseCreationAPI('service-selection', { service: selectedService });
					
					setTimeout(() => {
						const aiResponse: ChatMessage = {
							content: serviceResult.message,
							isUser: false,
							caseCreation: serviceResult.step === 'urgency-selection' ? {
								type: 'urgency-selection',
								availableServices: []
							} : undefined,
							qualityScore: serviceResult.qualityScore
						};
						setMessages(prev => [...prev, aiResponse]);
					}, 800);
					break;

				case 'ai-questions':
					// Store answer to current AI question
					const currentService = caseState.data.caseType;
					const currentIndex = caseState.currentQuestionIndex || 0;
					
					// Get the current question from the team config
					const currentQuestion = teamConfig.serviceQuestions?.[currentService || '']?.[currentIndex];
					
					// Store the answer
					const updatedAnswers = {
						...caseState.data.aiAnswers,
						[currentQuestion]: message
					};
					
					// Call API for AI questions step
					const aiResult = await handleCaseCreationAPI('ai-questions', {
						service: currentService,
						currentQuestionIndex: currentIndex,
						answers: updatedAnswers,
						urgency: caseState.data.urgency
					});
					
					if (aiResult.step === 'ai-questions') {
						// More questions to ask
						setCaseState(prev => ({
							...prev,
							data: { ...prev.data, aiAnswers: updatedAnswers },
							currentQuestionIndex: aiResult.currentQuestionIndex
						}));
						
						// Update sticky quality score if available
						if (aiResult.qualityScore) {
							setStickyQualityScore({
								...aiResult.qualityScore,
								isVisible: true
							});
						}
						
						setTimeout(() => {
							const aiResponse: ChatMessage = {
								content: aiResult.message + (aiResult.question ? `\n\n${aiResult.question}` : ''),
								isUser: false
							};
							setMessages(prev => [...prev, aiResponse]);
						}, 800);
					} else {
						// All questions answered, move to case details
						setCaseState(prev => ({
							...prev,
							data: { ...prev.data, aiAnswers: updatedAnswers },
							step: 'case-details'
						}));
						
						setTimeout(() => {
							const aiResponse: ChatMessage = {
								content: aiResult.message,
								isUser: false
							};
							setMessages(prev => [...prev, aiResponse]);
						}, 800);
					}
					break;

				case 'case-details':
					// Store description and move to AI analysis
					setCaseState(prev => ({
						...prev,
						data: { ...prev.data, description: message },
						step: 'ai-analysis'
					}));
					
					// Call API for case details step
					const detailsResult = await handleCaseCreationAPI('case-details', {
						service: caseState.data.caseType,
						description: message,
						urgency: caseState.data.urgency,
						answers: caseState.data.aiAnswers
					});
					
					// Update sticky quality score if available
					if (detailsResult.qualityScore) {
						setStickyQualityScore({
							...detailsResult.qualityScore,
							isVisible: true
						});
					}
					
					setTimeout(() => {
						const aiResponse: ChatMessage = {
							content: detailsResult.message,
							isUser: false
						};
						setMessages(prev => [...prev, aiResponse]);
					
						// Automatically trigger AI analysis after a short delay
						setTimeout(async () => {
							try {
								const analysisResult = await handleCaseCreationAPI('ai-analysis', {
									service: caseState.data.caseType,
									description: message,
									urgency: caseState.data.urgency,
									answers: caseState.data.aiAnswers
								});
								
								setCaseState(prev => ({
									...prev,
									step: analysisResult.step,
									currentQuestionIndex: analysisResult.currentQuestionIndex || 0
								}));
								
								// Update sticky quality score if available
								if (analysisResult.qualityScore) {
									setStickyQualityScore({
										...analysisResult.qualityScore,
										isVisible: true
									});
								}
								
								const analysisResponse: ChatMessage = {
									content: analysisResult.message,
									isUser: false
								};
								setMessages(prev => [...prev, analysisResponse]);
								
								// If analysis is complete, start contact form
								if (analysisResult.step === 'complete') {
									setTimeout(() => {
										const contactResponse: ChatMessage = {
											content: "Great! Let me gather your contact information so we can connect you with the right attorney. Please provide your name and contact details.",
											isUser: false
										};
										setMessages(prev => [...prev, contactResponse]);
										
										// Start contact form with enhanced data
										setFormState({
											step: 'contact',
											data: { 
												caseType: caseState.data.caseType, 
												caseDescription: caseState.data.description,
												caseDetails: caseState.data.aiAnswers,
												urgency: caseState.data.urgency
											},
											isActive: true
										});
									}, 2000);
								}
							} catch (error) {
								console.error('AI analysis error:', error);
								const errorResponse: ChatMessage = {
									content: "I apologize, but I encountered an error analyzing your case. Let me proceed with connecting you to an attorney.",
									isUser: false
								};
								setMessages(prev => [...prev, errorResponse]);
								
								// Fallback to contact form
								setTimeout(() => {
									const contactResponse: ChatMessage = {
										content: "Let me gather your contact information so we can connect you with the right attorney. Please provide your name and contact details.",
										isUser: false
									};
									setMessages(prev => [...prev, contactResponse]);
									
									setFormState({
										step: 'contact',
										data: { 
											caseType: caseState.data.caseType, 
											caseDescription: caseState.data.description,
											caseDetails: caseState.data.aiAnswers,
											urgency: caseState.data.urgency
										},
										isActive: true
									});
								}, 2000);
							}
						}, 2000); // Wait 2 seconds before starting analysis
					}, 800);
					break;
			}
		} catch (error) {
			console.error('Case creation step error:', error);
			// Fallback to error message
			setTimeout(() => {
				const errorResponse: ChatMessage = {
					content: "I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.",
					isUser: false
				};
				setMessages(prev => [...prev, errorResponse]);
			}, 800);
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
						<>
							<StickyQualityScore {...stickyQualityScore} />
							<main className="chat-main">
							{messages.length === 0 && (
								<div className="welcome-message">
									<div className="welcome-card">
										<div className="welcome-icon">
											{teamConfig.profileImage ? (
												<img 
													src={teamConfig.profileImage} 
													alt={`${teamConfig.name} logo`}
													className="team-profile-image"
												/>
											) : (
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
													<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
													<path d="M9 15h6"></path>
													<path d="M11 9h1"></path>
													<path d="M12 9v3"></path>
													<path d="M8 9h.01"></path>
													<path d="M16 9h.01"></path>
												</svg>
											)}
										</div>
										<h2>{teamConfig.name}</h2>
										<p>{teamConfig.introMessage || "I'm an AI assistant designed to help you get started with your case."}</p>
										<div className="welcome-actions">
											<p>How can I help today?</p>
											<div className="welcome-buttons">
												<button 
													className="welcome-action-button primary" 
													onClick={handleCreateCaseStart}
												>
													Create Case
												</button>
												<button 
													className="welcome-action-button" 
													onClick={handleScheduleStart}
												>
													Request a consultation
												</button>
												<button 
													className="welcome-action-button" 
													onClick={() => {
														const servicesMessage: ChatMessage = {
															content: "Tell me about your firm's services",
															isUser: true
														};
														setMessages([servicesMessage]);
														setIsLoading(true);
														
														// Simulate AI response
														setTimeout(() => {
															const aiResponse: ChatMessage = {
																content: "Our firm specializes in several practice areas including business law, intellectual property, contract review, and regulatory compliance. We offer personalized legal counsel to help businesses navigate complex legal challenges. Would you like more details about any specific service?",
																isUser: false
															};
															setMessages(prev => [...prev, aiResponse]);
															setIsLoading(false);
														}, 1000);
													}}
												>
													Learn about our services
												</button>
											</div>
										</div>
									</div>
								</div>
							)}
							<VirtualMessageList 
								messages={messages}
								isLoading={isLoading}
								onDateSelect={handleDateSelect}
								onTimeOfDaySelect={handleTimeOfDaySelect}
								onTimeSlotSelect={handleTimeSlotSelect}
								onRequestMoreDates={handleRequestMoreDates}
								onServiceSelect={handleServiceSelect}
								onUrgencySelect={handleUrgencySelect}
								position={position}
							/>
							<div className="input-area" role="form" aria-label="Message composition">
								<div className="input-container" style={{
									maxWidth: position === 'inline' ? 'none' : '768px',
									margin: position === 'inline' ? '0' : '0 auto'
								}}>
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
						</>
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
