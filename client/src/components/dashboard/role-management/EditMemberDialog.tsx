import type { OrganizationMemberResponseDto, TeamInfoDto } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { FileText } from 'lucide-react';

interface EditMemberDialogProps {
  open: boolean;
  onClose: () => void;
  member: OrganizationMemberResponseDto;
  permissionGroups: TeamInfoDto[];
  currentUserId?: string;
  onUpdateMember?: (
    memberId: string,
    updates: Partial<{ first_name?: string; last_name?: string; email?: string; team_id?: string }>
  ) => Promise<void>;
}

export const EditMemberDialog = ({
  open,
  onClose,
  member,
  permissionGroups,
  currentUserId,
  onUpdateMember
}: EditMemberDialogProps): JSX.Element => {
  const isEditingOwnProfile = member?.id === currentUserId;

  const handleClose = (): void => {
    // Small delay to prevent flickering
    setTimeout(() => {
      onClose();
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    const teamId = formData.get('group') as string;

    try {
      if (member?.id && onUpdateMember) {
        // Update the team
        await onUpdateMember(member.id, { team_id: teamId });
        handleClose();
      }
    } catch (error) {
      console.error('❌ EditMemberDialog: Error in handleSubmit:', error);
    }
  };

  // Get the current team ID by finding the matching team name
  const getCurrentTeamId = (): string => {
    if (member?.team && permissionGroups.length > 0) {
      const matchingTeam = permissionGroups.find((group) => group.name === member.team);
      if (matchingTeam) {return matchingTeam.id;}
    }
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            {isEditingOwnProfile ? 'Edit My Profile' : 'Edit Team Member'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={member?.email || ''}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group">Team</Label>
            <Select
              name="group"
              defaultValue={getCurrentTeamId()}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {permissionGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
