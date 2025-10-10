import { hydrate, prerender as ssr, Router, Route, useLocation, LocationProvider } from 'preact-iso';
import { useState, useEffect, useCallback, useLayoutEffect } from 'preact/hooks';
import { Suspense } from 'preact/compat';
import { I18nextProvider } from 'react-i18next';
import ChatContainer from './components/ChatContainer';
import DragDropOverlay from './components/DragDropOverlay';
import AppLayout from './components/AppLayout';
import AuthPage from './components/AuthPage';
import { SEOHead } from './components/SEOHead';
import { ToastProvider } from './contexts/ToastContext';
import { useMessageHandling } from './hooks/useMessageHandling';
import { useFileUpload } from './hooks/useFileUpload';
import { useOrganizationConfig } from './hooks/useOrganizationConfig';
import { useChatSession } from './hooks/useChatSession';
import { setupGlobalKeyboardListeners } from './utils/keyboard';
import { ChatMessageUI } from '../worker/types';
// Settings components
import { SettingsLayout } from './components/settings/SettingsLayout';
import { useNavigation } from './utils/navigation';
import PricingModal from './components/PricingModal';
import WelcomeModal from './components/onboarding/WelcomeModal';
import { debounce } from './utils/debounce';
import './index.css';
import { i18n, initI18n } from './i18n';



