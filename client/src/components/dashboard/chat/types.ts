import type { MessageContentDto } from '@/api/generated/models';

export interface ExtendedMessage {
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

