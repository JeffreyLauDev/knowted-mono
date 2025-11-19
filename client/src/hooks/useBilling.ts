import {
  usePaymentControllerCancelSubscription,
  usePaymentControllerCreateBillingPortalSession,
  usePaymentControllerCreateCheckoutSession,
  usePaymentControllerGetCurrentPlan,
  usePaymentControllerGetInvoices,
  usePaymentControllerGetPaymentHistory,
  usePaymentControllerUpdateSubscriptionSeats
} from '@/api/generated/knowtedAPI';
import type {
  CheckoutSessionResponseDto,
  CurrentPlanDto,
  InvoiceItemDto,
  InvoiceResponseDto,
  PaymentHistoryItemDto,
  PaymentHistoryResponseDto
} from '@/api/generated/models';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';

// Use the generated types instead of custom interfaces
export type CurrentPlan = CurrentPlanDto;

export interface CustomerDetails {
  id: string;
  email: string;
  name: string;
}

export type PaymentHistoryItem = PaymentHistoryItemDto;
export type InvoiceItem = InvoiceItemDto;

// Plan seat limits for validation
export const PLAN_SEAT_LIMITS = {
  personal: 1,
  business: 5,
  company: 25
} as const;

export type PlanTier = keyof typeof PLAN_SEAT_LIMITS;

// Helper function to get the minimum plan tier for a given seat count
export const getMinimumPlanForSeats = (seatsCount: number): PlanTier => {
  if (seatsCount <= PLAN_SEAT_LIMITS.personal) {return 'personal';}
  if (seatsCount <= PLAN_SEAT_LIMITS.business) {return 'business';}
  if (seatsCount <= PLAN_SEAT_LIMITS.company) {return 'company';}
  return 'company'; // Fallback to company plan for very large seat counts
};

// Helper function to check if a seat count requires plan upgrade
export const requiresPlanUpgrade = (currentPlanTier: PlanTier, newSeatsCount: number): boolean => {
  const currentLimit = PLAN_SEAT_LIMITS[currentPlanTier];
  return newSeatsCount > currentLimit;
};

