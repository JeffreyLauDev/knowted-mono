
import type { MeetingListResponseDto } from '@/api/generated/models/meetingListResponseDto';
import type { MeetingResponseDto } from '@/api/generated/models/meetingResponseDto';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { memo } from 'react';

// Union type to support both list and detailed meeting objects
type MeetingCardData = MeetingResponseDto | MeetingListResponseDto;

interface MeetingCardProps {
  meeting: MeetingCardData;
  onClick?: (meetingId: string) => void;
  className?: string;
  getMeetingTypeName?: (typeId: string | null) => string;
}

// Using memo to prevent unnecessary re-renders
const MeetingCard = memo(({
  meeting,
  onClick,
  className,
  getMeetingTypeName
}: MeetingCardProps) => {
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMM d, h:mm a');
    } catch {
      console.error('Invalid date format:', dateString);
      return 'Invalid date';
    }
  };

  const handleClick = (): void => {
    if (meeting.id) {
      // Call the onClick handler which now handles session-aware navigation
      if (onClick) {
        onClick(meeting.id);
      }
    }
  };

  return (
    <div
      className={cn(
        'hover:bg-secondary/50 transition-colors cursor-pointer overflow-hidden flex gap-3 p-2',
        className
      )}
      onClick={handleClick}
    >
      <div className="w-24 h-16 bg-muted rounded-lg overflow-hidden">
        <img
          src={meeting.thumbnail || ('video_url' in meeting ? meeting.video_url : undefined) || '/placeholder.svg'}
          alt={meeting.title || 'Meeting thumbnail'}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-sm line-clamp-1">
            {meeting.title || 'Untitled Meeting'}
          </h3>

        </div>

        <div className="flex items-center gap-4 text-xs">

          {meeting.meetingType?.id && getMeetingTypeName && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
              {getMeetingTypeName(meeting.meetingType.id)}
            </span>
          )}

        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(meeting.meeting_date || meeting.created_at)}
          </div>
      </div>
    </div>
  );
});

MeetingCard.displayName = 'MeetingCard';

export default MeetingCard;
