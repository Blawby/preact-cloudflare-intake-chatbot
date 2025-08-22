import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import { ChatMessageUI } from '../../worker/types';
// API endpoints - moved inline since api.ts was removed
const getAgentStreamEndpoint = () => '/api/agent';

// Define proper types for message history
interface ChatMessageHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

interface UseMessageHandlingOptions {
  teamId: string;
  sessionId: string;
  onError?: (error: string) => void;
}

export const useMessageHandling = ({ teamId, sessionId, onError }: UseMessageHandlingOptions) => {
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create message history from existing messages
  const createMessageHistory = useCallback((messages: ChatMessageUI[], currentMessage?: string): ChatMessageHistoryEntry[] => {
    const history = messages.map(msg => ({
      role: msg.isUser ? 'user' : 'assistant' as const,
      content: msg.content
    }));
    
    if (currentMessage) {
      history.push({
        role: 'user',
        content: currentMessage
      });
    }
    
    return history;
  }, []);

  // Streaming message handler using EventSource
  const sendMessageWithStreaming = useCallback(async (
    messageHistory: ChatMessageHistoryEntry[], 
    placeholderId: string,
    attachments: any[] = []
  ) => {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    const apiEndpoint = getAgentStreamEndpoint();
    
    // Create the request body
    const requestBody = {
      messages: messageHistory,
      teamId: teamId,
      sessionId: sessionId,
      attachments: attachments
    };

    try {
      // Use fetch with POST to send the request and get the stream
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Streaming API error: ${response.status}`);
      }

      // Get the response body as a readable stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete SSE events (separated by double newlines)
          const events = buffer.split('\n\n');
          buffer = events.pop() || ''; // Keep incomplete event in buffer
          
          for (const event of events) {
            // Collect all data lines in this event
            const dataLines = event.split('\n').filter(line => line.startsWith('data: '));
            if (dataLines.length > 0) {
              try {
                // Concatenate all data lines with newline separators
                const combinedData = dataLines.map(line => line.slice(6)).join('\n');
                const data = JSON.parse(combinedData);
                
                switch (data.type) {
                  case 'connected':
                    // Connection established, start showing typing indicator
                    setMessages(prev => prev.map(msg => 
                      msg.id === placeholderId ? { 
                        ...msg, 
                        content: 'AI is thinking...',
                        isLoading: true 
                      } : msg
                    ));
                    break;
                    
                  case 'text':
                    // Add text chunk to current content
                    currentContent += data.text;
                    setMessages(prev => prev.map(msg => 
                      msg.id === placeholderId ? { 
                        ...msg, 
                        content: currentContent,
                        isLoading: true 
                      } : msg
                    ));
                    break;
                    
                  case 'typing':
                    // Show typing indicator during tool calls
                    setMessages(prev => prev.map(msg => 
                      msg.id === placeholderId ? { 
                        ...msg, 
                        content: currentContent + '...',
                        isLoading: true 
                      } : msg
                    ));
                    break;
                    
                  case 'tool_call':
                    // Tool call detected, show processing message
                    setMessages(prev => prev.map(msg => 
                      msg.id === placeholderId ? { 
                        ...msg, 
                        content: currentContent + '\n\nProcessing your request...',
                        isLoading: true 
                      } : msg
                    ));
                    break;
                    
                  case 'tool_result':
                    // Tool result received, update content
                    if (data.result && data.result.message) {
                      currentContent = data.result.message;
                      
                      // Extract payment embed data from streaming response
                      const paymentEmbed = data.result?.data?.payment_embed;
                      
                      if (paymentEmbed) {
                        console.log('Payment embed data received via streaming');
                      }
                      
                      setMessages(prev => prev.map(msg => 
                        msg.id === placeholderId ? { 
                          ...msg, 
                          content: currentContent,
                          paymentEmbed: paymentEmbed || undefined,
                          isLoading: false 
                        } : msg
                      ));
                    }
                    break;
                    
                  case 'final':
                    // Final response received
                    setMessages(prev => prev.map(msg => 
                      msg.id === placeholderId ? { 
                        ...msg, 
                        content: data.response || currentContent,
                        isLoading: false 
                      } : msg
                    ));
                    break;
                    
                  case 'error':
                    // Error occurred
                    setMessages(prev => prev.map(msg => 
                      msg.id === placeholderId ? { 
                        ...msg, 
                        content: data.message || 'An error occurred while processing your request.',
                        isLoading: false 
                      } : msg
                    ));
                    break;
                    
                  case 'security_block':
                    // Security block
                    setMessages(prev => prev.map(msg => 
                      msg.id === placeholderId ? { 
                        ...msg, 
                        content: data.response || 'This request was blocked for security reasons.',
                        isLoading: false 
                      } : msg
                    ));
                    break;
                    
                  case 'complete':
                    // Stream completed
                    setMessages(prev => prev.map(msg => 
                      msg.id === placeholderId ? { 
                        ...msg, 
                        isLoading: false 
                      } : msg
                    ));
                    break;
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }
  }, [teamId, sessionId]);

  // Main message sending function
  const sendMessage = useCallback(async (message: string, attachments: any[] = []) => {
    // Create user message
    const userMessage: ChatMessageUI = {
      id: crypto.randomUUID(),
      content: message,
      isUser: true,
      role: 'user',
      timestamp: Date.now(),
      files: attachments
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Add a placeholder AI message immediately that will be updated
    const placeholderId = Date.now().toString();
    const placeholderMessage: ChatMessageUI = {
      id: placeholderId,
      content: '',
      isUser: false,
      role: 'assistant',
      timestamp: Date.now(),
      isLoading: true
    };
    
    setMessages(prev => [...prev, placeholderMessage]);
    
    // Create message history from existing messages
    const messageHistory = createMessageHistory(messages, message);
    
    try {
      // Try streaming - if it fails, show a clean error message
      await sendMessageWithStreaming(messageHistory, placeholderId, attachments);
    } catch (error) {
      // Check if this is an AbortError (user cancelled request)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was cancelled by user');
        return; // Don't show error message for user-initiated cancellation
      }
      
      console.error('Error sending message:', error);
      
      // Update placeholder with error message using the existing placeholderId
      setMessages(prev => prev.map(msg => 
        msg.id === placeholderId ? { 
          ...msg, 
          content: "I'm having trouble connecting to our AI service right now. Please try again in a moment, or contact us directly if the issue persists.",
          isLoading: false 
        } : msg
      ));
      
      onError?.(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }, [messages, teamId, sessionId, createMessageHistory, sendMessageWithStreaming, onError]);

  // Add message to the list
  const addMessage = useCallback((message: ChatMessageUI) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Update a specific message
  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessageUI>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Cancel any ongoing streaming request
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    sendMessage,
    addMessage,
    updateMessage,
    clearMessages,
    cancelStreaming
  };
}; 