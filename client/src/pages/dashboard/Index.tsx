import { useMeetingTypesControllerFindAll } from '@/api/generated/knowtedAPI';
import type { MeetingListResponseDto, MeetingTypeResponse } from '@/api/generated/models';
import DashboardAIChat from '@/components/dashboard/chat/DashboardAIChat';
import MeetingDetailSection from '@/components/dashboard/detail/MeetingDetailSection';
import DashboardFilters from '@/components/dashboard/filters/DashboardFilters';
import MeetingList from '@/components/dashboard/MeetingList';
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { flattenInfiniteMeetings, useInfiniteMeetings } from '@/hooks/useInfiniteMeetings';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { useNavigate, useParams } from 'react-router-dom';

const DashboardIndex = (): JSX.Element => {
  const isMobile = useIsMobile();
  const { organization } = useAuth();
  const { meetingId: routeMeetingId, sessionId } = useParams<{ meetingId?: string; sessionId?: string }>();
  const navigate = useNavigate();

  // State management - removed selectedMeetingId state since we'll use route directly
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Dynamic panel sizing state with animation
  const [chatPanelSize, setChatPanelSize] = useState(70);
  const [meetingPanelSize, setMeetingPanelSize] = useState(30);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // LocalStorage keys for panel sizes only
  const PANEL_SIZES_KEY = 'dashboard-panel-sizes';

  // Load saved panel sizes from localStorage
  useEffect(() => {
    const savedSizes = localStorage.getItem(PANEL_SIZES_KEY);
    if (savedSizes) {
      const { withMeeting, withoutMeeting } = JSON.parse(savedSizes);
      if (routeMeetingId && withMeeting) {
        setChatPanelSize(withMeeting.chat);
        setMeetingPanelSize(withMeeting.meeting);
      } else if (!routeMeetingId && withoutMeeting) {
        setChatPanelSize(withoutMeeting.chat);
        setMeetingPanelSize(withoutMeeting.meeting);
      }
    }
  }, [routeMeetingId]);

  // Save panel sizes to localStorage
  const savePanelSizes = useCallback((chatSize: number, meetingSize: number) => {
    const savedSizes = localStorage.getItem(PANEL_SIZES_KEY);
    const currentSizes = savedSizes ? JSON.parse(savedSizes) : {};

    const newSizes = {
      ...currentSizes,
      [routeMeetingId ? 'withMeeting' : 'withoutMeeting']: {
        chat: chatSize,
        meeting: meetingSize
      }
    };

    localStorage.setItem(PANEL_SIZES_KEY, JSON.stringify(newSizes));
  }, [routeMeetingId]);

  // Reset panels to default sizes on double-click
  const handleDoubleClick = useCallback(() => {
    const defaultChatSize = routeMeetingId ? 30 : 70;
    const defaultMeetingSize = routeMeetingId ? 70 : 30;

    setChatPanelSize(defaultChatSize);
    setMeetingPanelSize(defaultMeetingSize);

    // Save the default sizes to localStorage
    savePanelSizes(defaultChatSize, defaultMeetingSize);
  }, [routeMeetingId, savePanelSizes]);

  // Memoized panel sizes calculation to prevent unnecessary recalculations
  const panelSizes = useMemo(() => {
    if (isDragging) {
      return { chat: chatPanelSize, meeting: meetingPanelSize };
    }

    const savedSizes = localStorage.getItem(PANEL_SIZES_KEY);
    let defaultChatSize = 70;
    let defaultMeetingSize = 30;

    if (savedSizes) {
      const { withMeeting, withoutMeeting } = JSON.parse(savedSizes);
      if (routeMeetingId && withMeeting) {
        defaultChatSize = withMeeting.chat;
        defaultMeetingSize = withMeeting.meeting;
      } else if (!routeMeetingId && withoutMeeting) {
        defaultChatSize = withoutMeeting.chat;
        defaultMeetingSize = withoutMeeting.meeting;
      } else if (routeMeetingId) {
        // First time with meeting - use default 30/70
        defaultChatSize = 30;
        defaultMeetingSize = 70;
      }
    } else if (routeMeetingId) {
      // No saved sizes and meeting selected - use default 30/70
      defaultChatSize = 30;
      defaultMeetingSize = 70;
    }

    return { chat: defaultChatSize, meeting: defaultMeetingSize };
  }, [routeMeetingId, isDragging, chatPanelSize, meetingPanelSize]);

  // Update panel sizes when meeting selection changes with animation
  useEffect(() => {
    if (!isDragging && panelSizes.chat !== chatPanelSize) {
      setChatPanelSize(panelSizes.chat);
      setMeetingPanelSize(panelSizes.meeting);
    }
  }, [panelSizes, isDragging, chatPanelSize]);

  // Removed useEffect for syncing routeMeetingId with selectedMeetingId since we'll use route directly

  const {
    data: meetingsData,
    isLoading: isMeetingsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error: meetingsError
  } = useInfiniteMeetings({
    organization_id: organization?.id || '',
    meeting_type_id: filterType !== 'all' ? filterType : undefined,
    from_date: dateRange?.from?.toISOString(),
    to_date: dateRange?.to?.toISOString(),
    search: searchQuery || undefined,
    limit: 20
  });

  // Extract meetings from infinite query pages
  const meetings = useMemo(() => {
    return flattenInfiniteMeetings(meetingsData);
  }, [meetingsData]);

  const { data: meetingTypes = [], isLoading: isMeetingTypesLoading } =
    useMeetingTypesControllerFindAll<MeetingTypeResponse[]>(
      {
        organization_id: organization?.id || ''
      },
      {
        query: {
          enabled: !!organization?.id
        }
      }
    );

  const displayMeetings = useMemo((): MeetingListResponseDto[] => {
    // All filtering is now handled server-side via API parameters
    return meetings;
  }, [meetings]);

  const getMeetingTypeName = (meetingTypeId: string): string => {
    const meetingType = meetingTypes.find((type) => type.id === meetingTypeId);
    return meetingType?.name || 'Unknown Type';
  };

  const handleMeetingSelect = useCallback((meetingId: string): void => {
    // Navigate to meeting detail with session context if available
    if (sessionId) {
      navigate(`/dashboard/sessions/${sessionId}/meetings/${meetingId}`);
    } else {
      navigate(`/dashboard/meetings/${meetingId}`);
    }
  }, [sessionId, navigate]);

  const handleCloseMeetingDetail = (): void => {
    // Navigate back to dashboard when closing meeting detail
    navigate('/dashboard');
  };

  // Optimized drag handler with throttling
  const handleDrag = useCallback((startX: number, startChatSize: number, startMeetingSize: number) => {
    setIsDragging(true);
    let animationFrameId: number | null = null;
    let lastX = startX;

    const handleMouseMove = (moveEvent: MouseEvent): void => {
      lastX = moveEvent.clientX;

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        const deltaX = lastX - startX;
        const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
        const deltaPercent = (deltaX / containerWidth) * 100;

        const newChatSize = Math.max(25, Math.min(75, startChatSize + deltaPercent));
        const newMeetingSize = Math.max(25, Math.min(75, startMeetingSize - deltaPercent));

        // Update CSS directly for better performance during drag
        if (containerRef.current) {
          containerRef.current.style.gridTemplateColumns = `${newChatSize}% 2px ${newMeetingSize}%`;
        }
      });
    };

    const handleMouseUp = (): void => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Calculate final sizes and update state
      const deltaX = lastX - startX;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
      const deltaPercent = (deltaX / containerWidth) * 100;

      const finalChatSize = Math.max(25, Math.min(75, startChatSize + deltaPercent));
      const finalMeetingSize = Math.max(25, Math.min(75, startMeetingSize - deltaPercent));

      setChatPanelSize(finalChatSize);
      setMeetingPanelSize(finalMeetingSize);

      // Save the new sizes to localStorage
      savePanelSizes(finalChatSize, finalMeetingSize);

      setIsDragging(false);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [savePanelSizes]);

  return (
    <>
      <div className="flex flex-col md:flex-row h-screen" data-testid="dashboard-page">
        {isMobile ? (
          <>
            {/* Default: Chat Interface (full screen) */}
            <div className="w-full h-full">
              <DashboardAIChat
                meetings={displayMeetings}
                selectedMeetingId={routeMeetingId}
                className="h-full"
              />
            </div>

            {/* Meeting Detail Sheet for Mobile */}
            {routeMeetingId && (
              <Sheet open={!!routeMeetingId} onOpenChange={() => navigate('/dashboard')}>
                <SheetContent side="right" className="w-full sm:w-[90vw] p-0">
                  <MeetingDetailSection onClose={() => navigate('/dashboard')} />
                </SheetContent>
              </Sheet>
            )}
          </>
        ) : (
          <>
            <div
              ref={containerRef}
              className="w-full h-full grid overflow-hidden"
              style={{
                gridTemplateColumns: `${chatPanelSize}% 2px ${meetingPanelSize}%`,
                transition: isDragging ? 'none' : 'grid-template-columns 0.3s ease-in-out'
              }}
            >
              <div className="min-w-0 overflow-hidden">
                <DashboardAIChat
                  meetings={displayMeetings}
                  selectedMeetingId={routeMeetingId}
                />
              </div>

              {/* Resizable handle */}
              <div
                className="light:bg-gray-200 light:hover:bg-gray-300 cursor-col-resize transition-colors duration-200 relative group"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleDrag(e.clientX, chatPanelSize, meetingPanelSize);
                }}
                onDoubleClick={handleDoubleClick}
                title="Double-click to reset to default sizes"
              >
              </div>

              <div className="min-w-0 overflow-hidden">
                {routeMeetingId ? (
                  <MeetingDetailSection
                    onClose={routeMeetingId ? undefined : handleCloseMeetingDetail}
                  />
                ) : (
                  <div className="border flex flex-col h-full bg-white dark:bg-background">

                    <div className="flex-shrink-0">
                      <DashboardFilters
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        filterType={filterType}
                        setFilterType={setFilterType}
                        setDateRange={(range) => setDateRange(range as DateRange | undefined)}
                        meetingTypes={meetingTypes}
                      />
                    </div>
                    <div className="flex-shrink-0 p-4">
                      <WelcomeBanner />
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0">
                      <MeetingList
                        meetings={meetings}
                        loading={isMeetingsLoading || isMeetingTypesLoading}
                        getMeetingTypeName={getMeetingTypeName}
                        filteredMeetings={displayMeetings}
                        onMeetingSelect={handleMeetingSelect}
                        meetingTypeFilter={filterType}
                        onLoadMore={fetchNextPage}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default DashboardIndex;
