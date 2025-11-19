import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Calendar } from 'lucide-react';
import CalendarIntegration from './CalendarIntegration';

interface CalendarIntegrationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const CalendarIntegrationModal: React.FC<CalendarIntegrationModalProps> = ({
  isOpen,
  onOpenChange
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </DialogTitle>
          <DialogDescription>
            Connect your Google or Microsoft calendars to automatically sync your meetings and events with this organization.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <CalendarIntegration />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalendarIntegrationModal;
