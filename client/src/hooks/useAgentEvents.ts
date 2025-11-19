import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Todo {
  id?: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt?: string;
  updatedAt?: string;
  agentType?: 'main' | 'research-agent' | 'critique-agent';
}

export interface AgentEvent {
  type: 'agent_started' | 'agent_thinking' | 'tool_started' | 'tool_completed' | 'tool_failed' | 'research_findings' | 'todos_updated' | 'agent_completed' | 'agent_failed';
  timestamp: string;
  threadId: string;
  agentType: 'main' | 'research-agent' | 'critique-agent';
  message?: string;
  data?: any;
  progress?: number;
  error?: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  executionTimeMs?: number;
  // Todo-specific properties
  todos?: Todo[];
  addedTodos?: Todo[];
  updatedTodos?: Todo[];
  completedTodos?: Todo[];
}

export interface AgentState {
  threadId: string;
  currentAgent: string;
  isActive: boolean;
  startedAt: string;
  completedAt?: string;
  totalSteps: number;
  completedSteps: number;
  activeTools: string[];
  currentThought?: string;
  accumulatedFindings: any[];
}

interface UseAgentEventsOptions {
  threadId: string;
  token: string;
  onEvent?: (event: AgentEvent) => void;
  onStateChange?: (state: AgentState) => void;
  onError?: (error: string) => void;
}

export function useAgentEvents({
  threadId,
  token,
  onEvent,
  onStateChange,
  onError,
}: UseAgentEventsOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [currentState, setCurrentState] = useState<AgentState | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!threadId || !token) return;

    // Initialize WebSocket connection
    const socket = io(`${import.meta.env.VITE_API_URL}/agent-events`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
            setIsConnected(true);
      
      // Subscribe to the specific thread
      socket.emit('subscribe_to_thread', { threadId });
    });

    socket.on('disconnect', () => {
            setIsConnected(false);
    });

    socket.on('agent_event', (event: AgentEvent) => {
            
      setEvents(prev => [...prev, event]);
      onEvent?.(event);

      // Update state based on event
      if (event.type === 'agent_started') {
        setCurrentState(prev => ({
          ...prev,
          threadId: event.threadId,
          currentAgent: event.agentType,
          isActive: true,
          startedAt: event.timestamp,
          totalSteps: 0,
          completedSteps: 0,
          activeTools: [],
          accumulatedFindings: [],
        }));
      } else if (event.type === 'agent_thinking') {
        setCurrentState(prev => prev ? {
          ...prev,
          currentThought: event.message,
        } : null);
      } else if (event.type === 'tool_started') {
        setCurrentState(prev => prev ? {
          ...prev,
          activeTools: [...prev.activeTools, event.toolName || 'unknown'],
          totalSteps: prev.totalSteps + 1,
        } : null);
      } else if (event.type === 'tool_completed') {
        setCurrentState(prev => prev ? {
          ...prev,
          activeTools: prev.activeTools.filter(tool => tool !== event.toolName),
          completedSteps: prev.completedSteps + 1,
        } : null);
      } else if (event.type === 'todos_updated') {
        if (event.todos) {
          setTodos(event.todos);
        }
        setCurrentState(prev => prev ? {
          ...prev,
          // You could add a todos field to AgentState if needed
        } : null);
      } else if (event.type === 'agent_completed' || event.type === 'agent_failed') {
        setCurrentState(prev => prev ? {
          ...prev,
          isActive: false,
          completedAt: event.timestamp,
        } : null);
      }
    });

    socket.on('auth_error', (error: any) => {
      console.error('Authentication error:', error);
      onError?.(error.message);
    });

    socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      onError?.(error.message || 'Connection error');
    });

    return () => {
      socket.emit('unsubscribe_from_thread', { threadId });
      socket.disconnect();
    };
  }, [threadId, token]);

  // Call onStateChange when state changes
  useEffect(() => {
    if (currentState) {
      onStateChange?.(currentState);
    }
  }, [currentState, onStateChange]);

  const clearEvents = () => {
    setEvents([]);
  };

  const getEventsByType = (type: AgentEvent['type']) => {
    return events.filter(event => event.type === type);
  };

  const getProgress = () => {
    if (!currentState) return 0;
    if (currentState.totalSteps === 0) return 0;
    return Math.round((currentState.completedSteps / currentState.totalSteps) * 100);
  };

  const getCurrentTask = () => {
    return todos.find(todo => todo.status === 'in_progress') || null;
  };

  const getCompletedTodos = () => {
    return todos.filter(todo => todo.status === 'completed');
  };

  const getPendingTodos = () => {
    return todos.filter(todo => todo.status === 'pending');
  };

  return {
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
    socket: socketRef.current,
  };
}
