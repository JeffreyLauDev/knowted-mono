
import type { MeetingResponseDto } from '@/api/generated/models';
import { isWithinInterval, parseISO } from 'date-fns';

export const filterMeetingsByDateRange = (
  meetings: MeetingResponseDto[],
  dateRange: { from: Date | undefined; to: Date | undefined }
): MeetingResponseDto[] => {
  if (!dateRange.from || !dateRange.to) {return meetings;}

  return meetings.filter((meeting) => {
    const meetingDate = parseISO(meeting.meeting_date || meeting.created_at || '');
    return isWithinInterval(meetingDate, {
      start: dateRange.from,
      end: dateRange.to
    });
  });
};

// Helper function to format attendee names from emails
export const formatAttendeeNames = (emails: string[]): string => {
  if (!emails || emails.length === 0) {
    return 'Not Mentioned';
  }

  return emails.map((email) => {
    // Extract name from email (everything before @)
    const name = email.split('@')[0];
    // Capitalize first letter and replace dots/underscores with spaces
    return name
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }).join(', ');
};

// Helper function to format meeting date
export const formatMeetingDate = (dateString?: string): string => {
  if (!dateString) {
    return 'Not Mentioned';
  }

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return '[Invalid Date]';
  }
};

export const formatDuration = (duration: number | undefined | null): string => {
  if (duration === undefined || duration === null) {
    return '0 min';
  }

  // Convert decimal minutes to minutes and seconds
  const totalMinutes = Math.floor(duration);
  const seconds = Math.round((duration - totalMinutes) * 60);

  if (totalMinutes === 0) {
    return `${seconds} sec`;
  } else if (seconds === 0) {
    return `${totalMinutes} min`;
  } else {
    return `${totalMinutes} min ${seconds} sec`;
  }
};
