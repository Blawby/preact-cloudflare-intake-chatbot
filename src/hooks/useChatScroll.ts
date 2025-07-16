import { useRef, useEffect, useCallback, useState } from 'preact/hooks';

interface UseChatScrollOptions {
  threshold?: number; // Distance from bottom to consider "at bottom"
  smoothScroll?: boolean;
  autoScrollOnNewMessage?: boolean;
}

export const useChatScroll = (options: UseChatScrollOptions = {}) => {
  const {
    threshold = 50,
    smoothScroll = true,
    autoScrollOnNewMessage = true
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const lastScrollTop = useRef(0);

  // Check if user is scrolled to bottom
  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return Math.abs(scrollHeight - scrollTop - clientHeight) < threshold;
  }, [threshold]);

  // Scroll to bottom with smooth behavior
  const scrollToBottom = useCallback((force = false) => {
    if (!containerRef.current) return;
    
    const element = containerRef.current;
    const isBottom = checkIfAtBottom();
    
    // Only auto-scroll if user hasn't manually scrolled up, or if forced
    if (force || !isUserScrolledUp || isBottom) {
      if (smoothScroll) {
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        element.scrollTop = element.scrollHeight;
      }
      setIsUserScrolledUp(false);
      setIsAtBottom(true);
    }
  }, [isUserScrolledUp, smoothScroll, checkIfAtBottom]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const element = containerRef.current;
    const currentScrollTop = element.scrollTop;
    const isBottom = checkIfAtBottom();
    
    // Detect if user is manually scrolling up
    if (currentScrollTop < lastScrollTop.current && !isBottom) {
      setIsUserScrolledUp(true);
    } else if (isBottom) {
      setIsUserScrolledUp(false);
    }
    
    setIsAtBottom(isBottom);
    lastScrollTop.current = currentScrollTop;
  }, [checkIfAtBottom]);

  // Set up scroll listener
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Auto-scroll on new messages
  const scrollOnNewMessage = useCallback(() => {
    if (autoScrollOnNewMessage) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [autoScrollOnNewMessage, scrollToBottom]);

  // Force scroll to bottom (for user actions like sending messages)
  const forceScrollToBottom = useCallback(() => {
    scrollToBottom(true);
  }, [scrollToBottom]);

  return {
    containerRef,
    isUserScrolledUp,
    isAtBottom,
    scrollToBottom: forceScrollToBottom,
    scrollOnNewMessage
  };
}; 