import { usePaymentControllerGetCurrentPlan } from '@/api/generated/knowtedAPI';
import type { CurrentPlanDto } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

interface UsageIndicatorProps {
  className?: string;
}

export const UsageIndicator = ({ className }: UsageIndicatorProps): JSX.Element => {
  const { organization } = useAuth();

  const { data: currentPlan, isLoading, error } = usePaymentControllerGetCurrentPlan<
    CurrentPlanDto
  >(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id,
        refetchInterval: 30000 // Refetch every 30 seconds
      }
    }
  );

  if (isLoading) {
    return (
      <div className={`p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-16 mb-2"></div>
          <div className="h-1 bg-white/20 rounded w-full mb-2"></div>
          <div className="h-3 bg-white/20 rounded w-32 mb-2"></div>
          <div className="h-8 bg-white/20 rounded w-24"></div>
        </div>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className={`p-3 bg-red-500/10 backdrop-blur-sm rounded-lg border border-red-500/30 ${className}`}>
        <div className="text-red-300 text-sm">Failed to load usage data</div>
      </div>
    );
  }

  // Handle case where there's no current plan data
  if (!currentPlan) {
    return (
      <div className={`p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 ${className}`}>
        <div className="text-white/70 text-sm">Loading usage information...</div>
      </div>
    );
  }

  const {
    currentUsage,
    monthlyLimit,
    usagePercentage,
    planTier
  } = currentPlan || {};

  // Format plan tier display
  const formatPlanTier = (tier?: string): string => {
    if (!tier) {
      return 'Basic';
    }
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const planName = formatPlanTier(planTier);

  // Determine next plan tier and button text
  const getNextPlanInfo = (currentTier?: string): { nextTier: string | null; buttonText: string } => {
    switch (currentTier?.toLowerCase()) {
      case 'free':
        return { nextTier: 'Personal', buttonText: 'Get Personal Plan' };
      case 'personal':
        return { nextTier: 'Business', buttonText: 'Upgrade to Business' };
      case 'business':
        return { nextTier: 'Company', buttonText: 'Upgrade to Company' };
      case 'company':
        return { nextTier: null, buttonText: 'Contact Sales' };
      default:
        return { nextTier: 'Personal', buttonText: 'Get Personal Plan' };
    }
  };

  const { buttonText } = getNextPlanInfo(planTier);

  const handleUpgrade = (): void => {
    // Open billing page in a new tab where users can manage their subscription
    window.open('/organization/billing', '_blank');
  };

  return (
    <div className={`p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 ${className}`}>
      {/* Plan Name */}
      <h3 className="font-semibold text-white text-sm mb-2">{planName}</h3>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-white/20 rounded-full mb-2">
        <div
          className="h-1 bg-white rounded-full transition-all duration-300"
          style={{ width: `${Math.min(usagePercentage || 0, 100)}%` }}
        />
      </div>

      {/* Usage Text */}
      <p className="text-white/70 text-xs mb-3">
        {currentUsage || 0} of {monthlyLimit || 300} monthly mins used
      </p>

      {/* Upgrade Button */}
      <Button
        size="sm"
        variant="secondary"
        className="w-full border-white/30 font-medium text-xs py-1.5 backdrop-blur-sm"
        onClick={handleUpgrade}
      >
        {buttonText}
      </Button>
    </div>
  );
};
