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
import { useTeamConfig } from './hooks/useTeamConfig';
import { useChatSession } from './hooks/useChatSession';
import { setupGlobalKeyboardListeners } from './utils/keyboard';
import { ChatMessageUI } from '../worker/types';
// Settings components
import { SettingsLayout } from './components/settings/SettingsLayout';
import { useNavigation } from './utils/navigation';
import PricingModal from './components/PricingModal';
import PricingCart from './components/PricingCart';
import PricingCheckout from './components/PricingCheckout';
import PricingConfirmation from './components/PricingConfirmation';
import WelcomeModal from './components/onboarding/WelcomeModal';
import { debounce } from './utils/debounce';
import './index.css';
import { i18n, initI18n } from './i18n';

// Error UI HTML template for hydration failures
const ERROR_UI_HTML = `
	<div style="display: flex; height: 100vh; align-items: center; justify-content: center; flex-direction: column; padding: 2rem; text-align: center;">
		<h1 style="font-size: 1.5rem; margin-bottom: 1rem; color: #ef4444;">Application Error</h1>
		<p style="color: #6b7280; margin-bottom: 1rem;">Failed to initialize the application. Please refresh the page to try again.</p>
		<button onclick="window.location.reload()" style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; cursor: pointer;">
			Refresh Page
		</button>
	</div>
`;



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
	const { teamId, teamConfig, teamNotFound, handleRetryTeamConfig } = useTeamConfig({
		onError: (error) => {
			// Handle team config error
			// eslint-disable-next-line no-console
			console.error('Team config error:', error);
		}
	});

	const {
		sessionId,
		error: sessionError
	} = useChatSession(teamId);

	const { messages, sendMessage, handleContactFormSubmit, addMessage } = useMessageHandling({
		teamId,
		sessionId,
		onError: (error) => {
			// Handle message handling error
			// eslint-disable-next-line no-console
			console.error('Message handling error:', error);
		}
	});

	const {
		previewFiles,
		isDragging,
		setIsDragging,
		handleCameraCapture,
		handleFileSelect,
		removePreviewFile,
		clearPreviewFiles,
		isReadyToUpload
	} = useFileUpload({
		teamId,
		sessionId,
		onError: (error) => {
			// Handle file upload error
			// eslint-disable-next-line no-console
			console.error('File upload error:', error);
		}
	});

	useEffect(() => {
		if (sessionError) {
			// Handle session initialization error
			// eslint-disable-next-line no-console
			console.error('Session initialization error:', sessionError);
		}
	}, [sessionError]);

	// Handle settings modal based on URL
	useEffect(() => {
		if (location && location.path) {
			const isSettingsRoute = location.path.startsWith('/settings');
			setShowSettingsModal(isSettingsRoute);
		}
	}, [location]);

	// Listen for custom settings open event
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const handleOpenSettings = () => {
				setShowSettingsModal(true);
			};
			
			window.addEventListener('openSettings', handleOpenSettings);
			
			return () => {
				window.removeEventListener('openSettings', handleOpenSettings);
			};
		}
	}, []);

	// Check if we should show welcome modal (after onboarding completion)
	useEffect(() => {
		if (typeof window !== 'undefined') {
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
					// eslint-disable-next-line no-console
					console.warn('Failed to check onboarding completion status:', error);
				}
			}
		}
	}, []);

	// Handle hash-based routing for pricing modal
	const [showPricingModal, setShowPricingModal] = useState(false);
	const [currentUserTier, setCurrentUserTier] = useState<'free' | 'plus' | 'business'>('free');
	
	useEffect(() => {
		if (typeof window === 'undefined') return;
		
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
		if (typeof window !== 'undefined') {
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
					// Validate that parsed data is an object with expected structure
					if (typeof userData === 'object' && userData !== null && 'subscriptionTier' in userData) {
						setCurrentUserTier(userData.subscriptionTier || 'free');
					} else {
						// Invalid shape - treat as parse error
						if (import.meta.env.DEV) {
							console.error('Invalid mockUser shape from localStorage:', userData, 'Raw mockUser value:', mockUser);
						}
					}
				} catch (error) {
					// Log parsing errors in development for debugging
					if (import.meta.env.DEV) {
						console.error('Failed to parse mockUser from localStorage:', error, 'Raw mockUser value:', mockUser);
					}
					// Ignore parsing errors in production
				}
			}

			window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);
			
			return () => {
				window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
			};
		}
	}, []);

	const isSessionReady = Boolean(sessionId);


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
		if (typeof document !== 'undefined') {
			const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
			if (textarea) {
				textarea.focus();
			}
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
		if (typeof document === 'undefined' || typeof window === 'undefined') return;
		
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
		if (typeof window !== 'undefined') {
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
		}
	}, []);

	// Handle feedback submission
	const handleFeedbackSubmit = useCallback((feedback: Record<string, unknown>) => {
		// Handle feedback submission
		// eslint-disable-next-line no-console
		console.log('Feedback submitted:', feedback);
		// Could show a toast notification here
	}, []);

	// Handle welcome modal
	const handleWelcomeComplete = () => {
		setShowWelcomeModal(false);
		
		// Remove the onboarding completion flag now that the welcome modal has been shown
		if (typeof window !== 'undefined') {
			try {
				localStorage.removeItem('onboardingCompleted');
			} catch (error) {
				// Handle localStorage access failures (private browsing, etc.)
				if (import.meta.env.DEV) {
					// eslint-disable-next-line no-console
					console.warn('Failed to remove onboarding completion flag:', error);
				}
			}
		}
	};

	const handleWelcomeClose = () => {
		setShowWelcomeModal(false);
		
		// Remove the onboarding completion flag even if user closes without completing
		// This prevents the welcome modal from showing again
		if (typeof window !== 'undefined') {
			try {
				localStorage.removeItem('onboardingCompleted');
			} catch (error) {
				// Handle localStorage access failures (private browsing, etc.)
				if (import.meta.env.DEV) {
					// eslint-disable-next-line no-console
					console.warn('Failed to remove onboarding completion flag:', error);
				}
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
			// eslint-disable-next-line no-console
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
				teamNotFound={teamNotFound}
				teamId={teamId}
				onRetryTeamConfig={handleRetryTeamConfig}
				currentTab={currentTab}
				onTabChange={setCurrentTab}
				isMobileSidebarOpen={isMobileSidebarOpen}
				onToggleMobileSidebar={setIsMobileSidebarOpen}
				isSettingsModalOpen={showSettingsModal}
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
					if (typeof window !== 'undefined') {
						window.location.hash = '';
					}
				}}
				currentTier={currentUserTier}
				onUpgrade={(tier) => {
					// Navigate to cart page with pre-selected tier
					if (typeof window !== 'undefined') {
						window.location.hash = '';
					}
					setShowPricingModal(false);
					
					// Navigate to cart page with tier parameter using SPA router
					navigate(`/pricing/cart?tier=${tier}`);
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
	// Use custom hooks for team config (needed for SEO)
	const { teamConfig } = useTeamConfig({
		onError: (error) => {
			// Handle team config error
			// eslint-disable-next-line no-console
			console.error('Team config error:', error);
		}
	});

	// Get reactive location for client-side navigation
	const location = useLocation();
	
	// Create reactive currentUrl that updates on navigation
	const currentUrl = typeof window !== 'undefined' && location
		? `${window.location.origin}${location.url}`
		: undefined;

	return (
		<LocationProvider>
			<ToastProvider>
				<SEOHead 
					teamConfig={teamConfig}
					currentUrl={currentUrl}
				/>
			<Router>
            <Route path="/auth" component={AuthPage} />
            <Route path="/pricing/cart" component={PricingCart} />
            <Route path="/pricing/checkout" component={PricingCheckout} />
            <Route path="/pricing/confirmation" component={PricingConfirmation} />
            <Route path="/settings/*" component={MainApp} />
            <Route path="/" component={MainApp} />
            <Route path="/help" component={MainApp} />
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
	// Hydration check for production monitoring
	// eslint-disable-next-line no-console
	console.info('Hydration started');
	
	// Initialize i18n and hydrate only on success
	initI18n()
		.then(() => {
			try {
				hydrate(<AppWithProviders />, document.getElementById('app'));
			} catch (hydrationError) {
				// eslint-disable-next-line no-console
				console.error('Hydration failed:', hydrationError);
			}
		})
		.catch((error) => {
			// eslint-disable-next-line no-console
			console.error('Failed to initialize i18n:', error);
			// Render fallback error UI instead of attempting hydration
			if (typeof document !== 'undefined') {
				const appElement = document.getElementById('app');
				if (appElement) {
					appElement.innerHTML = ERROR_UI_HTML;
				}
			}
		});
}


export async function prerender() {
	await initI18n();
	// Prerender all public routes including pricing pages for SEO
	return await ssr(<AppWithProviders />);
}
