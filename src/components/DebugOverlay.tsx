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

    // Update tool calls from global variable
    const updateToolCalls = () => {
      try {
        setError(null);
        const rawCalls = getWindowProperty('__toolCalls');
        const validatedCalls = validateToolCalls(rawCalls);
        setToolCalls(validatedCalls);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error updating tool calls:', error);
        setError(`Tool calls error: ${errorMessage}`);
        setToolCalls([]);
      }
    };

    // Update conversation state from global variable
    const updateConversationState = () => {
      try {
        setError(null);
        const rawState = getWindowProperty('__conversationState');
        const validatedState = validateConversationState(rawState);
        setConversationState(validatedState);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error updating conversation state:', error);
        setError(`Conversation state error: ${errorMessage}`);
        setConversationState('unknown');
      }
    };

    // Initial update
    updateToolCalls();
    updateConversationState();

    // Set up interval to update
    const interval = setInterval(() => {
      try {
        updateToolCalls();
        updateConversationState();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error in debug overlay update interval:', error);
        setError(`Update interval error: ${errorMessage}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
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
      
      <div className="text-xs text-gray-400" aria-label={`Last updated at ${new Date().toLocaleTimeString()}`}>
        Last updated: {new Date().toLocaleTimeString()}
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
