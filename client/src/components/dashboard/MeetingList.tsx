import type { MeetingListResponseDto } from '@/api/generated/models';
import { useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MeetingCard from './MeetingCard';

interface MeetingListProps {
  meetings?: MeetingListResponseDto[];
  loading?: boolean;
  getMeetingTypeName: (typeId: string) => string;
  filteredMeetings?: MeetingListResponseDto[];
  onMeetingSelect?: (meetingId: string) => void;
  meetingTypeFilter?: string;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

const MeetingList = ({
  meetings: propMeetings = [],
  loading: propLoading = false,
  getMeetingTypeName,
  filteredMeetings: propFilteredMeetings,
  onMeetingSelect,
  meetingTypeFilter,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage
}: MeetingListProps): JSX.Element => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const observerRef = useRef<IntersectionObserver>();

  console.warn('📋 MeetingList: Component rendered', {
    propMeetingsCount: propMeetings.length,
    propFilteredMeetingsCount: propFilteredMeetings?.length || 0,
    loading: propLoading,
    meetingTypeFilter,
    // Infinite scroll props
    hasOnLoadMore: !!onLoadMore,
    hasNextPage,
    isFetchingNextPage,
    timestamp: new Date().toISOString()
  });

  // Intersection Observer for infinite scroll
  const lastMeetingRef = useCallback((node: HTMLDivElement) => {
    console.warn('🎯 lastMeetingRef callback called', {
      hasNode: !!node,
      propLoading,
      hasNextPage,
      isFetchingNextPage,
      hasOnLoadMore: !!onLoadMore,
      observerExists: !!observerRef.current
    });

    if (propLoading) {
      console.warn('⏸️ Skipping observer setup: still loading');
      return;
    }
    if (observerRef.current) {
      console.warn('🔄 Disconnecting existing observer');
      observerRef.current.disconnect();
    }

    if (node) {
      console.warn('👀 Setting up intersection observer on last meeting');
      observerRef.current = new IntersectionObserver((entries) => {
        const entry = entries[0];
        console.warn('🔍 Intersection observer triggered', {
          isIntersecting: entry.isIntersecting,
          hasNextPage,
          isFetchingNextPage,
          hasOnLoadMore: !!onLoadMore,
          boundingClientRect: entry.boundingClientRect,
          intersectionRatio: entry.intersectionRatio
        });

        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && onLoadMore) {
          console.warn('🚀 Triggering load more meetings!');
          onLoadMore();
        } else {
          console.warn('❌ Not loading more meetings:', {
            isIntersecting: entry.isIntersecting,
            hasNextPage,
            isFetchingNextPage,
            hasOnLoadMore: !!onLoadMore
          });
        }
      }, {
        threshold: 0.1,
        rootMargin: '50px'
      });
      observerRef.current.observe(node);
      console.warn('✅ Observer attached to last meeting element');
    } else {
      console.warn('❌ No node provided to lastMeetingRef');
    }
  }, [propLoading, hasNextPage, isFetchingNextPage, onLoadMore]);

  // Sort meetings by date (latest first)
  const sortMeetingsByDate = (meetings: MeetingListResponseDto[]): MeetingListResponseDto[] => {
    return [...meetings].sort((a, b) => {
      const dateA = a.meeting_date || a.created_at;
      const dateB = b.meeting_date || b.created_at;

      if (!dateA && !dateB) {return 0;}
      if (!dateA) {return 1;}
      if (!dateB) {return -1;}

      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  };

  // Use filtered meetings if provided, otherwise use regular meetings
  const meetings = propFilteredMeetings && propFilteredMeetings.length > 0 ? propFilteredMeetings : propMeetings;
  const loading = propLoading;

  console.warn('📋 MeetingList: Final meeting data selection', {
    propMeetingsCount: propMeetings.length,
    propFilteredMeetingsCount: propFilteredMeetings?.length || 0,
    selectedMeetingsCount: meetings.length,
    usingFilteredMeetings: propFilteredMeetings && propFilteredMeetings.length > 0,
    loading,
    meetingTypeFilter,
    timestamp: new Date().toISOString()
  });

  // Apply sorting
  const displayMeetings = sortMeetingsByDate(meetings);

  console.warn('📋 MeetingList: Final display meetings', {
    displayMeetingsCount: displayMeetings.length,
    meetings: displayMeetings.map((m) => ({ id: m.id, title: m.title, meetingTypeId: m.meetingType?.id }))
  });

  const handleMeetingClick = (meetingId: string): void => {
    if (sessionId) {
      navigate(`/dashboard/sessions/${sessionId}/meetings/${meetingId}`);
    } else {
      navigate(`/dashboard/meetings/${meetingId}`);
    }

    if (onMeetingSelect) {
      onMeetingSelect(meetingId);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded-md"></div>
          <div className="h-20 bg-muted rounded-md"></div>
        </div>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No meetings found</p>
      </div>
    );
  }

  if (displayMeetings.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No meetings match your criteria</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {displayMeetings.map((meeting, index) => (
          <div
            key={meeting.id}
            ref={index === displayMeetings.length - 1 ? lastMeetingRef : undefined}
          >
            <MeetingCard
              meeting={meeting}
              onClick={handleMeetingClick}
              getMeetingTypeName={getMeetingTypeName}
            />
          </div>
        ))}

        {/* Infinite scroll loading indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="animate-pulse">
              <div className="h-16 bg-muted rounded-md w-full"></div>
            </div>
          </div>
        )}

        {/* End of results indicator */}
        {!hasNextPage && displayMeetings.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No more meetings to load</p>
          </div>
        )}

        {/* Debug: Manual load more button */}
        {hasNextPage && onLoadMore && (
          <div className="text-center py-4">
            <button
              onClick={() => {
                console.warn('🔴 Manual load more button clicked');
                onLoadMore();
              }}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More (Debug)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingList;
