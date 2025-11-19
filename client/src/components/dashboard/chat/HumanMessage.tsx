import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Edit, MoreVertical, RefreshCw } from 'lucide-react';
import React from 'react';
import type { ExtendedMessage } from './types';

interface HumanMessageProps {
  message: ExtendedMessage;
  isEditing: boolean;
  editingContent: string;
  isLoading: boolean;
  onEdit: (messageId: string | number, content: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onContentChange: (content: string) => void;
  onRetry: () => void;
}

export const HumanMessage: React.FC<HumanMessageProps> = ({
  message,
  isEditing,
  editingContent,
  isLoading,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onContentChange,
  onRetry
}) => {
  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={editingContent}
          onChange={(e) => onContentChange(e.target.value)}
          className="min-h-[80px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              onSaveEdit();
            } else if (e.key === 'Escape') {
              onCancelEdit();
            }
          }}
          autoFocus
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onSaveEdit} className="h-8">
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancelEdit} className="h-8">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm break-words rounded-[18px] px-4 py-1.5 data-[multiline]:py-3 dark:bg-muted text-left">
        {(message.message.content as string) || ''}
      </p>
      {/* Action buttons - visible on hover */}
      <div className="absolute -left-10 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="More options">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRetry} disabled={isLoading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(message.id, String(message.message.content || ''))}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};

