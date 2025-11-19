import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnboarding } from '@/context/OnboardingContext';
import { ArrowLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TeamSizeStep = (): JSX.Element => {
  const { onboardingData, updateTeamSize } = useOnboarding();
  const navigate = useNavigate();

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 lg:mb-8">
        <div className="flex justify-center mb-3 lg:mb-4">
          <div className="p-2 lg:p-3 rounded-full bg-primary/10 text-primary">
            <Users size={20} className="lg:w-6 lg:h-6" />
          </div>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-foreground mb-2 lg:mb-3">Team Size</h1>
        <p className="text-sm lg:text-base text-gray-600 dark:text-muted-foreground max-w-2xl mx-auto">
          How many people are in your organization? This helps us customize your experience.
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto space-y-4 lg:space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-foreground">
            Company Size
          </label>
          <Select
            value={onboardingData.teamSize}
            onValueChange={updateTeamSize}
          >
            <SelectTrigger className="h-10 lg:h-11 text-sm border-2 border-gray-200 dark:border-input focus:border-primary focus:ring-primary/20 transition-colors">
              <SelectValue placeholder="Select your team size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-10">1-10 employees</SelectItem>
              <SelectItem value="11-50">11-50 employees</SelectItem>
              <SelectItem value="51-200">51-200 employees</SelectItem>
              <SelectItem value="201-500">201-500 employees</SelectItem>
              <SelectItem value="501+">501+ employees</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-muted-foreground">
            This information helps us tailor features and recommendations for your organization size
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between pt-4 lg:pt-6 space-y-2 sm:space-y-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/onboarding/business-profile')}
            className="h-9 lg:h-10 px-4 lg:px-6 text-sm order-2 sm:order-1"
          >
            <ArrowLeft size={16} className="mr-2 lg:w-4 lg:h-4" />
            Back
          </Button>
          <Button
            type="button"
            onClick={() => navigate('/onboarding/complete')}
            disabled={!onboardingData.teamSize}
            className="h-9 lg:h-10 px-4 lg:px-6 text-sm bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamSizeStep;
