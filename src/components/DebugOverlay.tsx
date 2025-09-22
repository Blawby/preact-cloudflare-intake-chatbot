import { FunctionComponent } from 'preact';
import { useEffect, useState, useCallback } from 'preact/hooks';

interface DebugOverlayProps {
  isVisible?: boolean;
}

interface ToolCall {
  tool: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export const DebugOverlay: FunctionComponent<DebugOverlayProps> = ({ isVisible = false }) => {
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [conversationState, setConversationState] = useState<string>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    // Type-safe helper to get window property
    const getWindowProperty = (key: string): unknown => {
      try {
        return (window as unknown as Record<string, unknown>)[key];
      } catch (error) {
        console.warn(`Failed to access window.${key}:`, error);
        return undefined;
      }
    };

    // Validate and parse tool calls
    const validateToolCalls = (data: unknown): ToolCall[] => {
      if (!Array.isArray(data)) {
        console.warn('__toolCalls is not an array, using empty array as fallback');
        return [];
      }

      return data.filter((item): item is ToolCall => {
        if (typeof item !== 'object' || item === null) {
          console.warn('Invalid tool call item (not an object):', item);
          return false;
        }

        const call = item as Record<string, unknown>;
        const isValid = 
          typeof call.tool === 'string' &&
          typeof call.timestamp === 'number' &&
          call.data !== undefined;

        if (!isValid) {
          console.warn('Invalid tool call structure:', call);
        }

        return isValid;
      });
    };

    // Validate conversation state
    const validateConversationState = (data: unknown): string => {
      if (typeof data === 'string') {
        return data;
      }
      
      console.warn('__conversationState is not a string, using "unknown" as fallback:', data);
      return 'unknown';
    };

    // Centralized error handling
    const handleError = (context: string, error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error in ${context}:`, error);
      setError(`${context} error: ${errorMessage}`);
    };

    // Update tool calls from global variable
    const updateToolCalls = (): boolean => {
      try {
        const rawCalls = getWindowProperty('__toolCalls');
        const validatedCalls = validateToolCalls(rawCalls);
        setToolCalls(validatedCalls);
        return true;
      } catch (error) {
        handleError('Tool calls', error);
        setToolCalls([]);
        return false;
      }
    };

    // Update conversation state from global variable
    const updateConversationState = (): boolean => {
      try {
        const rawState = getWindowProperty('__conversationState');
        const validatedState = validateConversationState(rawState);
        setConversationState(validatedState);
        return true;
      } catch (error) {
        handleError('Conversation state', error);
        setConversationState('unknown');
        return false;
      }
    };

    // Centralized update function that handles both updates and error clearing
    const performUpdate = () => {
      const toolCallsSuccess = updateToolCalls();
      const conversationStateSuccess = updateConversationState();
      
      // Only clear errors and update timestamp if both updates succeed
      if (toolCallsSuccess && conversationStateSuccess) {
        setError(null);
        setLastUpdated(new Date());
      }
    };

    // Initial update
    performUpdate();

    // Set up interval to update
    const interval = setInterval(performUpdate, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't interfere with typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    if (event.key === 'Escape') {
      setIsExpanded(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsExpanded(!isExpanded);
    }
  }, [isExpanded]);

  // Add keyboard event listener when visible
  useEffect(() => {
    if (!isVisible) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleKeyDown]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs font-mono max-w-sm z-50" 
      data-testid="debug-overlay"
      role="region"
      aria-label="Debug information overlay"
      aria-live="polite"
      aria-expanded={isExpanded}
    >
      <div className="mb-2 flex justify-between items-center">
        <strong>Debug Overlay</strong>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded px-1"
          aria-label={isExpanded ? 'Collapse debug overlay' : 'Expand debug overlay'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      
      {error && (
        <div className="mb-2 p-2 bg-red-600 bg-opacity-50 rounded border border-red-400" role="alert" aria-live="assertive">
          <div className="text-red-200 font-semibold">Error:</div>
          <div className="text-red-100 text-xs">{error}</div>
        </div>
      )}
      
      <div className="mb-2">
        <div><strong>Conversation State:</strong> <span aria-label={`Current conversation state is ${conversationState}`}>{conversationState}</span></div>
      </div>
      
      <div className="mb-2">
        <div><strong>Tool Calls ({toolCalls.length}):</strong></div>
        {toolCalls.length === 0 ? (
          <div className="text-gray-400" aria-label="No tool calls have been detected">No tool calls detected</div>
        ) : (
          <div className="max-h-32 overflow-y-auto" role="list" aria-label="List of tool calls">
            {toolCalls.map((call, index) => (
              <div 
                key={index} 
                className="text-green-400" 
                role="listitem"
                aria-label={`Tool call ${index + 1}: ${call.tool} at ${new Date(call.timestamp).toLocaleTimeString()}`}
              >
                {call.tool} ({new Date(call.timestamp).toLocaleTimeString()})
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-400" aria-label={lastUpdated ? `Last updated at ${lastUpdated.toLocaleTimeString()}` : 'No successful updates yet'}>
        Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
      </div>
      
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-gray-600" role="region" aria-label="Additional debug information">
          <div className="text-xs text-gray-300">
            <div>Press <kbd className="bg-gray-700 px-1 rounded">Esc</kbd> to collapse</div>
            <div>Press <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> or <kbd className="bg-gray-700 px-1 rounded">Space</kbd> to toggle</div>
          </div>
        </div>
      )}
    </div>
  );
};
