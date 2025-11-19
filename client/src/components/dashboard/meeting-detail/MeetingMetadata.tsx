import { useMeetingTypesControllerFindAll } from '@/api/generated/knowtedAPI';
import type { MeetingResponseDto, MeetingTypeResponse } from '@/api/generated/models';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { formatDuration } from '@/utils/dateUtils';
import { format } from 'date-fns';
import { Calendar, Clock, Tag, Users } from 'lucide-react';

// Create a MeetingResponse type based on the orval generated CompleteMeetingDto
type MeetingResponse = MeetingResponseDto;

interface MeetingMetadataProps {
  meeting: MeetingResponse;
  onUpdate?: (updates: Partial<MeetingResponse>) => void;
}

const MeetingMetadata = ({ meeting, onUpdate }: MeetingMetadataProps): JSX.Element => {
  const { organization } = useAuth();

  const { data: meetingTypes = [] } = useMeetingTypesControllerFindAll<MeetingTypeResponse[]>(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );

  const formatDate = (date: string | null | undefined): string => {
    if (!date) {
      return 'No date set';
    }
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return 'Invalid date';
      }
      return format(parsedDate, 'PP p');
    } catch {
      return 'Invalid date';
    }
  };

  const handleMeetingTypeChange = (meetingTypeId: string): void => {
    if (onUpdate) {
      // Find the selected meeting type to pass the full object
      const selectedType = meetingTypes.find((type) => type.id === meetingTypeId);
      if (selectedType) {
        onUpdate({ meetingType: selectedType });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Meeting Details Section */}
      <div className="flex gap-8 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-500" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-gray-500">Participants</span>
            <span className="text-sm text-gray-800">
              {meeting.host_email || 'Unknown'} + {(meeting.participants_email?.length || 0)} participants
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-gray-500">Scheduled</span>
            <span className="text-sm text-gray-800">{formatDate(meeting.meeting_date)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-gray-500">Duration</span>
            <span className="text-sm text-gray-800">{formatDuration(meeting.duration_mins)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-gray-500" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-gray-500">Type</span>
            <Select
              value={meeting.meetingType?.id || ''}
              onValueChange={handleMeetingTypeChange}
            >
              <SelectTrigger className="w-32 h-8 text-sm border-gray-300 bg-white">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {meetingTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id} className="text-sm">
                    {type.name || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Participants Hover Card - Hidden but accessible for detailed info */}
      <HoverCard openDelay={100} closeDelay={100}>
        <HoverCardTrigger>
          <div className="hidden">
            <Users className="h-4 w-4 text-primary" />
            <span className="truncate">
              {meeting.host_email || 'Unknown'} + {(meeting.participants_email?.length || 0)} participants
            </span>
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          side="bottom"
          align="start"
          className="w-64 text-xs p-2 space-y-1"
        >
          <h4 className="text-xs font-semibold mb-1">Meeting Participants</h4>
          <div className="text-xs text-muted-foreground">
            <div className="font-medium">Host:</div>
            <div className="truncate mb-1">{meeting.host_email || 'Unknown'}</div>
            {meeting.participants_email && Array.isArray(meeting.participants_email) &&
              meeting.participants_email.length > 0 ? (
              <>
                <div className="font-medium mt-1">Participants:</div>
                <ul className="list-disc pl-4 text-xs space-y-0.5">
                  {meeting.participants_email.map((email, index) => (
                    <li key={index} className="truncate">{email}</li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="text-muted-foreground mt-1">No participants</div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};

export default MeetingMetadata;

