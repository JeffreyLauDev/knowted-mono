import { useMeetingTypesControllerFindAll } from '@/api/generated/knowtedAPI';
import type { MeetingListResponseDto, MeetingTypeResponse } from '@/api/generated/models';
import DashboardFilters from '@/components/dashboard/filters/DashboardFilters';
import MeetingList from '@/components/dashboard/MeetingList';
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { flattenInfiniteMeetings, useInfiniteMeetings } from '@/hooks/useInfiniteMeetings';
import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { useNavigate, useParams } from 'react-router-dom';

const MeetingsPage = (): JSX.Element => {
  const isMobile = useIsMobile();
  const { organization } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const {
    data: meetingsData,
    isLoading: isMeetingsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
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
    return meetings;
  }, [meetings]);

  const getMeetingTypeName = (meetingTypeId: string): string => {
    const meetingType = meetingTypes.find((type) => type.id === meetingTypeId);
    return meetingType?.name || 'Unknown Type';
  };

  const handleMeetingSelect = (meetingId: string): void => {
    // Navigate to meeting detail with session context if available
    if (sessionId) {
      navigate(`/dashboard/sessions/${sessionId}/meetings/${meetingId}`);
    } else {
      navigate(`/dashboard/meetings/${meetingId}`);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Desktop Header */}
      {!isMobile && (
        <div className="px-6 py-4 border-b bg-background">
          <h1 className="text-2xl font-semibold">Meetings</h1>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-16">
        <div className="space-y-4 p-4">
          <WelcomeBanner />
          <DashboardFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterType={filterType}
            setFilterType={setFilterType}
            setDateRange={setDateRange}
            meetingTypes={meetingTypes}
          />
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
    </div>
  );
};

export default MeetingsPage;

