import { useState, useEffect, useCallback } from 'preact/hooks';

interface Conversation {
  id: string;
  sessionId: string;
  title: string;
  preview: string;
  messageCount: number;
  fileCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
}

interface UseConversationListOptions {
  teamId: string | null;
  enabled?: boolean;
}

interface UseConversationListReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createNewConversation: () => Promise<string | null>;
}

export const useConversationList = ({ 
  teamId, 
  enabled = true 
}: UseConversationListOptions): UseConversationListReturn => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!teamId || !enabled) {
      console.log('🔍 useConversationList: Not fetching - teamId:', teamId, 'enabled:', enabled);
      setConversations([]);
      return;
    }

    console.log('🔍 useConversationList: Fetching conversations for teamId:', teamId);
    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/sessions/conversations/${teamId}`;
      console.log('🔍 useConversationList: Making request to:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🔍 useConversationList: API response:', result);
      
      if (result.success && result.data?.conversations) {
        setConversations(result.data.conversations);
        console.log('✅ Loaded conversations:', result.data.conversations.length, 'conversations:', result.data.conversations);
      } else {
        console.log('⚠️ useConversationList: No conversations in response or unsuccessful');
        setConversations([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
      console.error('❌ Error fetching conversations:', err);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, enabled]);

  const createNewConversation = useCallback(async (): Promise<string | null> => {
    if (!teamId) return null;

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamId: teamId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data?.sessionId) {
        console.log('✅ Created new conversation:', result.data.sessionId);
        // Refresh the conversation list
        await fetchConversations();
        return result.data.sessionId;
      } else {
        throw new Error(result.error || 'Failed to create conversation');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      console.error('Error creating conversation:', err);
      return null;
    }
  }, [teamId, fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
    createNewConversation
  };
};
