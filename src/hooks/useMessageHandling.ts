import { useState, useCallback } from 'preact/hooks';
import { ChatMessageUI } from '../../worker/types';
import { getAgentStreamEndpoint } from '../config/api';

interface UseMessageHandlingOptions {
  teamId: string;
  sessionId: string;
  onError?: (error: string) => void;
}

export const useMessageHandling = ({ teamId, sessionId, onError }: UseMessageHandlingOptions) => {
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);

  // Create message history from existing messages
  const createMessageHistory = useCallback((messages: ChatMessageUI[], currentMessage?: string) => {
    const history = messages.map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
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
    messageHistory: any[], 
    placeholderId: string
  ) => {
    const apiEndpoint = getAgentStreamEndpoint();
    
    // Create the request body
    const requestBody = {
      messages: messageHistory,
      teamId: teamId,
      sessionId: sessionId
    };

    try {
      // Use fetch with POST to send the request and get the stream
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
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
          
          // Process complete SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix
                
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
                        isLoading: false 
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
    try {
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
      
      // Try streaming - if it fails, show a clean error message
      try {
        await sendMessageWithStreaming(messageHistory, placeholderId);
      } catch (streamingError) {
        console.warn('Streaming failed:', streamingError);
        
        // Show a clean error message instead of trying regular API
        setMessages(prev => prev.map(msg => 
          msg.id === placeholderId ? { 
            ...msg, 
            content: "I'm having trouble connecting to our AI service right now. Please try again in a moment, or contact us directly if the issue persists.",
            isLoading: false 
          } : msg
        ));
        
        onError?.('AI service connection failed');
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update placeholder with error message using the existing placeholderId
      setMessages(prev => prev.map(msg => 
        msg.id === placeholderId ? { 
          ...msg, 
          content: "I'm having trouble connecting to our AI service right now. Please try again in a moment.",
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

  return {
    messages,
    sendMessage,
    addMessage,
    updateMessage,
    clearMessages,
    setMessages
  };
}; 