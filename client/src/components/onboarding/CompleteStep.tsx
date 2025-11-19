import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { CheckCircle2 } from 'lucide-react';

interface CompleteStepProps {
  isOnlyJoiningOrganizations?: boolean;
  onComplete?: () => void;
  loading?: boolean;
}

const CompleteStep = ({
  isOnlyJoiningOrganizations = false,
  onComplete,
  loading = false
}: CompleteStepProps): JSX.Element => {
    const { onboardingData } = useOnboarding();
  const { organization } = useAuth();

  // Use the prop to determine the user's onboarding path
  const isOnlyJoiningExisting = isOnlyJoiningOrganizations;

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 lg:mb-8">
        <div className="flex justify-center mb-3 lg:mb-4">
          <div className="p-2 lg:p-3 rounded-full bg-primary/10 text-primary">
            <CheckCircle2 size={20} className="lg:w-6 lg:h-6" />
          </div>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-foreground mb-2 lg:mb-3">
          {isOnlyJoiningExisting ? 'Onboarding Complete!' : 'Complete Your Setup'}
        </h1>
        <p className="text-sm lg:text-base text-gray-600 dark:text-muted-foreground max-w-2xl mx-auto">
          {isOnlyJoiningExisting
            ? 'You have successfully joined your organization. You can now access the dashboard.'
            : 'You\'re almost done! Complete your organization setup to get started.'
          }
        </p>
      </div>

      {/* Content */}
      {isOnlyJoiningExisting ? (
        // User joined existing organization - show completion message
        <div className="text-center space-y-6">
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-lg p-6">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-2">
              Welcome to {organization?.name || 'your organization'}!
            </h3>
            <p className="text-gray-700 dark:text-foreground">
              You have successfully joined the organization and can now access all features.
            </p>
          </div>

          <Button
            onClick={onComplete}
            disabled={loading}
            className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Go to Dashboard'}
          </Button>
        </div>
      ) : (
        // User creating new organization - show setup summary
        <div className="space-y-6">
          {/* Organization Summary */}
          <div className="bg-gray-50 dark:bg-muted rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">Organization Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-muted-foreground">Organization Name:</span>
                <span className="font-medium text-foreground">{onboardingData.organizationName || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-muted-foreground">Website:</span>
                <span className="font-medium text-foreground">{onboardingData.website || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-muted-foreground">Team Size:</span>
                <span className="font-medium text-foreground">{onboardingData.teamSize || 'Not set'}</span>
              </div>
            </div>
          </div>

          {/* Complete Button */}
          <Button
            onClick={onComplete}
            disabled={loading}
            className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Complete Setup'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CompleteStep;
