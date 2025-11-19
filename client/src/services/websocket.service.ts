import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';

export interface AIAgentResponse {
  output: string;
  references?: {
    type: 'meeting' | 'knowledge_base' | 'meeting_type' | 'report_type';
    id: string;
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
    relevance?: number;
    source?: string;
  }[];
  toolCalls?: {
    toolName: string;
    input: unknown;
    output: unknown;
  }[];
  knowledgeBaseUsed?: boolean;
  appointmentBooked?: boolean;
}

export interface AIAgentResponseArray {
  responses: AIAgentResponse[];
  isComplete: boolean;
  sessionId: string;
  conversationId: string;
}

import type { MeetingResponseDto } from '@/api/generated/models';

export interface SendMessageData {
  message: string;
  sessionId: string;
  systemPrompt?: string;
  selectedMeetings?: MeetingResponseDto[];
  userId: string;
  organizationId: string;
}

export interface MessageResponse {
  success: boolean;
  message: string;
  sessionId: string;
  isNewSession?: boolean;
}

export interface SessionCreatedResponse {
  oldSessionId: string;
  newSessionId: string;
  session: {
    id: string;
    title: string;
    created_at: string;
  };
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 20000,
      forceNew: true
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) {
      return;
    }

    this.socket.on('connect', () => {
            this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
            this.isConnected = false;

      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Failed to connect to real-time service');
      }
    });

    this.socket.on('reconnect', () => {
            this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  public joinSession(sessionId: string): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
                resolve({ success: false });
        return;
      }

            this.socket.emit('join-session', sessionId, (response: { success: boolean }) => {
                resolve(response);
      });
    });
  }

  public leaveSession(sessionId: string): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve({ success: false });
        return;
      }

            this.socket.emit('leave-session', sessionId, (response: { success: boolean }) => {
                resolve(response);
      });
    });
  }

  public sendMessage(data: SendMessageData): Promise<MessageResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.warn('Sending message via WebSocket:', data.message.substring(0, 50));

      // Set up one-time listeners for this message
      const messageReceivedHandler = (response: MessageResponse): void => {
        if (response.sessionId === data.sessionId) {
          this.socket?.off('message-received', messageReceivedHandler);
          this.socket?.off('message-error', messageErrorHandler);
          resolve(response);
        }
      };

      const messageErrorHandler = (error: { sessionId: string; error?: string }): void => {
        if (error.sessionId === data.sessionId) {
          this.socket?.off('message-received', messageReceivedHandler);
          this.socket?.off('message-error', messageErrorHandler);
          reject(new Error(error.error || 'Failed to send message'));
        }
      };

      this.socket.on('message-received', messageReceivedHandler);
      this.socket.on('message-error', messageErrorHandler);

      // Send the message
      this.socket.emit('send-message', data);
    });
  }

  public onAIAgentResponse(callback: (response: AIAgentResponseArray) => void): void {
    if (!this.socket) {return;}

        this.socket.on('ai-response', callback);
  }

  public offAIAgentResponse(callback: (response: AIAgentResponseArray) => void): void {
    if (!this.socket) {return;}

        this.socket.off('ai-response', callback);
  }

  public onSessionCreated(callback: (response: SessionCreatedResponse) => void): void {
    if (!this.socket) {return;}

        this.socket.on('session-created', callback);
  }

  public offSessionCreated(callback: (response: SessionCreatedResponse) => void): void {
    if (!this.socket) {return;}

        this.socket.off('session-created', callback);
  }

  public disconnect(): void {
    if (this.socket) {
            this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public isSocketConnected(): boolean {
    return this.isConnected;
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();
