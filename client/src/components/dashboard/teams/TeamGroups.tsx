import { useTeamsControllerFindAll, useTeamsControllerRemove } from '@/api/generated/knowtedAPI';
import type { TeamResponseDto } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import CreateTeamDialog from './CreateTeamDialog';

const PermissionGroups = (): JSX.Element => {
  const { toast } = useToast();
  const { organization } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamResponseDto | null>(null);

  // Get teams
  const { data: teamsData, isLoading: teamsLoading, refetch } = useTeamsControllerFindAll(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );
    // Delete team mutation
  const { mutate: deleteTeam } = useTeamsControllerRemove({
    mutation: {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Team deleted successfully'
        });
        refetch();
      },
      onError: (error) => {
        console.error('Error deleting team:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete team',
          variant: 'destructive'
        });
      }
    }
  });

  const handleDeleteTeam = async (teamId: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this team?')) {return;}
    if (!organization?.id) {return;}

    try {
      deleteTeam({ id: teamId, params: { organization_id: organization.id } });
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = async (team: TeamResponseDto): Promise<void> => {
    setEditingTeam(team);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (): void => {
    setIsDialogOpen(false);
    setEditingTeam(null);
  };

  const teams = Array.isArray(teamsData) ? teamsData : [];

  return (
    <div className="space-y-8">
      {/* Teams Section */}
      <div>
        {/* Section Header */}
        <div className="py-6 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-1 sm:space-y-0">
              <h2 className="text-2xl font-bold text-foreground">All Teams</h2>
              <span className="text-sm text-muted-foreground">
                {teams.length} team{teams.length !== 1 ? 's' : ''} in your organization
              </span>
            </div>

            {/* Action Bar - Hidden on mobile, shown on desktop */}
            <div className="hidden sm:flex items-center justify-end">
              {/* Add Team - Desktop only */}
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Team
              </Button>
            </div>
          </div>
        </div>

        {/* Teams Table */}
        <div className="overflow-hidden">
          {teamsLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-md" />
                ))}
              </div>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium">No teams found</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Create your first team to organize your users and set permissions.
              </p>
            </div>
          ) : (
            <div className="">
              {/* Desktop Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-4 p-4 text-sm font-medium text-muted-foreground border-b border-border">
                <div className="col-span-6">Team name</div>
                <div className="col-span-5">Description</div>
                <div className="col-span-1"></div>
              </div>

              {teams.map((team, index) => (
                <div key={team.id} className={` transition-colors ${index < teams.length - 1 ? 'border-b border-border' : ''}`}>
                  {/* Desktop Layout */}
                  <div className="hidden sm:grid grid-cols-12 gap-4 p-4 items-start">
                    <div className="col-span-6">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{team.name}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-5">
                      <div className="text-sm text-muted-foreground">
                        {team.description || 'No description provided'}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(team)}
                          className="h-8 w-8 p-0 hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTeam(team.id)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="sm:hidden py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate">{team.name}</div>
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {team.description || 'No description provided'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-3 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(team)}
                          className="h-9 w-9 p-0 hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTeam(team.id)}
                          className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Team Dialog */}
      <CreateTeamDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        onTeamCreated={refetch}
        team={editingTeam}
        existingTeams={teams.filter((t) => t.id !== editingTeam?.id)}
      />

      {/* Floating Action Button - Mobile only */}
      <div className="fixed bottom-6 right-6 sm:hidden z-50">
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default PermissionGroups;
