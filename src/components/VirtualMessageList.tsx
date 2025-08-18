import { FunctionComponent } from 'preact';
import { useRef, useEffect, useState, useCallback } from 'preact/hooks';
import Message from './Message';
import TeamProfile from './TeamProfile';
import { memo } from 'preact/compat';
import { debounce } from '../utils/debounce';
import { ErrorBoundary } from './ErrorBoundary';
import { ChatMessageUI } from '../../worker/types';

interface VirtualMessageListProps {
    messages: ChatMessageUI[];
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
        description?: string | null;
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
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

    const checkIfScrolledToBottom = useCallback((element: HTMLElement) => {
        const { scrollTop, scrollHeight, clientHeight } = element;

        // Determine scroll direction and dispatch appropriate event
        const currentScrollTop = element.scrollTop;
        if (currentScrollTop > (element as any).lastScrollTop || 0) {
            // Scrolling down
            window.dispatchEvent(new CustomEvent('navbar-scroll', { detail: { direction: 'down' } }));

            console.log('scrolling down')
        } else if (currentScrollTop < (element as any).lastScrollTop) {
            // Scrolling up
            window.dispatchEvent(new CustomEvent('navbar-scroll', { detail: { direction: 'up' } }));

            console.log('scrolling up')
        }
        (element as any).lastScrollTop = currentScrollTop;


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
        // Also scroll when new messages are added (for button clicks, etc.)
        if (listRef.current && (isScrolledToBottom || messages[messages.length - 1]?.isUser)) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages, endIndex, isScrolledToBottom]);

    // Additional effect to handle button-triggered messages
    useEffect(() => {
        // Always scroll to bottom when messages length changes (new messages added)
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages.length]);

    const visibleMessages = messages.slice(startIndex, endIndex);

    return (
        <div
            className="flex-1 overflow-y-auto p-4 pb-40 scroll-smooth w-full scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
            ref={listRef}
        >
            {/* Team Profile Header - Fixed at top of scrollable area */}
            {teamConfig && (
                <div className="flex flex-col items-center py-8 px-4 pb-6 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg mb-4">
                    <TeamProfile
                        name={teamConfig.name}
                        profileImage={teamConfig.profileImage}
                        teamId={teamId}
                        description={teamConfig.description}
                        variant="welcome"
                        showVerified={true}
                    />
                </div>
            )}

            {startIndex > 0 && (
                <div className="flex justify-center items-center py-4">
                    <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm lg:text-base">Loading more messages...</div>
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
                        paymentEmbed={message.paymentEmbed}
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
    );
};

export default memo(VirtualMessageList); 