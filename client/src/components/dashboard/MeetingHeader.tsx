
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MeetingHeaderProps {
  onCreateMeeting: () => void;
}

const MeetingHeader = ({ onCreateMeeting }: MeetingHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
        <p className="text-muted-foreground">
          View and manage all your meetings
        </p>
      </div>
      <Button onClick={onCreateMeeting}>
        <Plus className="mr-2 h-4 w-4" />
        Add Meeting
      </Button>
    </div>
  );
};

export default MeetingHeader;
