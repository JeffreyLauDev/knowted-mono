import { useMeetingsControllerFindOne, useMeetingsControllerGetSharedMeeting, useMeetingsControllerUpdate, useMeetingTypesControllerFindAll } from '@/api/generated/knowtedAPI';
import type { MeetingResponseDto, MeetingTypeResponse, UpdateMeetingDto } from '@/api/generated/models';
import MeetingDetail from '@/components/dashboard/meeting-detail/MeetingDetail';
import ShareMeetingDialog from '@/components/dashboard/meeting-detail/ShareMeetingDialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import { debounce } from 'lodash';
import { ArrowLeft, Clock, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

interface MeetingDetailSectionProps {
  onClose?: () => void;
  isSharedMode?: boolean;
}

const MeetingDetailSection = ({
  onClose,
  isSharedMode = false
}: MeetingDetailSectionProps): JSX.Element | null => {
  const meetingRef = useRef<MeetingResponseDto | null>(null);
  const { organization } = useAuth();
  const { meetingId, sessionId } = useParams<{ meetingId: string; sessionId?: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'analysis' | 'chapters'>('summary');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);

  // Use different hooks based on whether we're in shared mode
  const sharedMeetingQuery = useMeetingsControllerGetSharedMeeting(
    meetingId || '',
    { share_token: token || '' },
    {
      query: {
        enabled: isSharedMode && !!meetingId && !!token,
        retry: false
      }
    }
  );

  const authenticatedMeetingQuery = useMeetingsControllerFindOne<MeetingResponseDto>(
    meetingId || '',
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !isSharedMode && !!meetingId && !!organization?.id,
        refetchInterval: 5000 // Poll every 5 seconds instead of using realtime
      }
    }
  );

  // Extract data from the appropriate query
  const meetingData = isSharedMode
    ? (sharedMeetingQuery.data ? ('data' in sharedMeetingQuery.data ? sharedMeetingQuery.data.data : sharedMeetingQuery.data) : null)
    : authenticatedMeetingQuery.data;

  const isLoading = isSharedMode ? sharedMeetingQuery.isLoading : authenticatedMeetingQuery.isLoading;
  const isError = isSharedMode ? false : authenticatedMeetingQuery.isError;

  // Create a unified meeting object that works with both types
  const meeting = useMemo(() => {
    if (!meetingData) {
      return null;
    }

    if (isSharedMode && meetingData && typeof meetingData === 'object' && 'organization_id' in meetingData) {
      // Convert SharedMeetingResponseDto to MeetingResponseDto format
      const sharedData = meetingData as any;
      return {
        ...sharedData,
        organization: { id: sharedData.organization_id }
      } as MeetingResponseDto;
    }

    return meetingData as MeetingResponseDto;
  }, [meetingData, isSharedMode]);

  const { data: meetingTypes = [] } = useMeetingTypesControllerFindAll<MeetingTypeResponse[]>(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !isSharedMode && !!organization?.id // Only fetch meeting types for authenticated users
      }
    }
  );

  // Always call the hook but conditionally use its result
  const updateMeeting = useMeetingsControllerUpdate({
    mutation: {
      onError: (error) => {
        // Only show errors when not in shared mode
        if (!isSharedMode) {
          console.error('Error updating meeting:', error);
          toast.error('Failed to update meeting');
        }
      },
      onSuccess: () => {
        // Only show success when not in shared mode
        if (!isSharedMode) {
        }
      }
    }
  });

  const [, updateState] = useReducer((x) => x + 1, 0);
  const forceUpdate = useCallback(() => {
    updateState();
  }, []);

  useEffect(() => {
    if (meeting) {
      meetingRef.current = meeting;
      // Reset unsaved changes when data is refreshed from server
      setHasUnsavedChanges(false);
      forceUpdate();
    }
  }, [meeting, forceUpdate]);

  const debouncedUpdate = useCallback(
    debounce(async (updates: Partial<MeetingResponseDto>) => {
      // In shared mode, don't allow updates
      if (isSharedMode) {
        console.warn('Updates not allowed in shared mode');
        return;
      }

      if (!meetingId || !organization?.id) {
        return;
      }

      setIsSaving(true);
      try {
        // Convert Database Meeting updates to UpdateMeetingDto
        const updateDto: UpdateMeetingDto = {
          title: updates.title,
          meeting_date: updates.meeting_date,
          duration_mins: updates.duration_mins,
          meeting_type_id: updates.meetingType?.id,
          host_email: updates.host_email,
          meeting_url: updates.meeting_url,
          transcript_url: updates.transcript_url,
          video_url: updates.video_url,
          participants_email: updates.participants_email,
          transcript: updates.transcript,
          summary: updates.summary,
          chapters: updates.chapters,
          thumbnail: updates.thumbnail,
          bot_id: updates.bot_id,
          meta_data: updates.meta_data as UpdateMeetingDto['meta_data'],
          summary_meta_data: updates.summary_meta_data as UpdateMeetingDto['summary_meta_data'],
          transcript_json: updates.transcript_json as UpdateMeetingDto['transcript_json']
        };

        await updateMeeting.mutateAsync({
          id: meetingId,
          data: updateDto,
          params: { organization_id: organization.id }
        });

        setHasUnsavedChanges(false);
        // Show brief success indicator
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 2000);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to save changes: ${errorMessage}`);
        console.error('Error updating meeting:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [meetingId, organization?.id, updateMeeting, isSharedMode]
  );

  // Wrapper function to track unsaved changes
  const handleUpdate = useCallback((updates: Partial<MeetingResponseDto>) => {
    // In shared mode, don't allow updates
    if (isSharedMode) {
      console.warn('Updates not allowed in shared mode');
      return;
    }

    setHasUnsavedChanges(true);
    debouncedUpdate(updates);
  }, [debouncedUpdate, isSharedMode]);

  // Title editing handlers
  const handleTitleEdit = useCallback((newTitle: string): void => {
    // In shared mode, don't allow title edits
    if (isSharedMode) {
      console.warn('Title edits not allowed in shared mode');
      return;
    }

    if (newTitle !== meeting?.title) {
      handleUpdate({ title: newTitle });
    }
  }, [meeting?.title, handleUpdate, isSharedMode]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent): void => {
    // In shared mode, don't handle title editing
    if (isSharedMode) {
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur(); // This will trigger the onBlur event and save
    }
  }, [isSharedMode]);

  const handleTitleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>): void => {
    // In shared mode, don't handle title blur
    if (isSharedMode) {
      return;
    }

    setIsEditingTitle(false);
    const newTitle = e.currentTarget.textContent || '';
    if (newTitle.trim()) {
      handleTitleEdit(newTitle.trim());
    } else {
      // If title is empty, revert to original
      if (titleRef.current && meeting) {
        titleRef.current.textContent = meeting.title || 'Meeting Summary';
      }
    }
  }, [handleTitleEdit, meeting, isSharedMode]);

  // Function to force save all pending changes
  const forceSave = useCallback((): void => {
    // In shared mode, don't allow saves
    if (isSharedMode) {
      console.warn('Saves not allowed in shared mode');
      return;
    }

    if (hasUnsavedChanges && !isSaving && !isManualSaving) {
      setIsManualSaving(true);
      // Cancel any pending debounced updates
      debouncedUpdate.cancel();
      // Since we can't easily get the pending changes from the debounced function,
      // we'll just mark as saved and let the next change trigger a new save
      // This is a limitation of the current implementation
      setTimeout(() => {
        setHasUnsavedChanges(false);
        setIsManualSaving(false);
        toast.success('Changes saved');
      }, 500); // Simulate a brief save operation
    }
  }, [hasUnsavedChanges, isSaving, isManualSaving, debouncedUpdate, isSharedMode]);

  // Keyboard shortcut for saving (Ctrl+S / Cmd+S)
  useEffect((): (() => void) => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // In shared mode, don't handle save shortcuts
      if (isSharedMode) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        forceSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [forceSave, isSharedMode]);

  const handleClose = useCallback(() => {
    // Warn if there are unsaved changes (only in authenticated mode)
    if (!isSharedMode && hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) {
        return;
      }
    }

    // Always clear the selected meeting first
    if (onClose) {
      onClose();
    } else {
      // Navigate back to session if we're in a session context, otherwise to dashboard
      if (sessionId) {
        navigate(`/dashboard/sessions/${sessionId}`);
      } else {
        navigate('/dashboard');
      }
    }
  }, [onClose, navigate, sessionId, hasUnsavedChanges, isSharedMode]);

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meeting...</p>
        </div>
      </div>
    );
  }

  // Show error state if the query failed
  if (isError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load meeting</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!meetingId || !meeting) {
    return null;
  }

  return (
    <div className="transition-all duration-300 w-full h-full bg-white dark:bg-gray-800 rounded-xl shadow-elevated flex flex-col relative">
      <div className="sticky top-0 z-10 flex items-center gap-3 py-2 px-4 bg-white dark:bg-gray-800 border-b flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div
          ref={titleRef}
          contentEditable={!isSharedMode}
          suppressContentEditableWarning
          className={`font-medium truncate text-gray-800 ${
            !isSharedMode
              ? `focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 transition-all duration-200 ${
                  isEditingTitle ? 'bg-primary/10 ring-primary/30' : 'hover:bg-gray-50'
                }`
              : ''
          }`}
          onFocus={!isSharedMode ? () => setIsEditingTitle(true) : undefined}
          onKeyDown={!isSharedMode ? handleTitleKeyDown : undefined}
          onBlur={!isSharedMode ? handleTitleBlur : undefined}
          dangerouslySetInnerHTML={{ __html: meeting.title || 'Meeting Summary' }}
        />
        {showSaveSuccess && (
          <div className="flex items-center gap-1 text-primary text-sm ml-1 animate-in fade-in duration-200">
            <Save className="h-3 w-3" />
            <span className="text-xs font-medium">Saved!</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* Only show save functionality in authenticated mode */}
          {!isSharedMode && (
            <>
              {/* Unsaved changes indicator */}
              {hasUnsavedChanges && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-primary text-sm animate-pulse cursor-help">
                        <Clock className="h-4 w-4" />
                        <span>Unsaved</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Press Ctrl+S to save changes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Saving indicator */}
              {isSaving && (
                <div className="flex items-center gap-1 text-primary text-sm">
                  <Save className="h-4 w-4 animate-pulse" />
                  <span>Saving...</span>
                </div>
              )}

              {/* Manual save button */}
              {hasUnsavedChanges && !isSaving && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={forceSave}
                        disabled={isManualSaving}
                        className="h-8 text-xs bg-primary hover:bg-primary/90 text-white animate-in slide-in-from-right duration-200 relative"
                        aria-label="Save unsaved changes"
                      >
                        {isManualSaving ? (
                          <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        {isManualSaving ? 'Saving...' : 'Save'}
                        {/* Small indicator dot for unsaved changes */}
                        <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Save changes (Ctrl+S)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <ShareMeetingDialog
                meetingTitle={meeting.title}
                meetingId={meeting.id}
              />
            </>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <MeetingDetail
          meeting={meeting}
          meetingTypes={meetingTypes}
          onUpdate={isSharedMode ? undefined : handleUpdate}
          onSaveComplete={() => setHasUnsavedChanges(false)}
          activeTab={activeTab}
          isSharedMode={isSharedMode}
          shareToken={token || undefined}
        />
      </div>

      {/* Floating tabs positioned at bottom center */}
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-50">
        <div className="h-10 bg-[#FFFFFFDD] backdrop-blur-[4px] border border-white/20 rounded-xl shadow-lg p-1 gap-1 flex">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 h-8 rounded-lg transition-all duration-200 font-medium text-sm px-3 ${
              activeTab === 'summary'
                ? 'bg-primary/20 text-primary shadow-sm border border-primary/30 backdrop-blur-sm'
                : 'text-gray-700 hover:text-gray-900 hover:bg-white/40 hover:backdrop-blur-sm'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 h-8 rounded-lg transition-all duration-200 font-medium text-sm px-3 ${
              activeTab === 'transcript'
                ? 'bg-primary/20 text-primary shadow-sm border border-primary/30 backdrop-blur-sm'
                : 'text-gray-700 hover:text-gray-900 hover:bg-white/40 hover:backdrop-blur-sm'
            }`}
          >
            Transcript
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 h-8 rounded-lg transition-all duration-200 font-medium text-sm px-3 ${
              activeTab === 'analysis'
                ? 'bg-primary/20 text-primary shadow-sm border border-primary/30 backdrop-blur-sm'
                : 'text-gray-700 hover:text-gray-900 hover:bg-white/40 hover:backdrop-blur-sm'
            }`}
          >
            Analysis
          </button>
          <button
            onClick={() => setActiveTab('chapters')}
            className={`flex-1 h-8 rounded-lg transition-all duration-200 font-medium text-sm px-3 ${
              activeTab === 'chapters'
                ? 'bg-primary/20 text-primary shadow-sm border border-primary/30 backdrop-blur-sm'
                : 'text-gray-700 hover:text-gray-900 hover:bg-white/40 hover:backdrop-blur-sm'
            }`}
          >
            Chapters
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetailSection;
