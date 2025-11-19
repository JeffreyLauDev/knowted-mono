import { useProfilesControllerUpdateProfile } from '@/api/generated/knowtedAPI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOnboarding } from '@/context/OnboardingContext';
import { toast } from '@/lib/toast';
import { User } from 'lucide-react';
import { useState } from 'react';

interface UserProfileStepProps {
  onComplete: () => void;
}

const UserProfileStep = ({ onComplete }: UserProfileStepProps): JSX.Element => {
  const { onboardingData, updateUserProfile } = useOnboarding();

  const [firstName, setFirstName] = useState(onboardingData.userProfile?.firstName || '');
  const [lastName, setLastName] = useState(onboardingData.userProfile?.lastName || '');

  const updateProfileMutation = useProfilesControllerUpdateProfile({
    mutation: {
      onSuccess: () => {
        // Update the onboarding context
        updateUserProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim()
        });

        toast.success('Profile updated successfully');
        onComplete();
      },
      onError: (error) => {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile. Please try again.');
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!firstName.trim()) {
      toast.error('Please enter your first name');
      return;
    }

    if (!lastName.trim()) {
      toast.error('Please enter your last name');
      return;
    }

    try {
      // Use the new API to update profile
      await updateProfileMutation.mutateAsync({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim()
        }
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 lg:mb-8">
        <div className="flex justify-center mb-3 lg:mb-4">
          <div className="p-2 lg:p-3 rounded-full bg-primary/10 text-primary">
            <User size={20} className="lg:w-6 lg:h-6" />
          </div>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-foreground mb-2 lg:mb-3">Let's get started</h1>
        <p className="text-sm lg:text-base text-gray-600 dark:text-muted-foreground max-w-md mx-auto">
          Tell us about yourself to personalize your experience
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-foreground">
            First Name
          </Label>
          <Input
            id="firstName"
            placeholder="Enter your first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="h-10 lg:h-11 text-sm border-2 border-gray-200 dark:border-input focus:border-primary focus:ring-primary/20 transition-colors"
          />
          <p className="text-xs text-gray-500 dark:text-muted-foreground">
            This is how we'll address you in the app
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-foreground">
            Last Name
          </Label>
          <Input
            id="lastName"
            placeholder="Enter your last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="h-10 lg:h-11 text-sm border-2 border-gray-200 dark:border-input focus:border-primary focus:ring-primary/20 transition-colors"
          />
          <p className="text-xs text-gray-500 dark:text-muted-foreground">
            Your last name for account identification
          </p>
        </div>

        <div className="pt-3 lg:pt-4">
          <Button
            type="submit"
            onClick={handleSubmit}
            className="w-full h-10 lg:h-11 text-sm lg:text-base font-medium bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 transition-all duration-200"
            disabled={updateProfileMutation.isPending || !firstName.trim() || !lastName.trim()}
          >
            {updateProfileMutation.isPending ? 'Updating...' : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UserProfileStep;

