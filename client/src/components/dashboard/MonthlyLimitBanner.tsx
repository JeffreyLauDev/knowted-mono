import { useUsageEventsControllerGetCurrentUsage } from '@/api/generated/knowtedAPI';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, ArrowUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MonthlyLimitBanner = () => {
  const { organization } = useAuth();
  const navigate = useNavigate();

  const { data: usageData, isLoading } = useUsageEventsControllerGetCurrentUsage(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id,
        refetchInterval: 30000 // Refetch every 30 seconds
      }
    }
  );

  if (isLoading || !usageData || usageData.canInviteKnowted) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-1">
            Monthly Minutes Limit Reached
          </h3>
          <p className="text-sm text-red-700 mb-3">
            You've used {usageData.currentUsage} of {usageData.monthlyLimit} monthly minutes.
            You can no longer invite Knowted to new meetings until your usage resets on{' '}
            {new Date(usageData.resetDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/organization/billing')}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
            <div className="flex items-center gap-2 text-xs text-red-600">
              <Clock className="h-3 w-3" />
              <span>Resets on {new Date(usageData.resetDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