export const useBilling = (): {
  // Redirect flow
  createCheckoutSession: (planTier?: PlanTier, seatsCount?: number, billingCycle?: 'monthly' | 'annual') => Promise<void>;
  createBillingPortalSession: () => Promise<void>;

  // Subscription management
  cancelSubscription: (subscriptionId: string) => Promise<unknown>;
  updateSubscriptionSeats: (subscriptionId: string, seatsCount: number, planTier: string, billingCycle?: 'monthly' | 'yearly') => Promise<unknown>;

  // Data fetching
  currentPlan: CurrentPlan | null;
  paymentHistory: PaymentHistoryItem[];
  invoices: InvoiceItem[];
  customerDetails: CustomerDetails | null;

  // Loading states
  isLoading: boolean;
  isCurrentPlanLoading: boolean;
  isPaymentHistoryLoading: boolean;
  isInvoicesLoading: boolean;
  isCustomerLoading: boolean;

  // Errors
  error: undefined;
  currentPlanError: unknown;
  paymentHistoryError: unknown;
  invoicesError: unknown;
  customerError: unknown;

  // Utility functions
  getMinimumPlanForSeats: (seatsCount: number) => PlanTier;
  requiresPlanUpgrade: (currentPlanTier: PlanTier, newSeatsCount: number) => boolean;
  canUpdateSeats: (newSeatsCount: number) => { canUpdate: boolean; requiredPlan?: PlanTier; reason?: string };

  // Refetch functions
  refetchCurrentPlan: () => void;
  refetchPaymentHistory: () => void;
  refetchInvoices: () => void;
} => {
  const { organization } = useAuth();

  // API hooks
  const createCheckoutSessionMutation = usePaymentControllerCreateCheckoutSession();
  const createBillingPortalSessionMutation = usePaymentControllerCreateBillingPortalSession();
  const cancelSubscriptionMutation = usePaymentControllerCancelSubscription();
  const updateSubscriptionSeatsMutation = usePaymentControllerUpdateSubscriptionSeats();

  // Data fetching hooks
  const currentPlanQuery = usePaymentControllerGetCurrentPlan(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id,
        // Remove aggressive background refetching - only refetch when needed
        refetchOnWindowFocus: false,
        refetchOnMount: true
      }
    }
  );

  const paymentHistoryQuery = usePaymentControllerGetPaymentHistory(
    organization?.id || '',
    { limit: '10' },
    {
      query: {
        enabled: !!organization?.id,
        // Remove aggressive background refetching - only refetch when needed
        refetchOnWindowFocus: false,
        refetchOnMount: true
      }
    }
  );

  const invoicesQuery = usePaymentControllerGetInvoices(
    organization?.id || '',
    { limit: '10' },
    {
      query: {
        enabled: !!organization?.id,
        // Remove aggressive background refetching - only refetch when needed
        refetchOnWindowFocus: false,
        refetchOnMount: true
      }
    }
  );

  // Create checkout session for redirect flow
  const createCheckoutSession = async (
    planTier: PlanTier = 'personal',
    seatsCount = 1,
    billingCycle: 'monthly' | 'annual' = 'monthly'
  ): Promise<void> => {
    if (!organization?.id) {
      toast.error('Organization not found');
      return;
    }

    // Validate seat count against plan limits
    // Allow selecting higher tier plans for fewer seats, but prevent selecting lower tier plans for more seats
    if (seatsCount > PLAN_SEAT_LIMITS[planTier]) {
      const minimumPlan = getMinimumPlanForSeats(seatsCount);
      toast.error(`This plan only supports up to ${PLAN_SEAT_LIMITS[planTier]} seats. Please select the ${minimumPlan} plan for ${seatsCount} seats.`);
      return;
    }

    try {
      // Create checkout session
      console.warn('🔍 Creating checkout session with organization ID:', organization.id);
      createCheckoutSessionMutation.mutateAsync({
        data: {
          organizationId: organization.id,
          planTier: planTier,
          seatsCount: seatsCount,
          billingCycle: billingCycle === 'annual' ? 'year' : 'month'
        }
      }).then((result) => {
        // Redirect to Stripe Checkout
        // The backend returns { sessionId, url, organizationId, planName, seatsCount, billingCycle }
        if (result && typeof result === 'object' && 'url' in result) {
          window.location.href = (result as CheckoutSessionResponseDto).url;
        } else {
          toast.error('Failed to create checkout session');
        }
      }).catch((error) => {
        console.error('Error creating checkout session:', error);
        toast.error('Failed to create checkout session');
      });

      return; // Exit early since we're handling the async operation in the promise chain
    } catch (error: unknown) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to create checkout session');
    }
  };

  // Cancel subscription
  const cancelSubscription = async (subscriptionId: string): Promise<unknown> => {
    try {
      const result = await cancelSubscriptionMutation.mutateAsync({
        subscriptionId
      });

      toast.success('Subscription cancelled successfully');
      return result;
    } catch (error: unknown) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
      throw error;
    }
  };

  // Update subscription seats with validation
  const updateSubscriptionSeats = async (
    subscriptionId: string,
    seatsCount: number,
    planTier: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ): Promise<unknown> => {
    if (!organization?.id) {
      toast.error('Organization not found');
      return;
    }

    try {
      const result = await updateSubscriptionSeatsMutation.mutateAsync({
        subscriptionId,
        data: {
          seatsCount,
          tier: planTier as 'personal' | 'business' | 'company' | 'custom',
          billingCycle: billingCycle as 'monthly' | 'yearly'
        },
        params: {
          organization_id: organization.id
        }
      });
      // Refetch current plan data to show updated information
      await currentPlanQuery.refetch();

      toast.success('Subscription seats updated successfully');
      return result;
    } catch (error: unknown) {
      console.error('Error updating subscription seats:', error);
      toast.error('Failed to update subscription seats');
      throw error;
    }
  };

  // Create billing portal session
  const createBillingPortalSession = async (): Promise<void> => {
    if (!organization?.id) {
      toast.error('Organization not found');
      return;
    }

    try {
      const result = await createBillingPortalSessionMutation.mutateAsync({
        organizationId: organization.id,
        params: {
          return_url: `${window.location.origin}/organization/billing`
        }
      });

      // Redirect to the billing portal URL
      if (result && typeof result === 'object' && 'url' in result) {
        window.location.href = result.url;
        toast.success('Redirecting to billing portal...');
      } else {
        toast.error('Failed to create billing portal session');
      }
    } catch (error: unknown) {
      console.error('Error creating billing portal session:', error);
      toast.error('Failed to open billing portal');
    }
  };

  // Check if seats can be updated and provide guidance
  const canUpdateSeats = (newSeatsCount: number): { canUpdate: boolean; requiredPlan?: PlanTier; reason?: string } => {
    if (!currentPlanQuery.data) {
      return { canUpdate: false, reason: 'Unable to validate current plan' };
    }

    const currentPlanTier = (currentPlanQuery.data as CurrentPlanDto)?.planTier?.toLowerCase() as PlanTier;
    if (!currentPlanTier) {
      return { canUpdate: false, reason: 'Unable to determine current plan tier' };
    }

    if (requiresPlanUpgrade(currentPlanTier, newSeatsCount)) {
      const requiredPlan = getMinimumPlanForSeats(newSeatsCount);
      return {
        canUpdate: false,
        requiredPlan,
        reason: `Your current ${currentPlanTier} plan only supports up to ${PLAN_SEAT_LIMITS[currentPlanTier]} seats. You need to upgrade to the ${requiredPlan} plan.`
      };
    }

    return { canUpdate: true };
  };

  return {
    // Redirect flow
    createCheckoutSession,
    createBillingPortalSession,

    // Subscription management
    cancelSubscription,
    updateSubscriptionSeats,

    // Data - using generated types with proper type assertions
    currentPlan: currentPlanQuery.data && typeof currentPlanQuery.data === 'object' && 'hasSubscription' in currentPlanQuery.data
      ? currentPlanQuery.data as CurrentPlanDto
      : null,
    paymentHistory: paymentHistoryQuery.data &&
      typeof paymentHistoryQuery.data === 'object' &&
      'payments' in paymentHistoryQuery.data
      ? (paymentHistoryQuery.data as PaymentHistoryResponseDto).payments
      : [],
    invoices: invoicesQuery.data &&
      typeof invoicesQuery.data === 'object' &&
      'invoices' in invoicesQuery.data
      ? (invoicesQuery.data as InvoiceResponseDto).invoices
      : [],
    customerDetails: null,

    // Loading states
    isLoading: createCheckoutSessionMutation.isPending ||
               createBillingPortalSessionMutation.isPending ||
               cancelSubscriptionMutation.isPending ||
               updateSubscriptionSeatsMutation.isPending,
    isCurrentPlanLoading: currentPlanQuery.isLoading,
    isPaymentHistoryLoading: paymentHistoryQuery.isLoading,
    isInvoicesLoading: invoicesQuery.isLoading,
    isCustomerLoading: false,

    // Errors
    error: undefined,
    currentPlanError: currentPlanQuery.error,
    paymentHistoryError: paymentHistoryQuery.error,
    invoicesError: invoicesQuery.error,
    customerError: null,

    // Utility functions
    getMinimumPlanForSeats,
    requiresPlanUpgrade,
    canUpdateSeats,

    // Refetch functions
    refetchCurrentPlan: async () => {
      const result = await currentPlanQuery.refetch();
      return result;
    },
    refetchPaymentHistory: async () => {
      const result = await paymentHistoryQuery.refetch();
      return result;
    },
    refetchInvoices: async () => {
      const result = await invoicesQuery.refetch();
      return result;
    }
  };
};
