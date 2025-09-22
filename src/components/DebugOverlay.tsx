import { FunctionComponent, useEffect, useState } from 'preact/hooks';

interface DebugOverlayProps {
  isVisible?: boolean;
}

interface ToolCall {
  tool: string;
  timestamp: number;
  data: any;
}

export const DebugOverlay: FunctionComponent<DebugOverlayProps> = ({ isVisible = false }) => {
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [conversationState, setConversationState] = useState<string>('unknown');

  useEffect(() => {
    if (!isVisible) return;

    // Update tool calls from global variable
    const updateToolCalls = () => {
      const calls = (window as any).__toolCalls || [];
      setToolCalls(calls);
    };

    // Update conversation state from global variable
    const updateConversationState = () => {
      const state = (window as any).__conversationState || 'unknown';
      setConversationState(state);
    };

    // Initial update
    updateToolCalls();
    updateConversationState();

    // Set up interval to update
    const interval = setInterval(() => {
      updateToolCalls();
      updateConversationState();
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs font-mono max-w-sm z-50" data-testid="debug-overlay">
      <div className="mb-2">
        <strong>Debug Overlay</strong>
      </div>
      
      <div className="mb-2">
        <div><strong>Conversation State:</strong> {conversationState}</div>
      </div>
      
      <div className="mb-2">
        <div><strong>Tool Calls ({toolCalls.length}):</strong></div>
        {toolCalls.length === 0 ? (
          <div className="text-gray-400">No tool calls detected</div>
        ) : (
          <div className="max-h-32 overflow-y-auto">
            {toolCalls.map((call, index) => (
              <div key={index} className="text-green-400">
                {call.tool} ({new Date(call.timestamp).toLocaleTimeString()})
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-400">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};
