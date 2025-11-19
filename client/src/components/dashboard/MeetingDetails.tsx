import React from 'react';
import { Meeting, MeetingType } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Mail, Users, FileText, Tag, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface MeetingDetailsProps {
  meeting: Meeting;
  meetingTypes: MeetingType[];
  onClose?: () => void;
}

const MeetingDetails = ({ meeting, meetingTypes, onClose }: MeetingDetailsProps) => {
  const getMeetingTypeName = (id: string | null) => {
    if (!id) return 'Unknown';
    return meetingTypes.find(type => type.id === id)?.meeting_type || 'Unknown';
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP p'); // e.g., "April 15, 2023 at 3:30 PM"
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getTranscriptData = () => {
    if (meeting.transcript) {
      try {
        // Try to parse as JSON if it's a string
        if (typeof meeting.transcript === 'string') {
          try {
            const parsedData = JSON.parse(meeting.transcript);
            if (Array.isArray(parsedData)) {
              return parsedData;
            }
          } catch (e) {
            // Not valid JSON, proceed with text processing
          }
        }
        
        // Process as plain text if JSON parsing fails
        const lines = meeting.transcript.split('\n').filter(line => line.trim().length > 0);
        return lines.map((line, index) => {
          const parts = line.split(':');
          return {
            speaker: parts.length > 1 ? parts[0].trim() : 'Speaker',
            text: parts.length > 1 ? parts.slice(1).join(':').trim() : line
          };
        });
      } catch (e) {
        console.error('Error parsing transcript:', e);
        return [];
      }
    }
    return [];
  };

  const transcriptData = getTranscriptData();

  return (
    <div className="flex flex-col h-full pt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{meeting.title || 'Untitled Meeting'}</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start space-x-2">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Date & Time</h4>
                <p className="text-sm text-muted-foreground">
                  {formatDate(meeting.meeting_date || meeting.created_at || '')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Duration</h4>
                <p className="text-sm text-muted-foreground">{meeting.duration} minutes</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Host</h4>
                <p className="text-sm text-muted-foreground">{meeting.host_email || 'No host specified'}</p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Participants</h4>
                <p className="text-sm text-muted-foreground">
                  {meeting.participants_email && meeting.participants_email.length > 0 
                    ? meeting.participants_email.join(', ')
                    : 'No participants'}
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              {meeting.summary_meta_data && (
                <div className="space-y-4 mt-4">
                  {Object.entries(meeting.summary_meta_data).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <h4 className="text-sm font-semibold capitalize">{key.replace(/_/g, ' ')}</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="transcript">
              {meeting.transcript && (
                <div className="space-y-4 mt-4">
                  <p className="text-sm whitespace-pre-wrap">{meeting.transcript}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};

export default MeetingDetails;
