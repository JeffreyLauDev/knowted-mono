import { usePaymentControllerGetCurrentPlan } from '@/api/generated/knowtedAPI';
import type { CurrentPlanDto } from '@/api/generated/models';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

export const useSubscriptionCheck = (): {
  hasActiveSubscription: boolean;
  isLoading: boolean;
  redirectToPayment: () => void;
  currentPlan: CurrentPlanDto | null;
} => {
  const { organization, user } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { data: currentPlanResponse, isLoading: currentPlanLoading } =
    usePaymentControllerGetCurrentPlan(
      { organization_id: organization?.id || '' },
      {
        query: {
          enabled: !!organization?.id && !!user,
          refetchInterval: 30000, // Refetch every 30 seconds
          retry: 3,
          retryDelay: 1000
        }
      }
    );

  useEffect(() => {
    if (organization?.id && !currentPlanLoading && currentPlanResponse !== undefined) {
      // Check if there's an active subscription using the new API format
      const currentPlan = currentPlanResponse as CurrentPlanDto;
      // Consider users with active subscription OR in trial as having "active subscription"
      // This prevents payment popups from showing for trial users
      const hasActive = currentPlan?.hasSubscription && (currentPlan?.isActive || currentPlan?.isTrial);

      // Log subscription check details for debugging
      // 
      setHasActiveSubscription(hasActive);
      setIsLoading(false);
    } else if (!organization?.id) {
      setHasActiveSubscription(false);
      setIsLoading(false);
    }
  }, [organization?.id, currentPlanLoading, currentPlanResponse]);

  const redirectToPayment = (): void => {
    if (!organization?.id) {
      return;
    }

    // Stripe payment link for 7-day free trial
    const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_eVq4gyfGG7Bf2y12HN43S03';
    const userEmail = user?.email || '';
    const paymentLinkWithMetadata = `${STRIPE_PAYMENT_LINK}?client_reference_id=${organization.id}&prefilled_email=${userEmail}`;

    window.location.href = paymentLinkWithMetadata;
  };

  return {
    hasActiveSubscription,
    isLoading: isLoading || currentPlanLoading,
    redirectToPayment,
    currentPlan: currentPlanResponse as CurrentPlanDto | null
  };
};
