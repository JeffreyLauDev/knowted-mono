import { LoadExternalComponent } from '@langchain/langgraph-sdk/react-ui';
import type { StreamState } from '@langchain/langgraph-sdk/react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { MessageActionButtons } from './MessageActionButtons';
import ReferencesDisplay from './ReferencesDisplay';
import type { ExtendedMessage } from './types';

interface AIMessageProps {
  message: ExtendedMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
  isLoading: boolean;
  uiValues?: unknown[];
  stream: StreamState<unknown>;
  sessionId?: string;
  getMeetingTypeName: (meetingTypeId: string | null) => string;
  onCopy: (content: string) => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onRegenerate: () => void;
  langGraphComponents: Record<string, React.ComponentType<unknown>>;
}

export const AIMessage: React.FC<AIMessageProps> = ({
  message,
  isLastMessage,
  isStreaming,
  isLoading,
  uiValues,
  stream,
  sessionId,
  getMeetingTypeName,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  onRegenerate,
  langGraphComponents
}) => {
  return (
    <div className="space-y-3 prose-light-mode group">
      {/* Display tool calls as "thinking" indicators */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="space-y-1 mb-2">
          {message.toolCalls.map((toolCall, idx) => (
            <div key={toolCall.id || idx} className="text-xs text-gray-400 font-normal italic">
              {toolCall.name.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}...
            </div>
          ))}
        </div>
      )}
      {message.message.content && (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          className="prose markdown markdown-new-styling w-full break-words"
        >
          {String(message.message.content)}
        </ReactMarkdown>
      )}

      {uiValues
        ?.filter(
          (ui: { metadata?: { message_id?: string }; id?: string }) =>
            ui.metadata?.message_id === message.id
        )
        .map((ui: unknown) => (
          <div key={(ui as { id?: string }).id} className="mt-4">
            <LoadExternalComponent
              stream={stream}
              message={ui as Parameters<typeof LoadExternalComponent>[0]['message']}
              components={langGraphComponents}
              fallback={<div className="animate-pulse">Loading component...</div>}
              meta={{ getMeetingTypeName }}
            />
          </div>
        ))}

      {message.reference && message.reference.length > 0 && (
        <ReferencesDisplay references={message.reference} sessionId={sessionId} />
      )}

      {/* Action buttons - only show when there are no tool calls */}
      {(!message.toolCalls || message.toolCalls.length === 0) && (
        <MessageActionButtons
          content={String(message.message.content || '')}
          isLastMessage={isLastMessage}
          isStreaming={isStreaming || false}
          isLoading={isLoading}
          onCopy={onCopy}
          onThumbsUp={onThumbsUp}
          onThumbsDown={onThumbsDown}
          onRegenerate={onRegenerate}
        />
      )}
    </div>
  );
};

