import { FunctionComponent } from 'preact';
import { useRef, useEffect, useState, useCallback } from 'preact/hooks';
import Message from './Message';
import LoadingIndicator from './LoadingIndicator';
import { memo } from 'preact/compat';
import { debounce } from '../utils/debounce';
import { ErrorBoundary } from './ErrorBoundary';

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

// Add matter creation interface
interface MatterCreationData {
    type: 'service-selection';
    availableServices: string[];
}

interface ChatMessage {
    content: string;
    isUser: boolean;
    files?: FileAttachment[];
    scheduling?: SchedulingData;
    matterCreation?: MatterCreationData;
    welcomeMessage?: {
        showButtons: boolean;
    };
    matterCanvas?: {
        matterId?: string;
        matterNumber?: string;
        service: string;
        matterSummary: string;
        qualityScore?: {
            score: number;
            badge: 'Excellent' | 'Good' | 'Fair' | 'Poor';
            color: 'blue' | 'green' | 'yellow' | 'red';
            inferredUrgency: string;
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
        };
        answers?: Record<string, string>;
    };
    qualityScore?: {
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
    };
    isLoading?: boolean;
    id?: string;
}

interface VirtualMessageListProps {
    messages: ChatMessage[];
    onDateSelect?: (date: Date) => void;
    onTimeOfDaySelect?: (timeOfDay: 'morning' | 'afternoon') => void;
    onTimeSlotSelect?: (timeSlot: Date) => void;
    onRequestMoreDates?: () => void;
    onServiceSelect?: (service: string) => void;
    onUrgencySelect?: (urgency: string) => void;
    onCreateMatter?: () => void;
    onScheduleConsultation?: () => void;
    onLearnServices?: () => void;
    teamConfig?: {
        name: string;
        profileImage: string | null;
        teamId: string;
    };
    onOpenSidebar?: () => void;

    // Feedback props
    sessionId?: string;
    teamId?: string;
    onFeedbackSubmit?: (feedback: any) => void;
}

const BATCH_SIZE = 20;
const SCROLL_THRESHOLD = 100;
const DEBOUNCE_DELAY = 150;

const VirtualMessageList: FunctionComponent<VirtualMessageListProps> = ({ 
    messages, 
    onDateSelect,
    onTimeOfDaySelect,
    onTimeSlotSelect,
    onRequestMoreDates,
    onServiceSelect,
    onUrgencySelect,
    onCreateMatter,
    onScheduleConsultation,
    onLearnServices,
    teamConfig,
    onOpenSidebar,

    sessionId,
    teamId,
    onFeedbackSubmit
}) => {
    const listRef = useRef<HTMLDivElement>(null);
    const [startIndex, setStartIndex] = useState(Math.max(0, messages.length - BATCH_SIZE));
    const [endIndex, setEndIndex] = useState(messages.length);
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const lastScrollTop = useRef(0);

    // Check if scrolled to bottom
    const checkIfAtBottom = useCallback((element: HTMLElement) => {
        const { scrollTop, scrollHeight, clientHeight } = element;
        return Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
    }, []);

    // Handle scroll events
    const handleScroll = useCallback(() => {
        if (!listRef.current) return;

        const element = listRef.current;
        const currentScrollTop = element.scrollTop;
        const isBottom = checkIfAtBottom(element);
        
        // Detect if user is manually scrolling up
        if (currentScrollTop < lastScrollTop.current && !isBottom) {
            setIsUserScrolledUp(true);
        } else if (isBottom) {
            setIsUserScrolledUp(false);
        }
        
        setIsAtBottom(isBottom);
        lastScrollTop.current = currentScrollTop;
        
        // Load more messages when scrolling up
        if (element.scrollTop < SCROLL_THRESHOLD && startIndex > 0) {
            const newStartIndex = Math.max(0, startIndex - BATCH_SIZE);
            setStartIndex(newStartIndex);
            
            // Maintain scroll position when loading more messages
            requestAnimationFrame(() => {
                if (listRef.current) {
                    const newScrollTop = listRef.current.scrollHeight - element.scrollHeight;
                    if (newScrollTop > 0) {
                        listRef.current.scrollTop = newScrollTop;
                    }
                }
            });
        }
    }, [startIndex, checkIfAtBottom]);

    const debouncedHandleScroll = useCallback(
        debounce(handleScroll, DEBOUNCE_DELAY),
        [handleScroll]
    );

    // Add scroll listener
    useEffect(() => {
        const list = listRef.current;
        if (list) {
            list.addEventListener('scroll', debouncedHandleScroll);
        }
        return () => {
            if (list) {
                list.removeEventListener('scroll', debouncedHandleScroll);
            }
        };
    }, [debouncedHandleScroll]);

    // Scroll to bottom function
    const scrollToBottom = useCallback(() => {
        if (!listRef.current) return;
        
        const element = listRef.current;
        element.scrollTo({
            top: element.scrollHeight,
            behavior: 'smooth'
        });
        setIsUserScrolledUp(false);
        setIsAtBottom(true);
    }, []);

    useEffect(() => {
        // Update indices when new messages are added
        if (!isUserScrolledUp || messages[messages.length - 1]?.isUser) {
            setEndIndex(messages.length);
            setStartIndex(Math.max(0, messages.length - BATCH_SIZE));
        }
    }, [messages.length, isUserScrolledUp]);

    useEffect(() => {
        // Auto-scroll on new messages
        if (!isUserScrolledUp || messages[messages.length - 1]?.isUser) {
            requestAnimationFrame(() => {
                scrollToBottom();
            });
        }
    }, [messages, endIndex, isUserScrolledUp, scrollToBottom]);

    const visibleMessages = messages.slice(startIndex, endIndex);

    return (
        <div class="message-list-container">
            <div 
                class="message-list" 
                ref={listRef}
            >
                {startIndex > 0 && (
                    <div class="load-more-trigger">
                        <LoadingIndicator />
                    </div>
                )}
                <ErrorBoundary>
                    {visibleMessages.map((message, index) => (
                        <Message
                            key={startIndex + index}
                            content={message.content}
                            isUser={message.isUser}
                            files={message.files}
                            scheduling={message.scheduling}
                            matterCreation={message.matterCreation}
                            welcomeMessage={message.welcomeMessage}
                            matterCanvas={message.matterCanvas}
                            qualityScore={message.qualityScore}
                            onDateSelect={onDateSelect}
                            onTimeOfDaySelect={onTimeOfDaySelect}
                            onTimeSlotSelect={onTimeSlotSelect}
                            onRequestMoreDates={onRequestMoreDates}
                            onServiceSelect={onServiceSelect}
                            onUrgencySelect={onUrgencySelect}
                            onCreateMatter={onCreateMatter}
                            onScheduleConsultation={onScheduleConsultation}
                            onLearnServices={onLearnServices}
                            teamConfig={teamConfig}
                            onOpenSidebar={onOpenSidebar}
                            isLoading={message.isLoading}
                            id={message.id}
                            sessionId={sessionId}
                            teamId={teamId}
                            onFeedbackSubmit={onFeedbackSubmit}
                        />
                    ))}
                </ErrorBoundary>
            </div>
            
            {/* Scroll to bottom button - appears when user has scrolled up */}
            {isUserScrolledUp && (
                <button 
                    class="scroll-to-bottom-button"
                    onClick={scrollToBottom}
                    aria-label="Scroll to latest message"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M7 13l5 5 5-5"/>
                        <path d="M7 6l5 5 5-5"/>
                    </svg>
                </button>
            )}
        </div>
    );
};

export default memo(VirtualMessageList); 