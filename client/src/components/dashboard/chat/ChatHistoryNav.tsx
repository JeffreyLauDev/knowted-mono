import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays, format, isToday, isYesterday } from 'date-fns';
import { Check, Edit2, Loader2, MessageSquare, Plus } from 'lucide-react';
import React, { memo, useCallback, useEffect, useState } from 'react';

interface ChatSession {
  id: string;
  title: string;
  date: Date;
}

interface ChatHistoryNavProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onUpdateSessionTitle?: (
    sessionId: string,
    newTitle: string
  ) => Promise<boolean>;
  isLoading?: boolean;
}

// Memoized session item component to prevent unnecessary re-renders
const SessionItem = memo(({
  session,
  isActive,
  onSelect,
  onStartEdit,
  isEditing,
  editingTitle,
  onTitleChange,
  onSaveTitle,
  onCancelEdit,
  isSaving
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onStartEdit: (e: React.MouseEvent) => void;
  isEditing: boolean;
  editingTitle: string;
  onTitleChange: (value: string) => void;
  onSaveTitle: (e: React.MouseEvent) => void;
  onCancelEdit: () => void;
  isSaving: boolean;
}) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveTitle(e as any);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    }
  }, [onSaveTitle, onCancelEdit]);

  return (
    <div className={cn('w-full rounded-lg max-w-[240px]', isActive ? 'bg-sidebar-muted/50' : '')}>
      {isEditing ? (
        <div className="flex items-center p-2 gap-2 group-data-[collapsible=icon]:justify-center">
          <MessageSquare className="h-4 w-4 shrink-0 text-sidebar-foreground" />
          <Input
            value={editingTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm bg-sidebar-muted/30 text-sidebar-foreground border-sidebar-foreground/20 focus-visible:ring-primary/30 group-data-[collapsible=icon]:hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'unset'
            }}
            autoFocus
          />
          <button
            className="p-1 rounded-md hover:bg-sidebar-muted/70 text-sidebar-foreground group-data-[collapsible=icon]:hidden"
            onClick={onSaveTitle}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={onSelect}
          className={cn(
            'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group',
            'hover:bg-sidebar-muted/30 flex items-center justify-between group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:text-center',
            isActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/80'
          )}
          title={session.title}
        >
          <div className="flex items-center gap-2 truncate group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">{session.title}</span>
          </div>
          {isActive && (
            <Edit2
              className="h-3.5 w-3.5 opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity group-data-[collapsible=icon]:hidden"
              onClick={onStartEdit}
            />
          )}
        </button>
      )}
    </div>
  );
});

SessionItem.displayName = 'SessionItem';

// Utility to group sessions by day
function groupSessionsByDay(sessions: ChatSession[]) {
  const groups = {};
  sessions.forEach((session) => {
    if (!session.date) {return;}

    try {
      const date = new Date(session.date);
      if (isNaN(date.getTime())) {return;}

      let label = '';
      if (isToday(date)) {
        label = 'Today';
      } else if (isYesterday(date)) {
        label = 'Yesterday';
      } else {
        const daysAgo = differenceInCalendarDays(new Date(), date);
        if (daysAgo < 7) {
          label = `${daysAgo} days ago`;
        } else {
          label = format(date, 'MMMM d, yyyy');
        }
      }
      if (!groups[label]) {groups[label] = [];}
      groups[label].push(session);
    } catch {
      // Skip invalid dates
      return;
    }
  });
  return groups;
}

const ChatHistoryNav: React.FC<ChatHistoryNavProps> = ({
  sessions: propSessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onUpdateSessionTitle,
  isLoading = false
}) => {
  const { state, closeMobileSidebar } = useSidebar();
  const [localSessions, setLocalSessions] = useState<ChatSession[]>(propSessions);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Update local sessions when prop sessions change
  useEffect(() => {
    setLocalSessions(propSessions);
  }, [propSessions]);

  const handleStartEdit = useCallback((session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  }, []);

  const handleTitleChange = useCallback((value: string) => {
    setEditingTitle(value);
    // Update local state immediately for better UX
    setLocalSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === editingSessionId
          ? { ...session, title: value }
          : session
      )
    );
  }, [editingSessionId]);

  const handleSaveTitle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingSessionId || !onUpdateSessionTitle) {return;}

    setIsSaving(true);
    try {
      const success = await onUpdateSessionTitle(editingSessionId, editingTitle);
      if (!success) {
        // Revert the local state if the save failed
        setLocalSessions((prevSessions) =>
          prevSessions.map((session) =>
            session.id === editingSessionId
              ? { ...session, title: propSessions.find((s) => s.id === editingSessionId)?.title || '' }
              : session
          )
        );
      }
    } finally {
      setIsSaving(false);
      setEditingSessionId(null);
      setEditingTitle('');
    }
  }, [editingSessionId, editingTitle, onUpdateSessionTitle, propSessions]);

  const handleCancelEdit = useCallback(() => {
    setEditingSessionId(null);
    setEditingTitle('');
  }, []);

  const handleSelectSession = useCallback((sessionId: string) => {
    // Close mobile sidebar when selecting a session
    closeMobileSidebar();
    onSelectSession(sessionId);
  }, [closeMobileSidebar, onSelectSession]);

  const handleNewSession = useCallback(() => {
    // Close mobile sidebar when creating a new session
    closeMobileSidebar();
    onNewSession();
  }, [closeMobileSidebar, onNewSession]);

  const grouped = groupSessionsByDay(localSessions);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2 group-data-[collapsible=icon]:justify-center">
        <span className="text-xs font-semibold text-sidebar-foreground/70 px-2 group-data-[collapsible=icon]:hidden">
          Recent Chats
        </span>
        <button
          title="New Chat"
          className="text-sidebar-foreground hover:bg-sidebar-foreground/10 rounded p-1"
          onClick={handleNewSession}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="h-[calc(100vh-320px)]">
        {Object.entries(grouped).map(([label, group]) => {
          const sessions = group as ChatSession[];
          return (
            <div key={label} className="mb-2">
              <div className="text-xs font-semibold px-2 py-1 group-data-[collapsible=icon]:hidden">{label}</div>
              {sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                  onSelect={() => handleSelectSession(session.id)}
                  onStartEdit={(e) => handleStartEdit(session, e)}
                  isEditing={editingSessionId === session.id}
                  editingTitle={editingTitle}
                  onTitleChange={handleTitleChange}
                  onSaveTitle={handleSaveTitle}
                  onCancelEdit={handleCancelEdit}
                  isSaving={isSaving}
                />
              ))}
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
};

export default memo(ChatHistoryNav);
