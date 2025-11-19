import { cn } from '@/lib/utils';
import type { StreamState } from '@langchain/langgraph-sdk/react';
import React from 'react';
import { AIMessage } from './AIMessage';
import { HumanMessage } from './HumanMessage';
import type { ExtendedMessage } from './types';

interface ChatMessageProps {
  message: ExtendedMessage;
  messageIndex: number;
  isLastAiMessage: boolean;
  isStreaming: boolean;
  isLoading: boolean;
  editingMessageId: string | number | null;
  editingMessageContent: string;
  uiValues?: unknown[];
  stream: StreamState<unknown>;
  sessionId?: string;
  getMeetingTypeName: (meetingTypeId: string | null) => string;
  langGraphComponents: Record<string, React.ComponentType<unknown>>;
  onCopy: (content: string) => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onRegenerate: (messageIndex: number) => void;
  onEdit: (messageId: string | number, content: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onContentChange: (content: string) => void;
  onRetry: (messageIndex: number) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  messageIndex,
  isLastAiMessage,
  isStreaming,
  isLoading,
  editingMessageId,
  editingMessageContent,
  uiValues,
  stream,
  sessionId,
  getMeetingTypeName,
  langGraphComponents,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  onRegenerate,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onContentChange,
  onRetry
}) => {
  const isLastMessage = message.message.role === 'ai' && isLastAiMessage;

  return (
    <div
      className={cn(
        'flex gap-3 transition-all duration-200',
        message.message.role === 'human' ? 'ml-auto flex-row-reverse justify-end' : 'mr-auto'
      )}
      style={message.message.role === 'human' ? { maxWidth: '80%' } : { width: '100%' }}
    >
      <div
        className={cn(
          'rounded-2xl transition-all duration-200',
          message.message.role === 'human' ? 'bg-background w-full' : 'w-full'
        )}
      >
        {message.message.role === 'ai' ? (
          <AIMessage
            message={message}
            isLastMessage={isLastMessage}
            isStreaming={isStreaming}
            isLoading={isLoading}
            uiValues={uiValues}
            stream={stream}
            sessionId={sessionId}
            getMeetingTypeName={getMeetingTypeName}
            onCopy={onCopy}
            onThumbsUp={onThumbsUp}
            onThumbsDown={onThumbsDown}
            onRegenerate={() => onRegenerate(messageIndex)}
            langGraphComponents={langGraphComponents}
          />
        ) : (
          <div className="group relative">
            <HumanMessage
              message={message}
              isEditing={editingMessageId === message.id}
              editingContent={editingMessageContent}
              isLoading={isLoading}
              onEdit={onEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onContentChange={onContentChange}
              onRetry={() => onRetry(messageIndex)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

