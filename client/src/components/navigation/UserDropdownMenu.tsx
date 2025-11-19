import { useMeetingTypesControllerFindAll } from '@/api/generated/knowtedAPI';
import type { MeetingTypeResponse } from '@/api/generated/models/meetingTypeResponse';
import MeetingCaptureDialog from '@/components/dashboard/MeetingCaptureDialog';
import InvitationDialog from '@/components/invitations/InvitationDialog';
import InvitationNotification from '@/components/invitations/InvitationNotification';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Plus, Settings, User } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserDropdownMenuProps {
  email: string;
  onLogout: () => void;
}

const UserDropdownMenu = ({ email, onLogout }: UserDropdownMenuProps) => {
  const navigate = useNavigate();
  const { state, closeMobileSidebar } = useSidebar();
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
  const [isCaptureDialogOpen, setIsCaptureDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { organization, currentPlan } = useAuth();

  // Fetch meeting types for the capture dialog
  const { data: meetingTypes = [], isLoading: isMeetingTypesLoading } =
    useMeetingTypesControllerFindAll<MeetingTypeResponse[]>(
      {
        organization_id: organization?.id || ''
      },
      {
        query: {
          enabled: !!organization?.id,
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000
        }
      }
    );

  // Check if monthly limit has been exceeded
  const isMonthlyLimitExceeded = currentPlan && currentPlan.canInviteKnowted === false;

  const handleNavigation = (path: string) => (e: React.MouseEvent): void => {
    e.preventDefault();
    // Close mobile sidebar when navigating
    closeMobileSidebar();
    // Close dropdown when navigating
    setIsDropdownOpen(false);
    navigate(path);
  };

  const handleViewInvitations = (): void => {
    setIsInvitationDialogOpen(true);
    // Close dropdown when opening invitation dialog
    setIsDropdownOpen(false);
  };

  const handleLogout = (): void => {
    // Close mobile sidebar when logging out
    closeMobileSidebar();
    // Close dropdown when logging out
    setIsDropdownOpen(false);
    onLogout();
  };

  return (
    <>
       {/* Add to Live Meeting Button */}

      {/* Invitation notification - shown outside dropdown to avoid nesting issues */}
      <div className="mt-2 group-data-[collapsible=icon]:hidden">
        <InvitationNotification onViewInvitations={handleViewInvitations} />
      </div>
       <div className="mb-2 group-data-[collapsible=icon]:hidden">
        <Button
          onClick={() => {
            if (meetingTypes.length > 0) {
              setIsCaptureDialogOpen(true);
              // Close dropdown when opening capture dialog
              setIsDropdownOpen(false);
            }
          }}
          className={`w-full font-semibold h-10 px-5 rounded-lg shadow-sm ${
            isMonthlyLimitExceeded
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-background text-primary hover:bg-accent hover:text-accent-foreground'
          }`}
          type="button"
          disabled={isMeetingTypesLoading || !organization?.id || meetingTypes.length === 0 || isMonthlyLimitExceeded}
          title={isMonthlyLimitExceeded ? 'Monthly limit exceeded. Please upgrade your plan to continue.' : undefined}
        >
          <Plus className="w-4 h-4 mr-2" />
          {isMeetingTypesLoading ? 'Loading...' : meetingTypes.length === 0 ? 'No meeting types' : 'Add to live meeting'}
        </Button>
      </div>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start bg-white/10 text-sidebar-foreground border-white/20 hover:bg-white/20 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
            title={state === 'collapsed' ? email : undefined}
          >
            <User className="h-4 w-4 mr-2 group-data-[collapsible=icon]:mr-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">{email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleNavigation('/organization/details')}>
            <Settings className="mr-2 h-4 w-4" />
            organization Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Invitation dialog */}
      <InvitationDialog
        isOpen={isInvitationDialogOpen}
        onClose={() => setIsInvitationDialogOpen(false)}
      />

      {/* Meeting Capture Dialog */}
      {meetingTypes.length > 0 && (
        <MeetingCaptureDialog
          isOpen={isCaptureDialogOpen}
          onClose={() => setIsCaptureDialogOpen(false)}
          organizationId={organization?.id || ''}
          meetingTypes={meetingTypes}
        />
      )}
    </>
  );
};

export default UserDropdownMenu;
