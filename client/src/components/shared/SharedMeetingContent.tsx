import type { MeetingResponseDto } from '@/api/generated/models';
import { VideoPlayer } from '@/components/dashboard/meeting-detail/VideoPlayer';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRef } from 'react';

interface SharedMeetingContentProps {
  meeting: MeetingResponseDto;
  shareToken?: string;
}

const SharedMeetingContent = ({ meeting, shareToken }: SharedMeetingContentProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleChapterClick = (timestamp: string) => {
    if (!videoRef.current) {return;}

    const [minutes, seconds] = timestamp.split(':').map(Number);
    const timeInSeconds = minutes * 60 + seconds;

    videoRef.current.currentTime = timeInSeconds;
    videoRef.current.play().catch((e) => console.error('Error playing video:', e));
  };

  const parseChapters = (chaptersText: string | null) => {
    if (!chaptersText) {return [];}
    return chaptersText.split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const match = /^(\d{2}:\d{2})\s(.+)$/.exec(line);
        return match ? {
          timestamp: match[1],
          title: match[2]
        } : null;
      })
      .filter((chapter) => chapter !== null);
  };

  const chapters = parseChapters(meeting.chapters);

  const formatTime = (timeInSeconds: number | undefined): string => {
    if (!timeInSeconds) {
      return '00:00';
    }
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
        {meeting.video_url && (meeting.organization || shareToken) ? (
          <VideoPlayer
            meetingId={meeting.id}
            organizationId={meeting.organization?.id || 'shared'}
            initialOptions={{ format: 'progressive', quality: '720p' }}
            shareToken={shareToken}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No video available for this meeting
          </div>
        )}
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <ScrollArea className="h-[500px]">
              <div className="p-6 space-y-6">
                {meeting.summary && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">Summary</h2>
                    <div className="prose dark:prose-invert max-w-none">
                      <p>{meeting.summary}</p>
                    </div>
                  </div>
                )}

                {chapters.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">Chapters</h2>
                    <div className="space-y-2">
                      {chapters.map((chapter, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-2"
                        >
                          <button
                            onClick={() => chapter && handleChapterClick(chapter.timestamp)}
                            className="text-primary font-mono hover:underline"
                          >
                            {chapter?.timestamp}
                          </button>
                          <span>{chapter?.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="transcript">
          <Card>
            <ScrollArea className="h-[500px]">
              <div className="p-6 space-y-4">
                {meeting.transcript_json?.data && meeting.transcript_json.data.length > 0 ? (
                  meeting.transcript_json.data.map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.speaker || 'Unknown'}</span>
                        <button
                          onClick={() => handleChapterClick(formatTime(item.start))}
                          className="text-xs text-primary font-mono hover:underline"
                        >
                          {formatTime(item.start)}
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.conversation || ''}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No transcript available</p>
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <ScrollArea className="h-[500px]">
              <div className="p-6">
                {meeting.summary_meta_data ? (
                  Object.entries(meeting.summary_meta_data).map(([key, value]) => (
                    <div key={key} className="mb-6">
                      <h3 className="text-lg font-semibold mb-2 capitalize">
                        {key.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {String(value)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No analysis available</p>
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SharedMeetingContent;
