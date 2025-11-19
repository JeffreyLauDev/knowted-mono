
import type { TranscriptSegmentDto } from '@/api/generated/models';
import React from 'react';

interface TranscriptListProps {
  transcript: TranscriptSegmentDto[];
  onTimestampClick: (timestamp: string, e: React.MouseEvent) => void;
}

const TranscriptList = ({ transcript, onTimestampClick }: TranscriptListProps): JSX.Element => {
  const formatTime = (timeInSeconds: number | undefined): string => {
    if (!timeInSeconds) {
      return '00:00';
    }
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getBackgroundColorClass = (speakerName: string | undefined | null): string => {
    // Handle cases where speaker might be undefined or null
    if (!speakerName) {
      return 'bg-gray-100'; // Default color for unknown speakers
    }
    
    // Generate consistent colors based on speaker name hash
    const colors = ['bg-green-100', 'bg-blue-100', 'bg-purple-100', 'bg-yellow-100', 'bg-pink-100', 'bg-orange-100'];
    const hash = speakerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % colors.length;
    return colors[index];
  };

  console.log('transcripttranscripttranscript', transcript);
  return (
    <div className="space-y-4 px-[54px] py-[27px]">
      {transcript && transcript.length > 0 ? (
        transcript
          .filter(line => line && typeof line === 'object') // Filter out invalid items
          .map((line, index) => (
          <div key={index} className="flex gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getBackgroundColorClass(line.speaker)} text-black shrink-0`}>
              {line.speaker?.[0] ?? '?'}
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <p className="font-medium text-sm text-black">{line.speaker || 'Unknown'}</p>
                <span
                  className="text-xs text-primary cursor-pointer hover:underline"
                  onClick={(e) => onTimestampClick(formatTime(line.start), e)}
                >
                  {formatTime(line.start)}
                </span>
              </div>
              <p className="text-sm text-black whitespace-pre-wrap">
                {line.conversation ? line.conversation.trim().replace(/\s+/g, ' ') : 'No content available'}
              </p>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          No transcript available
        </div>
      )}
    </div>
  );
};

export default TranscriptList;
