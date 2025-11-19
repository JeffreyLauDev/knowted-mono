import { useMeetingsControllerUpdate } from '@/api/generated/knowtedAPI';
import type { MeetingResponseDto, TranscriptSegmentDto } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/lib/toast';
import { debounce } from 'lodash';
import { Eye } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import EditableTimestampContent from './EditableTimestampContent';
import MeetingSummaryDisplay from './MeetingSummaryDisplay';
import TranscriptList from './TranscriptList';
import Chapters from './Chapters';

interface Chapter {
  time: string;
  title: string;
}

interface MeetingContentProps {
  meeting: MeetingResponseDto;
  transcript: TranscriptSegmentDto[];
  onUpdate?: (updates: Partial<MeetingResponseDto>) => void;
  onSaveComplete?: () => void;
  activeTab: 'summary' | 'transcript' | 'analysis' | 'chapters';
  isSharedMode?: boolean;
  onChapterTimeClick?: (timestamp: string) => void;
}

const MeetingContent = ({
  meeting,
  transcript,
  onUpdate,
  onSaveComplete,
  activeTab,
  isSharedMode = false,
  onChapterTimeClick
}: MeetingContentProps): JSX.Element => {

  const [showEmptyHeaders, setShowEmptyHeaders] = useState(false);
  const [chaptersSaving, setChaptersSaving] = useState(false);
  const [chaptersShowSaved, setChaptersShowSaved] = useState(false);
  const [chaptersText, setChaptersText] = useState(meeting.chapters || '');
  const chaptersSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Always call the hook but conditionally use its result
  const updateMeetingMutation = useMeetingsControllerUpdate({
    mutation: {
      onError: (error) => {
        // Only show errors when not in shared mode
        if (!isSharedMode) {
          console.error('Error updating meeting:', error);
          toast.error('Failed to update meeting');
        }
      }
    }
  });

  const updateMeeting = useCallback(async (field: keyof MeetingResponseDto, value: unknown): Promise<void> => {
    // In shared mode, don't allow updates
    if (isSharedMode) {
      console.warn('Meeting updates not allowed in shared mode');
      return;
    }

    try {
      await updateMeetingMutation.mutateAsync({
        id: meeting.id,
        data: { [field]: value } as Partial<MeetingResponseDto>,
        params: { organization_id: meeting.organization.id }
      });
    } catch (error) {
      console.error('Error in update:', error);
    }
  }, [isSharedMode, meeting, updateMeetingMutation]);

  const debounceFnsRef = useRef<{
    summary: ReturnType<typeof debounce>;
    summary_meta_data: ReturnType<typeof debounce>;
    chapters: ReturnType<typeof debounce>;
  } | null>(null);

  // Recreate debounced functions when dependencies change
  useEffect(() => {
    debounceFnsRef.current = {
    summary: debounce(async (value: string) => {
      // In shared mode, don't allow updates
      if (isSharedMode) {
        console.warn('Summary updates not allowed in shared mode');
        return;
      }

      if (onUpdate) {
        onUpdate({ summary: value });
      } else {
        await updateMeeting('summary', value);
      }
    }, 1000),

    summary_meta_data: debounce(async (value: Record<string, unknown>) => {
      // In shared mode, don't allow updates
      if (isSharedMode) {
        console.warn('Meta data updates not allowed in shared mode');
        return;
      }

      if (onUpdate) {
        onUpdate({ summary_meta_data: value });
      } else {
        await updateMeeting('summary_meta_data', value);
      }
    }, 1000),

      chapters: debounce(async (value: string): Promise<void> => {
      // In shared mode, don't allow updates
      if (isSharedMode) {
        console.warn('Chapters updates not allowed in shared mode');
        return;
      }

        try {
      if (onUpdate) {
        onUpdate({ chapters: value });
      } else {
        await updateMeeting('chapters', value);
      }
          // Update save status after successful save
          setChaptersSaving(false);
          setChaptersShowSaved(true);
          if (chaptersSaveTimeoutRef.current) {
            clearTimeout(chaptersSaveTimeoutRef.current);
    }
          chaptersSaveTimeoutRef.current = setTimeout(() => {
            setChaptersShowSaved(false);
          }, 1500);
          if (onSaveComplete) {
            onSaveComplete();
          }
    } catch (error) {
          console.error('Failed to save chapters:', error);
          setChaptersSaving(false);
        }
      }, 2000)
    };

    return () => {
      // Cleanup: cancel any pending debounced calls
      if (debounceFnsRef.current) {
        debounceFnsRef.current.summary.cancel();
        debounceFnsRef.current.summary_meta_data.cancel();
        debounceFnsRef.current.chapters.cancel();
    }
  };
  }, [isSharedMode, onUpdate, onSaveComplete, updateMeeting]);

  const handleMetaDataEdit = useCallback((key: string, value: string): void => {
    // In shared mode, don't allow meta data edits
    if (isSharedMode) {
      console.warn('Meta data edits not allowed in shared mode');
      return;
    }

    const updatedMetaData = { ...meeting.summary_meta_data, [key]: value };
    debounceFnsRef.current.summary_meta_data(updatedMetaData);
  }, [meeting.summary_meta_data, isSharedMode]);

  const handleTimestampClick = useCallback((timestamp: string, e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    if (!videoRef.current) {
      return;
    }

    const [minutes, seconds] = timestamp.split(':').map(Number);
    const timeInSeconds = minutes * 60 + seconds;

    videoRef.current.currentTime = timeInSeconds;
    videoRef.current.play().catch((e) => console.error('Error playing video:', e));
  }, []);

  useEffect((): (() => void) => {
    const updateVideoRef = (): void => {
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      if (videoElement) {
        videoRef.current = videoElement;
      }
    };

    updateVideoRef();
    const timeoutId = setTimeout(updateVideoRef, 500);
    return () => clearTimeout(timeoutId);
  }, []);

  // Update chapters text when meeting prop changes
  useEffect(() => {
    if (meeting.chapters !== undefined) {
      setChaptersText(meeting.chapters);
    }
  }, [meeting.chapters]);

  // Parse chapters into structured format
  const parseChapters = (chaptersText: string): Chapter[] => {
    if (!chaptersText) {
      return [];
    }

    return chaptersText
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const cleanLine = line
          .replace(/^\*\*(.+?)\*\*$/, '$1')
          .replace(/^###\s*/, '')
          .trim();

        const match = /^(\d{2}:\d{2})\s+(.+)$/.exec(cleanLine);
        if (match) {
          return { time: match[1], title: match[2] };
        }
        return { time: '', title: cleanLine };
      });
  };

  const chapterItems = parseChapters(chaptersText);

  // Handle chapters text change with debounced save
  const handleChaptersChange = useCallback((value: string) => {
    setChaptersText(value);
    if (!isSharedMode && debounceFnsRef.current?.chapters) {
      // Set saving state when user starts typing
      setChaptersSaving(true);
      // The debounced function will handle the actual save
      debounceFnsRef.current.chapters(value);
    }
  }, [isSharedMode]);

  // Immediate save on blur
  const handleChaptersBlur = useCallback(async (currentChapters: Chapter[]) => {
    if (isSharedMode || !debounceFnsRef.current?.chapters) {
      return;
    }
    // Cancel any pending debounced save and save immediately
    debounceFnsRef.current.chapters.cancel();
    const chaptersText = currentChapters
      .map((chapter) => `${chapter.time} ${chapter.title}`)
      .join('\n');
    setChaptersSaving(true);
    try {
      // Call the underlying function directly (bypass debounce)
      if (onUpdate) {
        onUpdate({ chapters: chaptersText });
      } else {
        await updateMeeting('chapters', chaptersText);
      }
      setChaptersSaving(false);
      setChaptersShowSaved(true);
      setTimeout(() => setChaptersShowSaved(false), 1500);
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error) {
      console.error('Failed to save chapters:', error);
      setChaptersSaving(false);
    }
  }, [isSharedMode, onUpdate, onSaveComplete, meeting]);

  return (
    <div className="relative">
      <Tabs value={activeTab} className="w-full">
        <TabsContent value="summary" >
          <div>
            <MeetingSummaryDisplay
              summary={meeting.summary || ''}
              onSave={(content) => {
                // content is now a markdown string instead of Editor.js data
                // This makes API calls much lighter and data more portable
                debounceFnsRef.current?.summary(content);
              }}
              onSaveComplete={() => {
                // This will be called when the MeetingSummaryDisplay finishes saving
                // We can use this to update the parent's unsaved changes state
                if (onSaveComplete) {
                  onSaveComplete();
                }
              }}
              isSharedMode={isSharedMode}
            />
          </div>
        </TabsContent>

        <TabsContent value="transcript" className="p-0">
          <div>
            <TranscriptList
              transcript={transcript}
              onTimestampClick={handleTimestampClick}
            />
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="p-0">
          <div>
            <div className="space-y-4 px-6 py-4">
              {meeting.summary_meta_data && typeof meeting.summary_meta_data === 'object' && (
                Object.entries(meeting.summary_meta_data as Record<string, unknown>)
                  .filter(([, value]) => showEmptyHeaders || (value && String(value).trim() !== ''))
                  .map(([key, value], index) => {
                    const stringValue = String(value || '');
                    return (
                      <div key={index} className="space-y-2">
                        <h3 className="text-sm font-semibold text-black">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </h3>
                        <EditableTimestampContent
                          content={stringValue}
                          onEdit={(newValue: string) => handleMetaDataEdit(key, newValue)}
                          onTimestampClick={handleTimestampClick}
                          placeholder={`Click to add ${key.replace(/_/g, ' ')}...`}
                          isSharedMode={isSharedMode}
                        />
                      </div>
                    );
                  })
              )}

              <div className="flex justify-center pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmptyHeaders(!showEmptyHeaders)}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showEmptyHeaders ? 'Hide Empty Headers' : 'Show Empty Headers'}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chapters" className="p-0">
          <div>
            <div className="px-6 py-4">
              <div className="mb-4">
                <h2 className="text-2xl font-semibold text-gray-800 pb-2 border-b border-gray-200">Chapters</h2>
              </div>

              {(chapterItems.length > 0 || (!isSharedMode)) && (
                <>
                  <Chapters
                    chapters={chapterItems}
                    onTimeClick={onChapterTimeClick || (() => {
                      // This will be handled by the parent component to control video player
                    })}
                    onChaptersChange={(updatedChapters) => {
                      if (isSharedMode) {
                        return; // Prevent editing in shared mode
                      }
                      const chaptersText = updatedChapters
                        .map((chapter) => `${chapter.time} ${chapter.title}`)
                        .join('\n');
                      handleChaptersChange(chaptersText);
                    }}
                    onChaptersBlur={handleChaptersBlur}
                    editable={!isSharedMode}
                  />

                  {/* Save status indicator for chapters */}
                  {!isSharedMode && (chaptersSaving || chaptersShowSaved) && (
                    <div className="mt-2 px-2 py-1 rounded text-xs font-normal flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity duration-200">
                      {chaptersSaving && (
                        <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded border border-blue-500 animate-pulse">Saving chapters...</span>
                      )}
                      {!chaptersSaving && chaptersShowSaved && (
                        <span className="text-emerald-600 bg-emerald-100 px-2 py-1 rounded border border-emerald-500 animate-in fade-in duration-300">✓ Chapters saved</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MeetingContent;
