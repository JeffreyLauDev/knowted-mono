import type { MeetingTypeDto } from '@/api/generated/models/meetingTypeDto';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOnboarding } from '@/context/OnboardingContext';
import { toast } from '@/lib/toast';
import { Trash } from 'lucide-react';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const MeetingTypesStep = (): JSX.Element => {
  const { onboardingData, addMeetingType, removeMeetingType } = useOnboarding();
  const [meetingType, setMeetingType] = useState('');

  const handleAddMeetingType = (): void => {
    if (meetingType.trim()) {
      const newMeetingType: MeetingTypeDto = {
        id: uuidv4(),
        name: meetingType
      };

      addMeetingType(newMeetingType);
      setMeetingType('');
      toast.success('Meeting type added successfully!');
    } else {
      toast.error('Meeting type cannot be empty.');
    }
  };

  const handleRemoveMeetingType = (id: string): void => {
    removeMeetingType(id);
    toast.success('Meeting type removed successfully!');
  };

  return (
    <Card className="shadow-sm overflow-hidden bg-white dark:bg-card">
      <CardHeader className="bg-primary text-primary-foreground">
        <CardTitle>Meeting Types</CardTitle>
        <CardDescription className="text-white/80">
          Add the types of meetings your team commonly holds.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="New Meeting Type"
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value)}
            />
            <Button onClick={handleAddMeetingType}>Add</Button>
          </div>
          <ScrollArea className="h-[200px] w-full rounded-md border dark:border-input p-4">
            {onboardingData.meetingTypes.length > 0 ? (
              <ul className="list-none p-0">
                {onboardingData.meetingTypes.map((type) => (
                  <li key={type.id} className="py-2 border-b dark:border-input last:border-b-0 flex items-center justify-between">
                    <span className="text-foreground">{type.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveMeetingType(type.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No meeting types added yet.</p>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default MeetingTypesStep;
