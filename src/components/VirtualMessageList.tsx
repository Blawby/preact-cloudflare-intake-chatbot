import { FunctionComponent } from 'preact';
import { useRef, useEffect, useState, useCallback } from 'preact/hooks';
import Message from './Message';
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

interface ChatMessage {
    content: string;
    isUser: boolean;
    files?: FileAttachment[];
    scheduling?: SchedulingData;
    id?: string;
}

interface VirtualMessageListProps {
    messages: ChatMessage[];
    isLoading?: boolean;
    onDateSelect?: (date: Date) => void;
    onTimeOfDaySelect?: (timeOfDay: 'morning' | 'afternoon') => void;
    onTimeSlotSelect?: (timeSlot: Date) => void;
    onRequestMoreDates?: () => void;
    position?: 'widget' | 'inline';
}

const BATCH_SIZE = 20;
const SCROLL_THRESHOLD = 100;
const DEBOUNCE_DELAY = 150;

const VirtualMessageList: FunctionComponent<VirtualMessageListProps> = ({ 
    messages, 
    isLoading,
    onDateSelect,
    onTimeOfDaySelect,
    onTimeSlotSelect,
    onRequestMoreDates,
    position = 'widget'
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
            style={{
                maxWidth: position === 'inline' ? 'none' : '768px',
                margin: position === 'inline' ? '0' : '0 auto'
            }}
        >
            {startIndex > 0 && (
                <div class="load-more-trigger">
                    <div class="loading-indicator">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
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
                        onDateSelect={onDateSelect}
                        onTimeOfDaySelect={onTimeOfDaySelect}
                        onTimeSlotSelect={onTimeSlotSelect}
                        onRequestMoreDates={onRequestMoreDates}
                        isLoading={isLoading && index === visibleMessages.length - 1 && !message.isUser && !message.content}
                    />
                ))}
            </ErrorBoundary>
        </div>
    );
};

export default memo(VirtualMessageList); 