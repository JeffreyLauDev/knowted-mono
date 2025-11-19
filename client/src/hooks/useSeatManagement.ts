import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import { PLAN_SEAT_LIMITS, useBilling, type CurrentPlan, type PlanTier } from './useBilling';

// Types for the new seat management APIs
export interface SeatValidationResponse {
  isValid: boolean;
  currentSeats: number;
  seatLimit: number;
  requiresUpgrade: boolean;
  suggestedPlan: string;
}

export interface SeatUsageResponse {
  currentSeats: number;
  planTier: string;
  seatLimit: number;
  usagePercentage: number;
}

export interface UpgradeCheckResponse {
  requiresUpgrade: boolean;
  currentPlan: string;
  recommendedPlan: string;
  reason?: string;
}

export const useSeatManagement = (): {
  currentPlan: CurrentPlan | null;
  seatUsage: SeatUsageResponse;
  upgradeCheck: UpgradeCheckResponse;
  validateSeatChange: (newSeatsCount: number) => SeatValidationResponse;
  validateUserInvitation: (additionalUsers?: number) => SeatValidationResponse;
  updateSeats: (newSeatsCount: number) => Promise<boolean>;
  getSeatUsage: () => SeatUsageResponse;
  checkUpgradeNeeded: () => UpgradeCheckResponse;
  canUpdateSeats: (newSeatsCount: number) => { canUpdate: boolean; requiredPlan?: PlanTier; reason?: string };
  getMinimumPlanForSeats: (seatsCount: number) => PlanTier;
  requiresPlanUpgrade: (currentPlanTier: PlanTier, newSeatsCount: number) => boolean;
} => {
  const { organization } = useAuth();
  const {
    currentPlan,
    updateSubscriptionSeats,
    canUpdateSeats,
    getMinimumPlanForSeats,
    requiresPlanUpgrade
  } = useBilling();

  // Helper function to validate seat changes locally (fallback until backend APIs are available)
  const validateSeatChange = (newSeatsCount: number): SeatValidationResponse => {
    if (!currentPlan) {
      return {
        isValid: false,
        currentSeats: 0,
        seatLimit: 0,
        requiresUpgrade: false,
        suggestedPlan: 'personal'
      };
    }

    const currentSeats = currentPlan.seatsCount || 0;
    const currentPlanTier = currentPlan.planTier?.toLowerCase() as PlanTier;
    const seatLimit = currentPlan.seatLimit || PLAN_SEAT_LIMITS[currentPlanTier] || 1;

    const isValid = newSeatsCount <= seatLimit;
    const requiresUpgrade = !isValid;
    const suggestedPlan = requiresUpgrade ? getMinimumPlanForSeats(newSeatsCount) : currentPlanTier;

    return {
      isValid,
      currentSeats,
      seatLimit,
      requiresUpgrade,
      suggestedPlan
    };
  };

  // Helper function to get current seat usage
  const getSeatUsage = (): SeatUsageResponse => {
    if (!currentPlan) {
      return {
        currentSeats: 0,
        planTier: 'free',
        seatLimit: 0,
        usagePercentage: 0
      };
    }

    const currentSeats = currentPlan.seatsCount || 0;
    const planTier = currentPlan.planTier?.toLowerCase() || 'free';
    const seatLimit = currentPlan.seatLimit || PLAN_SEAT_LIMITS[planTier as PlanTier] || 1;
    const usagePercentage = seatLimit > 0 ? Math.round((currentSeats / seatLimit) * 100) : 0;

    return {
      currentSeats,
      planTier,
      seatLimit,
      usagePercentage
    };
  };

  // Helper function to check if upgrade is needed
  const checkUpgradeNeeded = (): UpgradeCheckResponse => {
    const usage = getSeatUsage();

    if (usage.planTier === 'free') {
      return {
        requiresUpgrade: true,
        currentPlan: 'free',
        recommendedPlan: 'personal',
        reason: 'No active subscription'
      };
    }

    const isNearLimit = usage.usagePercentage >= 80;
    const isAtLimit = usage.usagePercentage >= 100;

    if (isAtLimit) {
      const nextPlan = getMinimumPlanForSeats(usage.currentSeats + 1);
      return {
        requiresUpgrade: true,
        currentPlan: usage.planTier,
        recommendedPlan: nextPlan,
        reason: 'Seat limit reached'
      };
    }

    if (isNearLimit) {
      return {
        requiresUpgrade: false,
        currentPlan: usage.planTier,
        recommendedPlan: usage.planTier,
        reason: 'Approaching seat limit'
      };
    }

    return {
      requiresUpgrade: false,
      currentPlan: usage.planTier,
      recommendedPlan: usage.planTier
    };
  };

  // Function to update seats with validation
  const updateSeats = async (newSeatsCount: number): Promise<boolean> => {
    if (!organization?.id) {
      toast.error('Organization not found');
      return false;
    }

    if (!currentPlan?.subscriptionId) {
      toast.error('No active subscription found');
      return false;
    }

    // Validate the seat change
    const validation = validateSeatChange(newSeatsCount);

    if (!validation.isValid) {
      toast.error(
        `Your current plan only supports up to ${validation.seatLimit} seats. ` +
        `You need to upgrade to the ${validation.suggestedPlan} plan to add more seats.`
      );
      return false;
    }

    try {
      await updateSubscriptionSeats(
        currentPlan.subscriptionId,
        newSeatsCount,
        (currentPlan.planTier?.toLowerCase() || 'personal'),
        (currentPlan.billingCycle === 'annual' ? 'yearly' : 'monthly')
      );
      toast.success(`Seats updated to ${newSeatsCount}`);
      return true;
    } catch (error) {
      console.error('Error updating seats:', error);
      toast.error('Failed to update seats');
      return false;
    }
  };

  // Function to validate before inviting users
  const validateUserInvitation = (additionalUsers = 1): SeatValidationResponse => {
    if (!currentPlan) {
      return {
        isValid: false,
        currentSeats: 0,
        seatLimit: 0,
        requiresUpgrade: true,
        suggestedPlan: 'personal'
      };
    }

    const currentSeats = currentPlan.seatsCount || 0;
    const newTotalSeats = currentSeats + additionalUsers;

    return validateSeatChange(newTotalSeats);
  };

  return {
    // Data
    currentPlan,
    seatUsage: getSeatUsage(),
    upgradeCheck: checkUpgradeNeeded(),

    // Functions
    validateSeatChange,
    validateUserInvitation,
    updateSeats,
    getSeatUsage,
    checkUpgradeNeeded,

    // Utility functions from useBilling
    canUpdateSeats,
    getMinimumPlanForSeats,
    requiresPlanUpgrade
  };
};