// Main application component (non-auth pages)
function MainApp() {
	// Core state
	const [clearInputTrigger, setClearInputTrigger] = useState(0);
	const [currentTab, setCurrentTab] = useState<'chats' | 'matter'>('chats');
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [showWelcomeModal, setShowWelcomeModal] = useState(false);
	
	// Mobile state - initialized as false to avoid SSR/client hydration mismatch
	const [isMobile, setIsMobile] = useState(false);
	
	// Get current location to detect settings routes
	const location = useLocation();
	const { navigate } = useNavigation();

	// Use custom hooks
	const { organizationId, organizationConfig, organizationNotFound, handleRetryOrganizationConfig } = useOrganizationConfig({
		onError: (error) => {
			// Handle organization config error
			 
			console.error('Organization config error:', error);
		}
	});

	const {
		sessionId,
		error: sessionError
	} = useChatSession(organizationId);

	const { messages, sendMessage, handleContactFormSubmit, addMessage } = useMessageHandling({
		organizationId,
		sessionId,
		onError: (error) => {
			// Handle message handling error
			 
			console.error('Message handling error:', error);
		}
	});

	const {
		previewFiles,
		uploadingFiles,
		isDragging,
		setIsDragging,
		handleCameraCapture,
		handleFileSelect,
		removePreviewFile,
		clearPreviewFiles,
		cancelUpload,
		isReadyToUpload
	} = useFileUpload({
		organizationId,
		sessionId,
		onError: (error) => {
			// Handle file upload error
			 
			console.error('File upload error:', error);
		}
	});

	useEffect(() => {
		if (sessionError) {
			// Handle session initialization error
			 
			console.error('Session initialization error:', sessionError);
		}
	}, [sessionError]);

	// Handle settings modal based on URL
	useEffect(() => {
		const isSettingsRoute = location.path.startsWith('/settings');
		setShowSettingsModal(isSettingsRoute);
	}, [location.path]);

	// Check if we should show welcome modal (after onboarding completion)
	useEffect(() => {
		// Check if user just completed onboarding
		try {
			const onboardingCompleted = localStorage.getItem('onboardingCompleted');
			if (onboardingCompleted === 'true') {
				setShowWelcomeModal(true);
				// Don't remove the flag here - let the completion handler do it
				// This prevents permanent loss if the modal fails to render
			}
		} catch (error) {
			// Handle localStorage access failures (private browsing, etc.)
			if (import.meta.env.DEV) {
				 
				console.warn('Failed to check onboarding completion status:', error);
			}
		}
	}, []);

	// Handle hash-based routing for pricing modal
	const [showPricingModal, setShowPricingModal] = useState(false);
	const [currentUserTier, setCurrentUserTier] = useState<'free' | 'plus' | 'business'>('free');
	
	useEffect(() => {
		const handleHashChange = () => {
			const hash = window.location.hash;
			setShowPricingModal(hash === '#pricing');
		};

		// Check initial hash
		handleHashChange();

		// Listen for hash changes
		window.addEventListener('hashchange', handleHashChange);
		
		return () => {
			window.removeEventListener('hashchange', handleHashChange);
		};
	}, []);

	// Listen for user tier changes
	useEffect(() => {
		const handleAuthStateChange = (e: CustomEvent) => {
			if (e.detail && e.detail.subscriptionTier) {
				setCurrentUserTier(e.detail.subscriptionTier);
			} else {
				// Fallback to 'free' when detail is missing or subscriptionTier is falsy
				setCurrentUserTier('free');
			}
		};

		// Check current user tier from localStorage
		const mockUser = localStorage.getItem('mockUser');
		if (mockUser) {
			try {
				const userData = JSON.parse(mockUser);
				setCurrentUserTier(userData.subscriptionTier || 'free');
			} catch (_error) {
				// Ignore parsing errors
			}
		}

		window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);
		
		return () => {
			window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
		};
	}, []);

	const isSessionReady = Boolean(sessionId);


	// Add intro message when organization config is loaded and no messages exist
	useEffect(() => {
		if (organizationConfig.introMessage && messages.length === 0) {
			// Add intro message only (organization profile is now a UI element)
			const introMessage: ChatMessageUI = {
				id: crypto.randomUUID(),
				content: organizationConfig.introMessage,
				isUser: false,
				role: 'assistant',
				timestamp: Date.now()
			};
			addMessage(introMessage);
		}
	}, [organizationConfig.introMessage, messages.length, addMessage]);

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

	// Mobile detection with resize handling
	useLayoutEffect(() => {
		// Function to check if mobile
		const checkIsMobile = () => {
			return window.innerWidth < 1024;
		};

		// Set initial mobile state
		setIsMobile(checkIsMobile());

		// Create debounced resize handler for performance
		const debouncedResizeHandler = debounce(() => {
			setIsMobile(checkIsMobile());
		}, 100);

		// Add resize listener
		window.addEventListener('resize', debouncedResizeHandler);

		// Cleanup function
		return () => {
			window.removeEventListener('resize', debouncedResizeHandler);
			debouncedResizeHandler.cancel();
		};
	}, []);

	// Handle feedback submission
	const handleFeedbackSubmit = useCallback((feedback: Record<string, unknown>) => {
		// Handle feedback submission
		 
		console.log('Feedback submitted:', feedback);
		// Could show a toast notification here
	}, []);

	// Handle welcome modal
	const handleWelcomeComplete = () => {
		setShowWelcomeModal(false);
		
		// Remove the onboarding completion flag now that the welcome modal has been shown
		try {
			localStorage.removeItem('onboardingCompleted');
		} catch (error) {
			// Handle localStorage access failures (private browsing, etc.)
			if (import.meta.env.DEV) {
				 
				console.warn('Failed to remove onboarding completion flag:', error);
			}
		}
	};

	const handleWelcomeClose = () => {
		setShowWelcomeModal(false);
		
		// Remove the onboarding completion flag even if user closes without completing
		// This prevents the welcome modal from showing again
		try {
			localStorage.removeItem('onboardingCompleted');
		} catch (error) {
			// Handle localStorage access failures (private browsing, etc.)
			if (import.meta.env.DEV) {
				 
				console.warn('Failed to remove onboarding completion flag:', error);
			}
		}
	};






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
			// Handle media upload error
			 
			console.error('Failed to upload captured media:', error);
			// Show error message to user
			sendMessage("I'm sorry, I couldn't upload the recorded media. Please try again.", []);
		}
	};





	// Handle navigation to chats - removed since bottom nav is disabled

	// Render the main app
	return (
		<>
			<DragDropOverlay isVisible={isDragging} onClose={() => setIsDragging(false)} />
			
			<AppLayout
				organizationNotFound={organizationNotFound}
				organizationId={organizationId}
				onRetryOrganizationConfig={handleRetryOrganizationConfig}
				currentTab={currentTab}
				onTabChange={setCurrentTab}
				isMobileSidebarOpen={isMobileSidebarOpen}
				onToggleMobileSidebar={setIsMobileSidebarOpen}
				isSettingsModalOpen={showSettingsModal}
				organizationConfig={{
					name: organizationConfig.name,
					profileImage: organizationConfig.profileImage,
					description: organizationConfig.description
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
						organizationConfig={{
							name: organizationConfig.name,
							profileImage: organizationConfig.profileImage,
							organizationId,
							description: organizationConfig.description
						}}
						onOpenSidebar={() => setIsMobileSidebarOpen(true)}
						sessionId={sessionId}
						organizationId={organizationId}
						onFeedbackSubmit={handleFeedbackSubmit}
						previewFiles={previewFiles}
						uploadingFiles={uploadingFiles}
						removePreviewFile={removePreviewFile}
						clearPreviewFiles={clearPreviewFiles}
						handleCameraCapture={handleCameraCapture}
						handleFileSelect={async (files: File[]) => {
							await handleFileSelect(files);
						}}
						cancelUpload={cancelUpload}
						handleMediaCapture={handleMediaCaptureWrapper}
						isRecording={isRecording}
						setIsRecording={setIsRecording}
						clearInput={clearInputTrigger}
						isReadyToUpload={isReadyToUpload}
						isSessionReady={isSessionReady}
						/>
				</div>
			</AppLayout>

			{/* Settings Modal */}
			{showSettingsModal && (
				<SettingsLayout
					isMobile={isMobile}
					onClose={() => {
						setShowSettingsModal(false);
						setIsMobileSidebarOpen(false); // Close mobile sidebar when settings close
						navigate('/');
					}}
					className="h-full"
				/>
			)}

			{/* Pricing Modal */}
			<PricingModal
				isOpen={showPricingModal}
				onClose={() => {
					setShowPricingModal(false);
					window.location.hash = '';
				}}
				currentTier={currentUserTier}
				onUpgrade={(tier) => {
					// Update user's subscription tier
					const mockUser = localStorage.getItem('mockUser');
					if (mockUser) {
						try {
							const userData = JSON.parse(mockUser);
							userData.subscriptionTier = tier;
							localStorage.setItem('mockUser', JSON.stringify(userData));
							
							// Dispatch event to notify other components
							window.dispatchEvent(new CustomEvent('authStateChanged', { detail: userData }));
						} catch (_error) {
							 
							console.error('Failed to parse mockUser data:', _error);
							// Create a fresh user object with the new subscription tier
							const freshUserData = {
								subscriptionTier: tier,
								// Add other default user properties as needed
							};
							localStorage.setItem('mockUser', JSON.stringify(freshUserData));
							
							// Dispatch event with the fresh user data
							window.dispatchEvent(new CustomEvent('authStateChanged', { detail: freshUserData }));
						}
					} else {
						// No existing user - create a fallback user record for first-time users
						const fallbackUserData = {
							id: `fallback-user-${Date.now()}`,
							name: 'New User',
							email: 'user@example.com',
							image: null,
							organizationId: null,
							role: 'user',
							phone: null,
							subscriptionTier: tier
						};
						localStorage.setItem('mockUser', JSON.stringify(fallbackUserData));
						
						// Dispatch event with the fallback user data
						window.dispatchEvent(new CustomEvent('authStateChanged', { detail: fallbackUserData }));
					}
					
					// Always ensure these cleanup operations run
					setShowPricingModal(false);
					window.location.hash = '';
				}}
			/>

			{/* Welcome Modal */}
			<WelcomeModal
				isOpen={showWelcomeModal}
				onClose={handleWelcomeClose}
				onComplete={handleWelcomeComplete}
			/>
		</>
	);
}


// Main App component with routing
export function App() {
	// Use custom hooks for organization config (needed for SEO)
	const { organizationConfig } = useOrganizationConfig({
		onError: (error) => {
			// Handle organization config error
			 
			console.error('Organization config error:', error);
		}
	});

	// Get reactive location for client-side navigation
	const location = useLocation();
	
	// Create reactive currentUrl that updates on navigation
	const currentUrl = typeof window !== 'undefined' 
		? `${window.location.origin}${location.url}`
		: undefined;

	return (
		<LocationProvider>
			<ToastProvider>
				<SEOHead 
					organizationConfig={organizationConfig}
					currentUrl={currentUrl}
				/>
				<Router>
					<Route path="/auth" component={AuthPage} />
					<Route path="/settings/*" component={MainApp} />
					<Route default component={MainApp} />
				</Router>
			</ToastProvider>
		</LocationProvider>
	);
}

const FallbackLoader = () => (
	<div className="flex h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">
		Loading…
	</div>
);

function AppWithProviders() {
	return (
		<I18nextProvider i18n={i18n}>
			<Suspense fallback={<FallbackLoader />}>
				<App />
			</Suspense>
		</I18nextProvider>
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

	initI18n()
		.then(() => {
			hydrate(<AppWithProviders />, document.getElementById('app'));
		})
		.catch((error) => {
			 
			console.error('Failed to initialize i18n:', error);
			hydrate(<AppWithProviders />, document.getElementById('app'));
		});
}


export async function prerender() {
	await initI18n();
	return await ssr(<AppWithProviders />);
}
