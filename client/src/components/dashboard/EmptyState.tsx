import { useMeetingTypesControllerFindAll } from '@/api/generated/knowtedAPI';
import { MeetingTypeResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import React, { useState } from 'react';
import MeetingCaptureDialog from './MeetingCaptureDialog';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  const { organization } = useAuth();
    const { data: meetingTypes = [] } = useMeetingTypesControllerFindAll<MeetingTypeResponse[]>({
    organization_id: organization?.id
  });

  const [isCaptureDialogOpen, setIsCaptureDialogOpen] = useState(false);

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      // Check if organization is available before opening the dialog
      if (!organization?.id) {
        toast.error('No organization selected. Please select an organization first.');
        return;
      }
      // If no onAction is provided, open the capture dialog
      setIsCaptureDialogOpen(true);
    }
  };

  return (
    <>
      <div
        className={`flex flex-col items-center justify-center p-8 text-center space-y-4 ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground max-w-sm">{description}</p>
        {actionLabel && (
          <Button onClick={handleAction}>{actionLabel}</Button>
        )}
      </div>

      {/* The MeetingCaptureDialog will be shown when isCaptureDialogOpen is true */}
      <MeetingCaptureDialog
        isOpen={isCaptureDialogOpen}
        onClose={() => setIsCaptureDialogOpen(false)}
        organizationId={organization?.id || ''}
        meetingTypes={meetingTypes || []}
      />
    </>
  );
};

export default EmptyState;
