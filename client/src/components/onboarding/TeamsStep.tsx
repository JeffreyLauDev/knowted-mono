import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboarding } from '@/context/OnboardingContext';
import { Team } from '@/types';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const TeamsStep = () => {
  const { onboardingData, addTeam, removeTeam } = useOnboarding();
  const [teamName, setTeamName] = useState('');

  const handleAddTeam = () => {
    if (teamName.trim()) {
      const newTeam: Team = {
        id: uuidv4(),
        name: teamName,
        organization_id: '',
        members: [],
        created_at: new Date().toISOString(),
      };
      
      addTeam(newTeam);
      setTeamName('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-foreground">Create Teams</h2>
        <p className="text-sm text-gray-500 dark:text-muted-foreground">
          Create teams for your organization. You can add members to these teams later.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Enter team name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleAddTeam} disabled={!teamName.trim()}>
          Add Team
        </Button>
      </div>

      {onboardingData.teams.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Your Teams</h3>
          <div className="grid gap-2">
            {onboardingData.teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-muted rounded-md"
              >
                <span className="text-foreground">{team.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTeam(team.id)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {onboardingData.teams.length === 0 && (
        <div className="text-center p-6 bg-gray-50 dark:bg-muted rounded-md">
          <p className="text-gray-500 dark:text-muted-foreground">No teams added yet. Add your first team above.</p>
        </div>
      )}
    </div>
  );
};

export default TeamsStep;
