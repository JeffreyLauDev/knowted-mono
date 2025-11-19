import type { MeetingTypeResponse } from '@/api/generated/models/meetingTypeResponse';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { useState } from 'react';
import MeetingTypeForm from './MeetingTypeForm';

interface MeetingTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meetingType: Partial<MeetingTypeResponse>) => void;
  meetingType?: MeetingTypeResponse;
}

const MeetingTypeDialog = ({
  isOpen,
  onClose,
  onSave,
  meetingType
}: MeetingTypeDialogProps): JSX.Element => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (data: Partial<MeetingTypeResponse>): void => {
    if (!data.name?.trim()) {
      toast.error('Meeting type name is required');
      return;
    }

    setIsLoading(true);
    onSave(data);
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] h-[80vh] max-h-[900px] flex flex-col overflow-hidden bg-background border-0 shadow-lg bg-white dark:bg-background">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="text-xl text-foreground font-semibold">
            {meetingType ? 'Edit Meeting Type' : 'Create Meeting Type'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1 text-sm">
            Configure the meeting type and define its analysis structure
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <MeetingTypeForm
            onSubmit={handleSubmit}
            onClose={onClose}
            meetingType={meetingType}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingTypeDialog;
