import { useMeetingsControllerAddToLiveMeeting } from '@/api/generated/knowtedAPI';
import type { MeetingTypeResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';

interface MeetingCaptureData {
  meetingName: string;
  meetingLink: string;
  meetingType: string;
  language: string;
}

interface MeetingCaptureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  meetingTypes: MeetingTypeResponse[];
  onStartCapture?: (meetingData: MeetingCaptureData) => Promise<void>;
}

const MeetingCaptureDialog = ({
  isOpen,
  onClose,
  organizationId,
  meetingTypes = [],
  onStartCapture
}: MeetingCaptureDialogProps) => {
  const [meetingName, setMeetingName] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [meetingType, setMeetingType] = useState('');

  // Use the React Query hook for the mutation
  const addToLiveMeetingMutation = useMeetingsControllerAddToLiveMeeting({
    mutation: {
      onSuccess: (data) => {
        if (data.success) {
          toast.success('Successfully added to live meeting');
          onClose();
          // Reset form after successful submission
          setMeetingName('');
          setMeetingLink('');
          setMeetingType('');
        } else {
          toast.error(`Failed to start capture: ${data.message}`);
        }
      },
      onError: (error: any) => {
        console.error('Error starting capture:', error);
        toast.error(`Failed to start capture: ${error.response?.data?.message || error.message || 'Unknown error'}`);
      }
    }
  });
  const handleStartCapture = async () => {
    // Validate that organizationId is provided
    if (!organizationId) {
      toast.error('No organization selected. Please select an organization first.');
      return;
    }

    if (onStartCapture) {
      try {
        await onStartCapture({
          meetingName,
          meetingLink,
          meetingType,
          language
        });
        onClose();
        // Reset form after successful submission
        setMeetingName('');
        setMeetingLink('');
        setMeetingType('');
      } catch (error: any) {
        console.error('Error starting capture:', error);
        toast.error(`Error starting capture: ${  error.message || 'Unknown error'}`);
      }
    } else {
      // Use the React Query mutation
      addToLiveMeetingMutation.mutate({
        data: {
          meetingName,
          meetingLink,
          meetingType,
          language
        },
        params: {
          organization_id: organizationId
        }
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold">
            Add to live meeting
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor="meeting-name" className="text-lg font-medium">
              Name your meeting <span className="text-muted-foreground">(Optional)</span>
            </label>
            <Input
              id="meeting-name"
              placeholder="E.g. Product team sync"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="meeting-type" className="text-lg font-medium">
              Meeting type
            </label>
            <Select value={meetingType} onValueChange={setMeetingType}>
              <SelectTrigger id="meeting-type" className="h-12">
                <SelectValue placeholder="Select a meeting type" />
              </SelectTrigger>
              <SelectContent>
                {meetingTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="meeting-link" className="text-lg font-medium">
              Meeting link
            </label>
            <p className="text-muted-foreground">
              Capture meetings from GMeet, Zoom, MS teams, and <span className="underline">more</span>.
            </p>
            <div className="flex items-center">
              <div className="h-12 w-12 flex items-center justify-center border border-r-0 rounded-l-md bg-muted">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                id="meeting-link"
                placeholder="https://webex.com/example/eg.php?MTID=m475eadfgdycjd8sdv"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="h-12 rounded-l-none"
              />
            </div>
          </div>

        </div>

        <DialogFooter className="p-6 pt-2 bg-muted/30">
          <div className="flex w-full justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-12 px-6"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleStartCapture}
              className="h-12 px-6 bg-primary text-white"
              disabled={!meetingLink || !meetingType || addToLiveMeetingMutation.isPending}
            >
              {addToLiveMeetingMutation.isPending ? 'Starting...' : 'Start Capturing'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingCaptureDialog;
