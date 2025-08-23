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
    onScheduleConsultation?: () => void;
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
    onScheduleConsultation,
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
        return Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
    }, []);

    const handleScroll = useCallback(() => {
        if (!listRef.current) return;

        const element = listRef.current;
        const isBottom = checkIfScrolledToBottom(element);
        setIsScrolledToBottom(isBottom);

        // Dispatch scroll event for navbar visibility
        const currentScrollTop = element.scrollTop;
        const lastScrollTop = (element as any).lastScrollTop || 0;
        const scrollDelta = Math.abs(currentScrollTop - lastScrollTop);
        
        if (scrollDelta > 0) {
            window.dispatchEvent(new CustomEvent('chat-scroll', {
                detail: { scrollTop: currentScrollTop, scrollDelta }
            }));
        }
        
        (element as any).lastScrollTop = currentScrollTop;

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
                        matterCanvas={message.matterCanvas}
                        paymentEmbed={message.paymentEmbed}
                        teamConfig={teamConfig}
                        onOpenSidebar={onOpenSidebar}
                        isLoading={message.isLoading}
                        aiState={message.aiState}
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