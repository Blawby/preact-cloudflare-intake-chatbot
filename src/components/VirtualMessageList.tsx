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
    matterCanvas?: {
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
        isExpanded?: boolean;
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

    sessionId,
    teamId,
    onFeedbackSubmit
}) => {
    const listRef = useRef<HTMLDivElement>(null);
    const [startIndex, setStartIndex] = useState(Math.max(0, messages.length - BATCH_SIZE));
    const [endIndex, setEndIndex] = useState(messages.length);
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

    const checkIfScrolledToBottom = useCallback((element: HTMLElement) => {
        const { scrollTop, scrollHeight, clientHeight } = element;
        return Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
    }, []);

    const handleScroll = useCallback(() => {
        if (!listRef.current) return;

        const element = listRef.current;
        const isBottom = checkIfScrolledToBottom(element);
        setIsScrolledToBottom(isBottom);

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
    }, [startIndex, checkIfScrolledToBottom]);

    const debouncedHandleScroll = useCallback(
        debounce(handleScroll, DEBOUNCE_DELAY),
        [handleScroll]
    );

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

    useEffect(() => {
        // Update indices when new messages are added
        if (isScrolledToBottom || messages[messages.length - 1]?.isUser) {
            setEndIndex(messages.length);
            setStartIndex(Math.max(0, messages.length - BATCH_SIZE));
        }
    }, [messages.length, isScrolledToBottom]);

    useEffect(() => {
        // Scroll to bottom when new messages are added and we're at the bottom
        if (listRef.current && (isScrolledToBottom || messages[messages.length - 1]?.isUser)) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages, endIndex, isScrolledToBottom]);

    const visibleMessages = messages.slice(startIndex, endIndex);

    return (
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
                        matterCanvas={message.matterCanvas}
                        qualityScore={message.qualityScore}
                        onDateSelect={onDateSelect}
                        onTimeOfDaySelect={onTimeOfDaySelect}
                        onTimeSlotSelect={onTimeSlotSelect}
                        onRequestMoreDates={onRequestMoreDates}
                        onServiceSelect={onServiceSelect}
                        onUrgencySelect={onUrgencySelect}
                        isLoading={message.isLoading}
                        id={message.id}
                        sessionId={sessionId}
                        teamId={teamId}
                        onFeedbackSubmit={onFeedbackSubmit}
                    />
                ))}
            </ErrorBoundary>
        </div>
    );
};

export default memo(VirtualMessageList); 