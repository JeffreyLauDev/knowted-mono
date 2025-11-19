import { useTeamsControllerCreate, useTeamsControllerUpdate } from '@/api/generated/knowtedAPI';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import TeamAccessControl, { type TeamAccessControlRef } from './TeamAccessControl';

interface Team {
  id: string;
  name: string;
  description?: string;
  is_admin?: boolean;
}

interface CreateTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onTeamCreated: () => void;
  team?: Team;
  existingTeams?: Team[];
}

const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({
  open,
  onClose,
  onTeamCreated,
  team
}) => {
  const { toast } = useToast();
  const { organization } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [, setPermissions] = useState<unknown>(null);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const accessControlRef = useRef<TeamAccessControlRef>(null);

  const clearForm = (): void => {
    setTeamName('');
    setTeamDescription('');
    setSaving(false);
    setCreatedTeamId(null);
  };

  useEffect(() => {
    if (team) {
      setTeamName(team.name || '');
      setTeamDescription(team.description || '');
    } else {
      clearForm();
    }
  }, [team]);

  // Clear form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      clearForm();
    }
  }, [open]);

  const { mutateAsync: createTeam } = useTeamsControllerCreate();
  const { mutateAsync: updateTeam } = useTeamsControllerUpdate();

  const handleSave = async (): Promise<void> => {
    if (!teamName.trim()) {
      toast({
        title: 'Error',
        description: 'Team name is required',
        variant: 'destructive'
      });
      return;
    }

    if (!organization?.id) {
      toast({
        title: 'Error',
        description: 'No organization selected',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      let teamId = team?.id;
      if (team) {
        // Update existing team
        await updateTeam({
          id: team.id,
          data: {
            name: teamName,
            description: teamDescription
          },
          params: {
            organization_id: organization.id
          }
        });
        toast({
          title: 'Success',
          description: 'Team updated successfully'
        });
      } else {
        // Create new team
        const newTeam = await createTeam({
          data: {
            name: teamName,
            description: teamDescription
          },
          params: {
            organization_id: organization.id
          }
        });
        teamId = (newTeam as Team).id;
        setCreatedTeamId(teamId);
        toast({
          title: 'Success',
          description: 'Team created successfully'
        });
      }

      // Save permissions if they exist and we have a team ID
      if (teamId && accessControlRef.current) {
        const currentPermissions = accessControlRef.current.getCurrentPermissions();
        if (currentPermissions) {
          await accessControlRef.current.savePermissions();
        }
      }

      onTeamCreated();
      clearForm();
      onClose();
    } catch (error) {
      console.error('Error saving team:', error);
      toast({
        title: 'Error',
        description: 'Failed to save team',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (): void => {
    clearForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>{team ? 'Edit Team' : 'Create Team'}</DialogTitle>
          <DialogDescription>
            {team ? 'Update team details and permissions' : 'Create a new team in your organization and set permissions'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Team Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Team Details</h3>
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="Enter team description"
              />
            </div>
          </div>

          {/* Access Control Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Access Control</h3>
            <TeamAccessControl
              ref={accessControlRef}
              teamId={team?.id || createdTeamId}
              isAdminTeam={team?.is_admin || false}
              onPermissionsChange={setPermissions}
              showSaveButton={false}
              compact={true}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : team ? 'Update Team' : 'Create Team'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamDialog;
