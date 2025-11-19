import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { knowtedAPI } from '../api/generated/knowtedAPI';
import { AgentEvent, AgentState, useAgentEvents } from './useAgentEvents';

interface StreamingAgentOptions {
  onEvent?: (event: AgentEvent) => void;
  onStateChange?: (state: AgentState) => void;
  onComplete?: (response: any) => void;
  onError?: (error: string) => void;
}

export function useStreamingAgent(options: StreamingAgentOptions = {}) {
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalResponse, setFinalResponse] = useState<any>(null);

  // Get auth token (you'll need to adapt this to your auth system)
  const token = localStorage.getItem('supabase_token') || '';

  const {
    isConnected,
    events,
    currentState,
    todos,
    clearEvents,
    getEventsByType,
    getProgress,
    getCurrentTask,
    getCompletedTodos,
    getPendingTodos,
  } = useAgentEvents({
    threadId: currentThreadId,
    token,
    onEvent: (event) => {
      options.onEvent?.(event);
      
      // Handle completion
      if (event.type === 'agent_completed') {
        setIsProcessing(false);
        options.onComplete?.(event.data);
      } else if (event.type === 'agent_failed') {
        setIsProcessing(false);
        options.onError?.(event.error || 'Agent processing failed');
      }
    },
    onStateChange: options.onStateChange,
    onError: options.onError,
  });

  const streamingMutation = useMutation({
    mutationFn: async (params: {
      message: string;
      threadId: string;
      contactId: string;
    }) => {
      // Start the streaming agent
      return await knowtedAPI.post('/ai-agents/chat/streaming', params);
    },
    onSuccess: (response) => {
      setFinalResponse(response.data);
      // The real-time events will handle the streaming updates
    },
    onError: (error: any) => {
      setIsProcessing(false);
      options.onError?.(error.message || 'Failed to start agent');
    },
  });

  const startAgent = async (message: string, threadId?: string, contactId?: string) => {
    // Best practice: Do NOT generate thread IDs in the frontend
    // If threadId is not provided, pass undefined and let the backend/LangGraph generate it
    // The backend will create a thread and return the generated thread ID
    if (!threadId) {
      console.warn('startAgent called without threadId - backend will generate one');
    }
    
    const finalContactId = contactId || 'default';

    // Only set threadId if it was provided - otherwise wait for backend to generate it
    if (threadId) {
      setCurrentThreadId(threadId);
    }
    setIsProcessing(true);
    setFinalResponse(null);
    clearEvents();

    // Start the streaming mutation
    // Pass undefined for threadId if not provided - backend will handle thread creation
    await streamingMutation.mutateAsync({
      message,
      threadId: threadId || undefined, // Explicitly pass undefined, not a generated ID
      contactId: finalContactId,
    });
  };

  const cancelAgent = async () => {
    if (currentThreadId) {
      try {
        await knowtedAPI.post(`/ai-agents/cancel/${currentThreadId}`);
        setIsProcessing(false);
      } catch (error) {
        console.error('Failed to cancel agent:', error);
      }
    }
  };

  // Get specific event types for UI display
  const thinkingEvents = getEventsByType('agent_thinking');
  const toolEvents = getEventsByType('tool_started');
  const completedToolEvents = getEventsByType('tool_completed');
  const researchEvents = getEventsByType('research_findings');
  const todoEvents = getEventsByType('todos_updated');

  const currentThought = thinkingEvents[thinkingEvents.length - 1]?.message;
  const activeTools = currentState?.activeTools || [];
  const progress = getProgress();
  const currentTask = getCurrentTask();

  return {
    // Connection status
    isConnected,
    isProcessing,
    
    // Agent control
    startAgent,
    cancelAgent,
    
    // Current state
    currentState,
    currentThreadId,
    progress,
    currentThought,
    activeTools,
    
    // Todo management
    todos,
    currentTask,
    completedTodos: getCompletedTodos(),
    pendingTodos: getPendingTodos(),
    
    // Events
    events,
    thinkingEvents,
    toolEvents,
    completedToolEvents,
    researchEvents,
    todoEvents,
    
    // Response
    finalResponse,
    
    // Utilities
    clearEvents,
  };
}
