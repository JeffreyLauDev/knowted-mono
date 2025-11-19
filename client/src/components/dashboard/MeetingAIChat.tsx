import {
  useMeetingTypesControllerFindAll
} from '@/api/generated/knowtedAPI';
import type {
  MeetingListResponseDto,
  MeetingTypeResponse,
  MessageContentDto
} from '@/api/generated/models';
import { MessageContentDtoRole } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/integrations/api/client';
import { cn } from '@/lib/utils';
import type { Message } from '@langchain/langgraph-sdk';
import { useStream } from '@langchain/langgraph-sdk/react';
import { LoadExternalComponent } from '@langchain/langgraph-sdk/react-ui';
import { ChevronDown, Copy, Edit, MoreVertical, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useParams } from 'react-router-dom';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import ChatInput, { type FileAttachment } from './chat/ChatInput';
import FeedbackModal, { type FeedbackType } from './chat/FeedbackModal';
import { langGraphComponents } from './chat/LangGraphComponents';
import ReferencesDisplay from './chat/ReferencesDisplay';
import './MeetingAIChat.css';

interface MeetingAIChatProps {
  meetings: MeetingListResponseDto[];
  selectedMeetingId?: string;
  className?: string;
}

interface ExtendedMessage {
  id: string | number;
  message: MessageContentDto;
  session_id?: string;
  reference?: {
    type: 'meeting' | 'knowledge_base' | 'meeting_type' | 'report_type';
    id: string;
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
    relevance?: number;
    source?: string;
  }[];
  toolCalls?: { name: string; id?: string }[];
  isStreaming?: boolean;
  isNew?: boolean;
}

