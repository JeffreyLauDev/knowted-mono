import type { MeetingResponseDto } from '@/api/generated/models';

export interface SendMessageRequest {
  message: string;
  sessionId: string;
  systemPrompt?: string;
  selectedMeetings?: MeetingResponseDto[];
}

export interface AIResponse {
  output: string;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  sessionId: string;
}

export interface AIAgentResponseArray {
  responses: AIResponse[];
  isComplete: boolean;
  sessionId: string;
  conversationId: string;
}

// Note: This service is kept for compatibility but the actual messaging
// is handled through WebSocket in the MeetingAIChat component
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const sendMessageToAIAgent = async (_request: SendMessageRequest): Promise<SendMessageResponse> => {
  // This function is deprecated - use WebSocket instead
  throw new Error('Use WebSocket for real-time messaging instead of this API endpoint');
};
