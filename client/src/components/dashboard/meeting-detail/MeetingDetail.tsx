import { useMeetingsControllerUpdate } from '@/api/generated/knowtedAPI';
import type { MeetingResponseDto, MeetingTypeResponse, TranscriptJsonDto } from '@/api/generated/models';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { formatAttendeeNames, formatDuration, formatMeetingDate } from '@/utils/dateUtils';
import { debounce } from 'lodash';
import { Calendar, Clock, Tag, Users } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import MeetingContent from './MeetingContent';
import { VideoPlayer, type VideoPlayerRef } from './VideoPlayer';

interface MeetingDetailProps {
  meeting: MeetingResponseDto;
  meetingTypes?: MeetingTypeResponse[];
  onUpdate?: (updates: Partial<MeetingResponseDto>) => void;
  onSaveComplete?: () => void;
  activeTab: 'summary' | 'transcript' | 'analysis' | 'chapters';
  isSharedMode?: boolean;
  shareToken?: string;
}

const MeetingDetail = ({
  meeting,
  meetingTypes = [],
  onUpdate,
  onSaveComplete,
  activeTab,
  isSharedMode = false,
  shareToken
}: MeetingDetailProps): JSX.Element => {
  const videoPlayerRef = useRef<VideoPlayerRef>(null);

  // Debug logging to track when this component renders
  console.warn('🎬 MeetingDetail: Component rendered', {
    meetingId: meeting?.id,
    meetingTitle: meeting?.title,
    activeTab,
    isSharedMode,
    timestamp: new Date().toISOString()
  });

  // Always call the hook but conditionally use its result
  const updateMeetingMutation = useMeetingsControllerUpdate({
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
          toast.success('Meeting updated successfully');
        }
      }
    }
  });

  const debouncedUpdate = useCallback(
    debounce(async (updates: Partial<MeetingResponseDto>) => {
      // In shared mode, don't allow updates
      if (isSharedMode) {
        console.warn('Updates not allowed in shared mode');
        return;
      }

      if (!meeting) {
        return;
      }
      if (onUpdate) {
        onUpdate(updates);
      } else {
        try {
          await updateMeetingMutation.mutateAsync({
            id: meeting?.id,
            data: updates,
            params: { organization_id: meeting?.organization?.id as string }
          });
        } catch (error) {
          console.error('Error updating meeting:', error);
        }
      }
    }, 1000),
    [onUpdate, meeting?.id, meeting?.organization?.id, updateMeetingMutation, isSharedMode]
  );

  const handleMeetingTypeChange = (meetingTypeId: string): void => {
    // In shared mode, don't allow meeting type changes
    if (isSharedMode) {
      console.warn('Meeting type changes not allowed in shared mode');
      return;
    }

    if (onUpdate) {
      // Find the selected meeting type to pass the full object
      const selectedType = meetingTypes.find((type) => type.id === meetingTypeId);
      if (selectedType) {
        onUpdate({ meetingType: selectedType });
      }
    } else {
      // Update directly through the API using the meeting_type_id field
      debouncedUpdate({ meeting_type_id: meetingTypeId } as Partial<MeetingResponseDto>);
    }
  };

  const getTranscriptLines = (): TranscriptJsonDto['data'] => {
    if (meeting?.transcript_json) {
      try {
        const transcriptData = typeof meeting.transcript_json === 'object'
          ? meeting.transcript_json
          : JSON.parse(meeting.transcript_json);

        if (transcriptData?.data && Array.isArray(transcriptData.data)) {
          return transcriptData.data;
        }
      } catch (e) {
        console.error('Error parsing transcript JSON:', e);
      }
    }

    return [];
  };

  const transcript = getTranscriptLines();

  // Add early return if meeting is not available
  if (!meeting) {
    return <div>Loading meeting...</div>;
  }

  return (
    <div className="relative min-h-full">
      <div className="space-y-4 pb-20">
        {/* Page Header */}
        <div className="px-6 py-4 border-b border-gray-200 mb-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-800">
                {formatMeetingDate(meeting.meeting_date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-800">
                {formatAttendeeNames(meeting.participants_email)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-800">{formatDuration(meeting.duration_mins)}</span>
            </div>
            {!isSharedMode && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-500" />
                <Select
                  value={meeting.meetingType?.id || ''}
                  onValueChange={handleMeetingTypeChange}
                >
                  <SelectTrigger className="w-32 h-7 text-xs border-gray-300 bg-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id} className="text-xs">
                        {type.name || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="px-6">
        {meeting.video_url && meeting.organization?.id && (
          <VideoPlayer
            ref={videoPlayerRef}
            meetingId={meeting.id}
            organizationId={meeting.organization.id}
            initialOptions={{ format: 'progressive', quality: '720p' }}
            shareToken={shareToken || undefined}
          />
        )}
        </div>
        <MeetingContent
          meeting={meeting}
          transcript={transcript}
          onUpdate={onUpdate}
          onSaveComplete={onSaveComplete}
          activeTab={activeTab}
          isSharedMode={isSharedMode}
          onChapterTimeClick={(timestamp: string): void => {
            if (videoPlayerRef.current) {
              videoPlayerRef.current.seekToTimestamp(timestamp);
            } else {
              console.error('❌ VideoPlayer ref is null');
            }
          }}
        />
      </div>
    </div>
  );
};

export default MeetingDetail;
