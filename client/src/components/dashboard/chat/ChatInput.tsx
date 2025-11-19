import type { MeetingListResponseDto } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FileText, Image, Music, Paperclip, Send, Sparkles, Square, Video, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export interface FileAttachment {
  file: File;
  preview?: string;
  type: 'image' | 'file' | 'audio' | 'video';
}

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: FileAttachment[]) => void;
  meetings?: MeetingListResponseDto[];
  selectedMeetings: MeetingListResponseDto[];
  onMeetingsSelect: (meetings: MeetingListResponseDto[]) => void;
  onToggleSelectMode: () => void;
  isSelectMode: boolean;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  onSessionCreated?: (sessionId: string) => void;
  disabled?: boolean;
  onStopAgent?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  selectedMeetings,
  onMeetingsSelect,
  onToggleSelectMode,
  isSelectMode,
  isSettingsOpen,
  setIsSettingsOpen,
  systemPrompt,
  setSystemPrompt,
  disabled = false,
  onStopAgent
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = useCallback((): void => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [message, adjustHeight]);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setMessage(e.target.value);
  }, []);

  const getFileType = useCallback((file: File): 'image' | 'file' | 'audio' | 'video' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
  }, []);

  const getFileIcon = useCallback((attachment: FileAttachment): React.ReactNode => {
    const fileName = attachment.file.name.toLowerCase();
    const fileType = attachment.file.type;

    // Check file extension and MIME type for better icon selection
    if (attachment.type === 'image' && attachment.preview) {
      return <Image className="h-3 w-3" />;
    }

    if (attachment.type === 'audio' || fileType.startsWith('audio/') || 
        fileName.endsWith('.mp3') || fileName.endsWith('.wav') || 
        fileName.endsWith('.ogg') || fileName.endsWith('.m4a')) {
      return <Music className="h-3 w-3" />;
    }

    if (attachment.type === 'video' || fileType.startsWith('video/') || 
        fileName.endsWith('.mp4') || fileName.endsWith('.mov') || 
        fileName.endsWith('.avi') || fileName.endsWith('.webm')) {
      return <Video className="h-3 w-3" />;
    }

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return <FileText className="h-3 w-3" />;
    }

    if (fileType.includes('word') || fileName.endsWith('.doc') || 
        fileName.endsWith('.docx')) {
      return <FileText className="h-3 w-3" />;
    }

    if (fileType.includes('excel') || fileName.endsWith('.xls') || 
        fileName.endsWith('.xlsx')) {
      return <FileText className="h-3 w-3" />;
    }

    if (fileType.includes('powerpoint') || fileName.endsWith('.ppt') || 
        fileName.endsWith('.pptx')) {
      return <FileText className="h-3 w-3" />;
    }

    // Default file icon
    return <Paperclip className="h-3 w-3" />;
  }, []);

  const processFile = useCallback(async (file: File): Promise<FileAttachment> => {
    const type = getFileType(file);
    let preview: string | undefined;

    if (type === 'image') {
      preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }

    return { file, preview, type };
  }, [getFileType]);

  const handleFileSelect = useCallback(async (files: FileList | File[] | null): Promise<void> => {
    if (!files || files.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles: File[] = [];

    const fileArray = Array.isArray(files) ? files : Array.from(files);
    fileArray.forEach((file) => {
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length === 0) return;

    try {
      const processedFiles = await Promise.all(validFiles.map(processFile));
      setAttachments((prev) => [...prev, ...processedFiles]);
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Failed to process files');
    }
  }, [processFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    handleFileSelect(e.target.files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeAttachment = useCallback((index: number): void => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if ((message.trim() || attachments.length > 0) && !isSending && !disabled) {
      try {
        setIsSending(true);
        onSendMessage(message, attachments.length > 0 ? attachments : undefined);
        setMessage('');
        setAttachments([]);
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      } finally {
        setIsSending(false);
      }
    }
  }, [message, attachments, isSending, disabled, onSendMessage]);

  const handleRemoveMeeting = useCallback((meetingId: string): void => {
    onMeetingsSelect(selectedMeetings.filter((m) => m.id !== meetingId));
  }, [selectedMeetings, onMeetingsSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  return (
    <div className="bg-background ring-offset-background rounded-lg border p-3 space-y-3 shadow-[0_8px_12px_0_rgba(0,0,0,0.05)]">
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Customize AI Conversation Style</DialogTitle>
            <DialogDescription>
              Set the tone and language style for your AI assistant.
              This helps the AI respond in a way that matches your preferences.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Example prompts:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• "Respond in a professional and formal tone"</li>
                <li>• "Use simple language and explain technical terms"</li>
                <li>• "Be concise and focus on key points"</li>
              </ul>
            </div>
            <Textarea
              placeholder="Enter your preferred conversation style..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-[100px]"
            />
            <Button
              className="w-full"
              onClick={() => {
                toast.success('AI conversation style updated');
                setIsSettingsOpen(false);
              }}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {selectedMeetings.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b">
          {selectedMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full"
            >
              <span className="truncate max-w-[150px] font-medium">
                {meeting.title || 'Untitled Meeting'}
              </span>
              <button
                onClick={() => handleRemoveMeeting(meeting.id)}
                className="hover:text-primary/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative inline-flex items-center gap-1.5 bg-muted text-foreground text-xs px-2.5 py-1 rounded-md max-w-[200px]"
            >
              {attachment.type === 'image' && attachment.preview ? (
                <img
                  src={attachment.preview}
                  alt={attachment.file.name}
                  className="h-8 w-8 object-cover rounded"
                />
              ) : (
                <div className="h-8 w-8 flex items-center justify-center bg-background rounded">
                  {getFileIcon(attachment)}
                </div>
              )}
              <span className="truncate flex-1 font-medium">
                {attachment.file.name}
              </span>
              <button
                onClick={() => removeAttachment(index)}
                className="hover:text-destructive flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative space-y-2',
          isDragging && 'ring-2 ring-primary ring-offset-2'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,audio/*,video/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={disabled ? 'Agent is working...' : 'Ask me anything about the meetings...'}
            className="w-full pr-12 min-h-[50px] resize-none overflow-y-auto text-sm focus-visible:ring-primary/20 border-none placeholder:[line-height:35px]"
            style={{ overflowY: textareaRef.current?.scrollHeight > 200 ? 'auto' : 'hidden' }}
            disabled={isSending || disabled}
          />
          {disabled && onStopAgent ? (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={onStopAgent}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-red-100 text-red-600 hover:text-red-700"
              title="Stop AI Agent"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-primary/10"
              disabled={isSending || disabled || (!message.trim() && attachments.length === 0)}
            >
              <Send className={cn('h-4 w-4', isSending ? 'text-muted-foreground' : 'text-primary')} />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 gap-2"
            disabled={disabled || isSending}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="h-8 gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">Personalize</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