const MeetingAIChat: React.FC<MeetingAIChatProps> = ({
  meetings,
  selectedMeetingId,
  className
}) => {
  const { user, organization, accessToken } = useAuth();
  const { sessionId, meetingId: urlMeetingId } = useParams<{ sessionId?: string; meetingId?: string }>();
  const navigate = useNavigate();

  // Use selectedMeetingId prop or extract from URL params
  const currentMeetingId = selectedMeetingId || urlMeetingId;
  const currentMeetingIdRef = useRef(currentMeetingId);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Keep ref in sync with currentMeetingId
  useEffect(() => {
    currentMeetingIdRef.current = currentMeetingId;
  }, [currentMeetingId]);

  const { data: meetingTypes = [] } = useMeetingTypesControllerFindAll<MeetingTypeResponse[]>(
    {
      organization_id: organization?.id || ''
    },
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );

  const getMeetingTypeName = useCallback((meetingTypeId: string | null): string => {
    if (!meetingTypeId) {return 'Unknown Type';}
    const meetingType = meetingTypes.find((type) => type.id === meetingTypeId);
    return meetingType?.name || 'Unknown Type';
  }, [meetingTypes]);

  useEffect(() => {
    const originalFetch = window.fetch;
    const currentToken = accessToken;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes('/api/v1/langgraph')) {
        const headers = new Headers(init?.headers);
        if (currentToken) {
          headers.set('Authorization', `Bearer ${currentToken}`);
        }
        return originalFetch(input, { ...init, headers });
      }

      return originalFetch(input, init);
    };

    return (): void => {
      window.fetch = originalFetch;
    };
  }, [accessToken]);

  const langGraphThread = useStream<{ messages: Message[]; ui?: unknown[] }>({
    apiUrl: `${apiUrl}/api/v1/langgraph`,
    assistantId: 'knowted_agent',
    threadId: sessionId || undefined,
    messagesKey: 'messages' as const,
    onThreadId: (newThreadId: string) => {
      if (newThreadId) {
        // Preserve meeting ID in URL if present (use ref to get latest value)
        const meetingId = currentMeetingIdRef.current;
        const meetingPath = meetingId ? `/meetings/${meetingId}` : '';
        navigate(`/dashboard/sessions/${newThreadId}${meetingPath}`, { replace: true });
      }
    },
    onError: (error: Error) => {
      let errorMessage = 'Unknown error';
      try {
        if (error && typeof error === 'object') {
          errorMessage = error.message || error.toString() || 'Unknown error';
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
      } catch {
        errorMessage = 'Failed to connect to AI agent';
      }

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
        toast.error('Cannot connect to AI agent. Please ensure the LangGraph server is running.');
      } else if (errorMessage.includes('404')) {
        toast.error('AI agent endpoint not found. Please check the configuration.');
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        toast.error('Authentication failed. Please try logging in again.');
      } else if (errorMessage.includes('circular structure')) {
        toast.error('Connection error. Please check if the LangGraph server is running.');
      } else {
        const displayMessage = errorMessage.length > 100 ? `${errorMessage.substring(0, 100)}...` : errorMessage;
        toast.error(`Failed to connect to AI agent: ${displayMessage}`);
      }
    }
  });

  const [selectedMeetings, setSelectedMeetings] = useState<MeetingListResponseDto[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [combinedMessages, setCombinedMessages] = useState<ExtendedMessage[]>([]);

  // Feedback modal state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('thumbs_up');
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | number | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState('');

  // Find the last AI message without tool calls for UI display
  const lastAiMessageIndex = useMemo(() => {
    return combinedMessages
      .map((msg, idx) => ({ msg, idx }))
      .filter(({ msg }) => msg.message.role === 'ai' && (!msg.toolCalls || msg.toolCalls.length === 0))
      .pop()?.idx ?? -1;
  }, [combinedMessages]);

  useEffect(() => {
    if (langGraphThread.messages) {
      const converted: ExtendedMessage[] = langGraphThread.messages
        // Filter out tool result messages (we don't show raw tool results)
        .filter((msg: Message) => {
          // Skip tool result messages
          if (msg.type === 'tool') {
            return false;
          }
          return true;
        })
        .map((msg: Message) => {
          let content: string;
          const toolCallsMap = new Map<string, { name: string; id?: string }>();

          if (typeof msg.content === 'string') {
            content = msg.content;
          } else if (Array.isArray(msg.content)) {
            const textParts: string[] = [];
            msg.content.forEach((item: { text?: string; type?: string; name?: string; id?: string }) => {
              if (item.type === 'tool_use') {
                // Extract tool call information from content array
                const toolId = item.id || item.name || 'unknown';
                if (!toolCallsMap.has(toolId)) {
                  toolCallsMap.set(toolId, {
                  name: item.name || 'unknown_tool',
                  id: item.id
                });
                }
              } else if (typeof item === 'object' && item !== null && 'text' in item) {
                textParts.push(item.text || '');
              }
            });
            content = textParts.join('');
          } else {
            content = JSON.stringify(msg.content);
          }

          // Also check for tool_calls in the message object itself (preferred source)
          const messageWithToolCalls = msg as Message & { tool_calls?: { name?: string; id?: string }[] };
          if (msg.type === 'ai' && messageWithToolCalls.tool_calls && Array.isArray(messageWithToolCalls.tool_calls)) {
            messageWithToolCalls.tool_calls.forEach((toolCall: { name?: string; id?: string }) => {
              if (toolCall.name) {
                const toolId = toolCall.id || toolCall.name || 'unknown';
                // Prefer tool_calls array over content array (overwrite if exists)
                toolCallsMap.set(toolId, {
                  name: toolCall.name,
                  id: toolCall.id
                });
              }
            });
          }

          // Convert map to array, deduplicated by ID
          const toolCalls = Array.from(toolCallsMap.values());

          return {
            id: msg.id,
            message: {
              role: msg.type === 'human' ? MessageContentDtoRole.human : MessageContentDtoRole.ai,
              content,
              additional_kwargs: {},
              response_metadata: {}
            },
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            isStreaming: langGraphThread.isLoading && msg.type === 'ai' && msg.id === langGraphThread.messages[langGraphThread.messages.length - 1]?.id,
            isNew: false
          };
        });

      setCombinedMessages(converted);
    }
  }, [langGraphThread.messages, langGraphThread.isLoading]);

  const handleSessionCreated = useCallback(async (newSessionId: string): Promise<void> => {
    // Preserve meeting ID in URL if present
    const meetingPath = currentMeetingId ? `/meetings/${currentMeetingId}` : '';
    navigate(`/dashboard/sessions/${newSessionId}${meetingPath}`);
  }, [navigate, currentMeetingId]);

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const sendMessage = useCallback(
    async (msg: string, attachments?: FileAttachment[]): Promise<void> => {
      if (!user || !organization) {
        return;
      }

      try {
        // Build message content array for multimodal support
        // LangChain format: flat structure with type, base64, and mime_type at top level
        type ContentItem =
          | { type: 'text'; text: string }
          | { type: 'image'; base64: string; mime_type: string }
          | { type: 'file'; base64: string; mime_type: string }
          | { type: 'audio'; base64: string; mime_type: string }
          | { type: 'video'; base64: string; mime_type: string };

        const content: ContentItem[] = [];

        // Add text content if present
        if (msg.trim()) {
          content.push({ type: 'text', text: msg });
        }

        // Process attachments - files are converted to base64 and passed directly to agent
        // No storage needed, just pass through to LangGraph
        if (attachments && attachments.length > 0) {
          for (const attachment of attachments) {
            const base64 = await fileToBase64(attachment.file);
            const mimeType = attachment.file.type;

            switch (attachment.type) {
              case 'image':
                content.push({
                  type: 'image',
                  base64: base64,
                  mime_type: mimeType || 'image/jpeg'
                });
                break;
              case 'file':
                content.push({
                  type: 'file',
                  base64: base64,
                  mime_type: mimeType || 'application/pdf'
                });
                break;
              case 'audio':
                content.push({
                  type: 'audio',
                  base64: base64,
                  mime_type: mimeType || 'audio/mpeg'
                });
                break;
              case 'video':
                content.push({
                  type: 'video',
                  base64: base64,
                  mime_type: mimeType || 'video/mp4'
                });
                break;
            }
          }
        }

        // If no content at all, don't send
        if (content.length === 0) {
          toast.error('Please enter a message or attach a file');
          return;
        }

        // Format message content: if single text, use string; otherwise use array
        // LangGraph SDK accepts string or array of content items
        // Note: SDK types may not fully reflect multimodal support, but runtime accepts it
        const messageContent =
          content.length === 1 && content[0].type === 'text'
            ? content[0].text
            : content;

        langGraphThread.submit(
          { messages: [{ type: 'human' as const, content: messageContent as string | Message['content'] }] },
          {
            config: {
              configurable: {
                organization_id: organization.id,
                user_id: user.id,
                current_meeting_id: currentMeetingId || undefined
              }
            }
          }
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred while sending your message';
        toast.error(errorMessage);
      }
    },
    [langGraphThread, user, organization, fileToBase64, currentMeetingId]
  );

  const handleCopyMessage = useCallback(async (content: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Message copied to clipboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to copy message';
      toast.error(errorMessage);
    }
  }, []);

  const handleThumbsUp = useCallback((messageId: string | number): void => {
    setFeedbackType('thumbs_up');
    setFeedbackMessageId(messageId);
    setFeedbackModalOpen(true);
  }, []);

  const handleThumbsDown = useCallback((messageId: string | number): void => {
    setFeedbackType('thumbs_down');
    setFeedbackMessageId(messageId);
    setFeedbackModalOpen(true);
  }, []);

  const handleFeedbackSubmit = useCallback(async (feedback: {
    messageId: string | number;
    type: FeedbackType;
    issueType?: string;
    details?: string;
    correction?: string;
  }): Promise<void> => {
    if (!user || !organization || !sessionId) {
      toast.error('Cannot submit feedback: missing user or session information');
      return;
    }

    try {
      const response = (await apiClient.post(
        '/api/v1/ai-feedback',
        {
          message_id: String(feedback.messageId),
          thread_id: sessionId, // Using sessionId as thread_id
          type: feedback.type,
          issue_type: feedback.issueType || undefined,
          comment: feedback.details || undefined,
          correction: feedback.correction || undefined
        },
        {
          params: {
            organization_id: organization.id
          }
        }
      )) as {
        langsmith_feedback_id: string | null;
        success: boolean;
        message: string;
      };

      if (response.success) {
        toast.success('Thank you for your feedback! It has been sent to LangSmith.');
        setFeedbackModalOpen(false);
      } else {
        toast.warning(response.message || 'Feedback could not be sent to LangSmith. Check logs for details.');
        setFeedbackModalOpen(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit feedback';
      toast.error(errorMessage);
    }
  }, [user, organization, sessionId]);

  const handleRegenerate = useCallback(
    (messageIndex: number): void => {
      if (!user || !organization) {
        return;
      }

      // Find the AI message to regenerate
      const aiMessage = combinedMessages[messageIndex];
      if (!aiMessage || aiMessage.message.role !== 'ai') {
        toast.error('Can only regenerate AI messages');
        return;
      }

      // Find the corresponding message in langGraphThread.messages
      const langGraphMessage = langGraphThread.messages?.find(
        (msg) => msg.id === aiMessage.id
      );

      if (!langGraphMessage) {
        toast.error('Message not found in thread');
        return;
      }

      // Get metadata to find parent checkpoint
      const metadata = langGraphThread.getMessagesMetadata?.(langGraphMessage);
      const parentCheckpoint = metadata?.firstSeenState?.parent_checkpoint;

      if (!parentCheckpoint) {
        // Fallback: find the last human message and resend
        const previousMessages = combinedMessages.slice(0, messageIndex);
        const lastHumanMessage = [...previousMessages].reverse().find(
          (msg) => msg.message.role === 'human'
        );

        if (lastHumanMessage && typeof lastHumanMessage.message.content === 'string') {
          sendMessage(lastHumanMessage.message.content);
        } else {
          toast.error('No previous message found to regenerate');
        }
        return;
      }

      try {
        // Regenerate by submitting from parent checkpoint with no new messages
        langGraphThread.submit(
          undefined, // No new messages - just regenerate from checkpoint
          {
            checkpoint: parentCheckpoint,
            config: {
              configurable: {
                organization_id: organization.id,
                user_id: user.id,
                current_meeting_id: currentMeetingId || undefined
              }
            }
          }
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate';
        toast.error(errorMessage);
      }
    },
    [combinedMessages, langGraphThread, user, organization, sendMessage, currentMeetingId]
  );

  const handleRetryMessage = useCallback(
    (messageIndex: number): void => {
      if (!user || !organization) {
        return;
      }

      const message = combinedMessages[messageIndex];
      if (!message || message.message.role !== 'human') {
        toast.error('Can only retry human messages');
        return;
      }

      // Find the corresponding message in langGraphThread.messages
      const langGraphMessage = langGraphThread.messages?.find(
        (msg) => msg.id === message.id
      );

      if (!langGraphMessage) {
        toast.error('Message not found in thread');
        return;
      }

      // Get metadata to find parent checkpoint
      const metadata = langGraphThread.getMessagesMetadata?.(langGraphMessage);
      const parentCheckpoint = metadata?.firstSeenState?.parent_checkpoint;

      if (!parentCheckpoint) {
        // Fallback: just resend the message
        if (typeof message.message.content === 'string') {
          sendMessage(message.message.content);
        }
        return;
      }

      try {
        // Retry by resubmitting the message from parent checkpoint
        langGraphThread.submit(
          { messages: [{ type: 'human' as const, content: String(message.message.content) }] },
          {
            checkpoint: parentCheckpoint,
            config: {
              configurable: {
                organization_id: organization.id,
                user_id: user.id,
                current_meeting_id: currentMeetingId || undefined
              }
            }
          }
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to retry';
        toast.error(errorMessage);
      }
    },
    [combinedMessages, langGraphThread, user, organization, sendMessage, currentMeetingId]
  );

  const handleEditMessage = useCallback((messageId: string | number, currentContent: string): void => {
    setEditingMessageId(messageId);
    setEditingMessageContent(currentContent);
  }, []);

  const handleSaveEdit = useCallback((): void => {
    if (!editingMessageId || !editingMessageContent.trim() || !user || !organization) {
      return;
    }

    // Find the message being edited
    const message = combinedMessages.find((msg) => msg.id === editingMessageId);
    if (!message || message.message.role !== 'human') {
      toast.error('Can only edit human messages');
      setEditingMessageId(null);
      setEditingMessageContent('');
      return;
    }

    // Find the corresponding message in langGraphThread.messages
    const langGraphMessage = langGraphThread.messages?.find(
      (msg) => msg.id === editingMessageId
    );

    if (!langGraphMessage) {
      toast.error('Message not found in thread');
      setEditingMessageId(null);
      setEditingMessageContent('');
      return;
    }

    // Get metadata to find parent checkpoint
    const metadata = langGraphThread.getMessagesMetadata?.(langGraphMessage);
    const parentCheckpoint = metadata?.firstSeenState?.parent_checkpoint;

    if (!parentCheckpoint) {
      // Fallback: just send the edited message as a new message
      sendMessage(editingMessageContent.trim());
      setEditingMessageId(null);
      setEditingMessageContent('');
      return;
    }

    try {
      // Submit edited message from parent checkpoint to create a branch
      langGraphThread.submit(
        { messages: [{ type: 'human' as const, content: editingMessageContent.trim() }] },
        {
          checkpoint: parentCheckpoint,
          config: {
            configurable: {
              organization_id: organization.id,
              user_id: user.id,
              current_meeting_id: currentMeetingId || undefined
            }
          }
        }
      );
      setEditingMessageId(null);
      setEditingMessageContent('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save edit';
      toast.error(errorMessage);
    }
  }, [
    editingMessageId,
    editingMessageContent,
    combinedMessages,
    langGraphThread,
    user,
    organization,
    sendMessage,
    currentMeetingId
  ]);

  const handleCancelEdit = useCallback((): void => {
    setEditingMessageId(null);
    setEditingMessageContent('');
  }, []);

  const toggleSelectMode = (): void => {
    setIsSelectMode(!isSelectMode);
  };

  const scrollToBottom = useCallback((): void => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollContainer) {
        scrollContainer.style.scrollBehavior = 'smooth';
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        setTimeout(() => {
          if (scrollContainer) {
            scrollContainer.style.scrollBehavior = 'auto';
          }
        }, 500);
      }
    }
  }, []);

  useEffect(() => {
    if (combinedMessages.length > 0) {
      scrollToBottom();
    }
  }, [combinedMessages, scrollToBottom]);

  return (
    <div
      className={cn(
        'flex h-full bg-white dark:bg-background rounded-xl  min-w-0 py-8 mx-auto w-full',
        className
      )}
    >
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="flex-1 min-h-0 relative">
          <ScrollArea ref={scrollAreaRef} className="h-full max-h-[calc(100vh-200px)]">
            <div className="max-w-[48rem] mx-auto px-5">
            {(!sessionId || (combinedMessages.length === 0 && !langGraphThread.isLoading)) ? (
                     <div className="h-full flex items-center justify-center">
                     <div className="text-center space-y-8 max-w-2xl px-4 py-4">
                       <div className="flex justify-center">
                         <div className="relative">
                           <img
                             src="/logos/Knowted Logo - Stacked (Green)@1.5x@1.5x.png"
                             alt="Knowted Logo"
                             className="h-16 w-auto"
                           />
                           <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5 rounded-lg blur-sm transform translate-y-2 scale-95 -z-10"></div>
                         </div>
                       </div>

                       <div className="space-y-2">
                         <h3 className="text-2xl font-semibold text-foreground">Welcome to Knowted</h3>
                         <p className="text-muted-foreground text-lg">Start a conversation to explore insights from your meetings</p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                         <button
                           onClick={() => sendMessage('What were the key decisions made in my recent meetings?')}
                           className="p-4 rounded-lg border bg-card text-card-foreground transition-colors cursor-pointer text-left group"
                         >
                           <div className="flex items-start space-x-3">
                             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                               <span className="text-primary font-semibold text-sm">1</span>
                             </div>
                             <div>
                               <p className="font-medium mb-1">Key Decisions</p>
                               <p className="text-muted-foreground">What were the key decisions made in my recent meetings?</p>
                             </div>
                           </div>
                         </button>

                         <button
                           onClick={() => sendMessage('Show me all action items that need follow-up')}
                           className="p-4 rounded-lg border bg-card text-card-foreground transition-colors cursor-pointer text-left group"
                         >
                           <div className="flex items-start space-x-3">
                             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                               <span className="text-primary font-semibold text-sm">2</span>
                             </div>
                             <div>
                               <p className="font-medium mb-1">Action Items</p>
                               <p className="text-muted-foreground">Show me all action items that need follow-up</p>
                             </div>
                           </div>
                         </button>

                         <button
                           onClick={() => sendMessage('Summarize the main topics discussed in my meetings this week')}
                           className="p-4 rounded-lg border bg-card text-card-foreground transition-colors cursor-pointer text-left group"
                         >
                           <div className="flex items-start space-x-3">
                             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                               <span className="text-primary font-semibold text-sm">3</span>
                             </div>
                             <div>
                               <p className="font-medium mb-1">Weekly Summary</p>
                               <p className="text-muted-foreground">Summarize the main topics discussed in my meetings this week</p>
                             </div>
                           </div>
                         </button>

                         <button
                           onClick={() => sendMessage('What are the common themes across my team meetings?')}
                           className="p-4 rounded-lg border bg-card text-card-foreground transition-colors cursor-pointer text-left group"
                         >
                           <div className="flex items-start space-x-3">
                             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                               <span className="text-primary font-semibold text-sm">4</span>
                             </div>
                             <div>
                               <p className="font-medium mb-1">Common Themes</p>
                               <p className="text-muted-foreground">What are the common themes across my team meetings?</p>
                             </div>
                           </div>
                         </button>
                       </div>
                     </div>
                   </div>
            ) : combinedMessages.length > 0 || langGraphThread.isLoading ? (
              <div className="flex flex-col gap-4">
                {combinedMessages.map((message, messageIndex): JSX.Element => {
                  const isLastAiMessage = messageIndex === lastAiMessageIndex;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex gap-3 transition-all duration-200',
                          message.message.role === 'human'
                            ? 'ml-auto flex-row-reverse justify-end'
                            : 'mr-auto'
                        )}
                        style={message.message.role === 'human' ? { maxWidth: '80%' } : { width: '100%' }}
                      >

                    <div
                      className={cn(
                        'rounded-2xl transition-all duration-200',
                        message.message.role === 'human'
                          ? 'bg-background'
                          : '',
                        message.message.role === 'human' ? 'w-full' : 'w-full'
                      )}
                    >
                      {message.message.role === 'ai' ? (
                        <div className="space-y-3 prose-light-mode group">
                          {/* Display tool calls as "thinking" indicators */}
                          {message.toolCalls && message.toolCalls.length > 0 && (
                            <div className="space-y-1 mb-2">
                              {message.toolCalls.map((toolCall, idx) => (
                                <div
                                  key={toolCall.id || idx}
                                  className="text-xs text-gray-400 font-normal italic"
                                >
                                  {toolCall.name.split('_').map((word) =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                  ).join(' ')}...
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

                          {langGraphThread.values?.ui
                            ?.filter(
                              (ui: { metadata?: { message_id?: string }; id?: string }) =>
                                ui.metadata?.message_id === message.id
                            )
                            .map((ui: unknown) => (
                              <div key={(ui as { id?: string }).id} className="mt-4">
                                <LoadExternalComponent
                                  stream={langGraphThread}
                                  message={ui as Parameters<typeof LoadExternalComponent>[0]['message']}
                                  components={langGraphComponents}
                                  fallback={<div className="animate-pulse">Loading component...</div>}
                                  meta={{ getMeetingTypeName }}
                                />
                              </div>
                            ))}

                          {message.reference && message.reference.length > 0 && (
                            <ReferencesDisplay
                              references={message.reference}
                              sessionId={sessionId}
                            />
                          )}

                          {/* Action buttons - only show when there are no tool calls */}
                          {(!message.toolCalls || message.toolCalls.length === 0) && (
                            <div
                              className={cn(
                                'flex items-center justify-end gap-2 transition-opacity mt-2',
                                isLastAiMessage
                                  ? 'opacity-60 group-hover:opacity-100'
                                  : 'opacity-60 md:opacity-0 md:group-hover:opacity-100'
                              )}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyMessage(String(message.message.content || ''))}
                                className="h-8 w-8"
                                title="Copy response"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleThumbsUp(message.id)}
                                className="h-8 w-8"
                                title="Good response"
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleThumbsDown(message.id)}
                                className="h-8 w-8"
                                title="Poor response"
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                              {!message.isStreaming && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      title="Regenerate response"
                                      disabled={langGraphThread.isLoading}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                      <ChevronDown className="h-3 w-3 ml-0.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleRegenerate(messageIndex)}
                                      disabled={langGraphThread.isLoading}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Regenerate
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="group relative">
                          {editingMessageId === message.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingMessageContent}
                                onChange={(e) => setEditingMessageContent(e.target.value)}
                                className="min-h-[80px] resize-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    handleSaveEdit();
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                autoFocus
                              />
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  className="h-8"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  className="h-8"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                        <p className="text-sm break-words rounded-[18px] px-4 py-1.5 data-[multiline]:py-3 dark:bg-muted text-left">
                          {(message.message.content as string) || ''}
                        </p>
                              {/* Action buttons - visible on hover */}
                              <div className="absolute -left-10 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      title="More options"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleRetryMessage(messageIndex)}
                                      disabled={langGraphThread.isLoading}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Retry
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleEditMessage(message.id, String(message.message.content || ''))}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                     </div>
                   </div>
                    );
                  })}
              </div>
            ) : sessionId ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-6 max-w-md px-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">No messages yet</h3>
                    <p className="text-muted-foreground">Start a conversation in this session</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="p-4 rounded-lg border bg-card text-card-foreground">
                      <p className="font-medium mb-1">💡 Try asking about:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Key takeaways from recent meetings</li>
                        <li>• Action items that need follow-up</li>
                        <li>• Meeting summaries and decisions</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
              </div>
            )}
            </div>
            <div className='pb-10'></div>
          </ScrollArea>
        </div>
        <div className="flex-shrink-0  pb-4 bg-muted/20 max-w-[48rem] mx-auto w-full px-5">
          <ChatInput
            onSendMessage={sendMessage}
            meetings={meetings}
            selectedMeetings={selectedMeetings}
            onMeetingsSelect={setSelectedMeetings}
            onToggleSelectMode={toggleSelectMode}
            isSelectMode={isSelectMode}
            isSettingsOpen={isSettingsOpen}
            setIsSettingsOpen={setIsSettingsOpen}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            onSessionCreated={handleSessionCreated}
            disabled={langGraphThread.isLoading}
            onStopAgent={langGraphThread.stop}
          />
        </div>
      </div>

      {/* Feedback Modal */}
      {feedbackMessageId !== null && (
        <FeedbackModal
          open={feedbackModalOpen}
          onOpenChange={setFeedbackModalOpen}
          feedbackType={feedbackType}
          messageId={feedbackMessageId}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </div>
  );
};

export default MeetingAIChat;
