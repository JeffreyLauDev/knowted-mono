import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Copy, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';

interface MessageActionButtonsProps {
  content: string;
  isLastMessage: boolean;
  isStreaming: boolean;
  isLoading: boolean;
  onCopy: (content: string) => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onRegenerate: () => void;
}

export const MessageActionButtons: React.FC<MessageActionButtonsProps> = ({
  content,
  isLastMessage,
  isStreaming,
  isLoading,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  onRegenerate
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 transition-opacity mt-2',
        isLastMessage
          ? 'opacity-60 group-hover:opacity-100'
          : 'opacity-60 md:opacity-0 md:group-hover:opacity-100'
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onCopy(content)}
        className="h-8 w-8"
        title="Copy response"
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onThumbsUp}
        className="h-8 w-8"
        title="Good response"
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onThumbsDown}
        className="h-8 w-8"
        title="Poor response"
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
      {!isStreaming && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Regenerate response"
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRegenerate} disabled={isLoading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

