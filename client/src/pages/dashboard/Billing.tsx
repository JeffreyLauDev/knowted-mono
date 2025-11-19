import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import GlowBorder from '@/components/ui/GlowBorder';
import { useAvailablePlans } from '@/hooks/useAvailablePlans';
import { useBilling } from '@/hooks/useBilling';
import { toast } from '@/lib/toast';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const Billing = (): JSX.Element => {
  const {
    createBillingPortalSession,
    createCheckoutSession,
    currentPlan: billingCurrentPlan,
    currentPlanError,
    isLoading,
    isCurrentPlanLoading,
    updateSubscriptionSeats,
    refetchCurrentPlan
  } = useBilling();

  const { plans, isLoading: plansLoading } = useAvailablePlans();

  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  // State for detailed pricing comparison
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  // State for seat selection per plan
  const [planSeats, setPlanSeats] = useState<Record<string, number>>({
    // Set reasonable defaults for each plan
    personal: 1,
    business: 1,
    company: 6
  });
  const [seatUpdateLoading, setSeatUpdateLoading] = useState(false);
  const [seatUpdateError, setSeatUpdateError] = useState<string | null>(null);

  // Add a flag to track when we're in the middle of a plan change
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  // Handle success/cancel redirects
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    if (success === 'true') {
      toast.success('Subscription successful! Welcome to Knowted.');
    } else if (canceled === 'true') {
      toast.error('Subscription was canceled.');
    }
  }, [searchParams]);

  // Handle API errors
  useEffect(() => {
    if (currentPlanError) {
      console.error('Current plan error:', currentPlanError);
      toast.error('Failed to load current plan details');
    }
  }, [currentPlanError]);

        // Sync local state with current plan data when it changes
  useEffect(() => {
    // Skip updates if we're in the middle of changing plans
    if (isChangingPlan) {
      return;
    }

    if (billingCurrentPlan?.seatsCount) {
      const planId = billingCurrentPlan.planName?.toLowerCase() || billingCurrentPlan.planTier?.toLowerCase() || 'free';
      setPlanSeats((prev) => {
        // Only update if the value actually changed
        if (prev[planId] === billingCurrentPlan.seatsCount) {
          return prev;
        }
        return {
          ...prev,
          [planId]: billingCurrentPlan.seatsCount
        };
      });
    }
  }, [
    billingCurrentPlan?.planName,
    billingCurrentPlan?.planTier,
    billingCurrentPlan?.seatsCount,
    billingCurrentPlan?.status,
    isChangingPlan
  ]);

  // Helper function to format currency
  const formatCurrency = (amount: number, currency = 'USD'): string => {
    return amount === 0
      ? 'Free'
      : new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency.toUpperCase(),
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to format status display
  const formatStatusDisplay = (status: string | null): string => {
    if (!status) { return 'Unknown'; }
    if (status === 'trialing') { return 'Trial'; }
    if (status === 'scheduled_for_cancellation') { return 'Scheduled for Cancellation'; }
    if (status === 'past_due') { return 'Past Due'; }
    if (status === 'incomplete') { return 'Incomplete'; }
    if (status === 'incomplete_expired') { return 'Expired'; }
    if (status === 'unpaid') { return 'Unpaid'; }
    if (status === 'paused') { return 'Paused'; }
    if (status === 'expired') { return 'Expired'; }
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Helper function to format cancellation date
  const formatCanceledAt = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get current plan info - memoized to prevent unnecessary recalculations
  const getCurrentPlanInfo = (): {
    id: string;
    name: string;
    price: number;
    status: string;
    renewal?: string;
    seats?: number;
    trialEnd?: string;
  } => {
    if (!billingCurrentPlan) {
      return { id: 'free', name: 'Free', price: 0, status: 'No active subscription' };
    }

    // Use the current plan data from the new API
    const planName = billingCurrentPlan.planName || 'Free';
    // Use the appropriate price based on the current billing cycle
    const planPrice = billingCurrentPlan.billingCycle === 'annual'
      ? (billingCurrentPlan.annualPrice || 0)
      : (billingCurrentPlan.monthlyPrice || 0);
    const planStatus = billingCurrentPlan.status || 'active';
    const seats = billingCurrentPlan.seatsCount;
    // Trial end date not available in DTO
    const trialEnd = billingCurrentPlan.isTrial ? new Date().toISOString() : null;
    const renewal = new Date().toISOString(); // Next billing date not available in DTO

    const planInfo = {
      id: billingCurrentPlan.planId || 'free',
      name: planName,
      price: planPrice,
      status: planStatus,
      renewal,
      seats,
      trialEnd
    };

    return planInfo;
  };

  const currentPlan = getCurrentPlanInfo();

    // Handler for updating seats for current plan
  const handleUpdateSeats = async (planId: string, seats: number): Promise<void> => {
    setSeatUpdateError(null);
    setSeatUpdateLoading(true);

    try {
      if (!billingCurrentPlan?.subscriptionId) {
        setSeatUpdateError('No active subscription found.');
        setSeatUpdateLoading(false);
        return;
      }

      // Set flag to indicate we're changing plans
      setIsChangingPlan(true);

      // Use the updated API that can handle both seats and plan changes
      await updateSubscriptionSeats(
        billingCurrentPlan.subscriptionId,
        seats,
        planId,
        billingPeriod === 'annual' ? 'yearly' : 'monthly'
      );

      // Wait for refetch to complete BEFORE updating local state
      await refetchCurrentPlan();

      // Now update local state after refetch is complete
      setPlanSeats((prev) => ({ ...prev, [planId]: seats }));

      setSeatUpdateLoading(false);
      toast.success('Seats updated successfully!');
    } catch (err: unknown) {
      const errorMsg = (err && typeof err === 'object' && 'message' in err) ? (err as { message?: string }).message : undefined;
      setSeatUpdateError(errorMsg || 'Failed to update seats.');
      setSeatUpdateLoading(false);
    } finally {
      // Always reset the flag
      setIsChangingPlan(false);
    }
  };

  // Handler for switching to a different plan
  const handleSwitchPlan = async (planId: string, seats: number): Promise<void> => {
    setSelectedPlan(planId);
    setSeatUpdateError(null);
    setSeatUpdateLoading(true);

    try {
      // Check if user has an existing subscription
      if (billingCurrentPlan?.subscriptionId) {
        // User has existing subscription - update it

        // Set flag to indicate we're changing plans
        setIsChangingPlan(true);

        await updateSubscriptionSeats(
          billingCurrentPlan.subscriptionId,
          seats,
          planId,
          billingPeriod === 'annual' ? 'yearly' : 'monthly'
        );

        // Wait for refetch to complete BEFORE updating local state
        await refetchCurrentPlan();

        // Now update local state after refetch is complete
        setPlanSeats((prev) => ({ ...prev, [planId]: seats }));

        setSeatUpdateLoading(false);
        toast.success('Plan updated successfully!');
      } else {
        // User has no subscription - create new one via checkout

        // Map plan ID to plan tier
        const planTierMap: Record<string, 'personal' | 'business' | 'company'> = {
          'personal': 'personal',
          'business': 'business',
          'company': 'company'
        };

        const planTier = planTierMap[planId];
        if (!planTier) {
          throw new Error('Invalid plan selected');
        }

        // Create checkout session for new subscription
        await createCheckoutSession(planTier, seats, billingPeriod);

        setSeatUpdateLoading(false);
        // Note: createCheckoutSession will redirect to Stripe, so we don't need to show success here
      }
    } catch (err: unknown) {
      const errorMsg = (err && typeof err === 'object' && 'message' in err) ? (err as { message?: string }).message : undefined;
      setSeatUpdateError(errorMsg || 'Failed to switch plan.');
      setSeatUpdateLoading(false);
    } finally {
      // Always reset the flag
      if (billingCurrentPlan?.subscriptionId) {
        setIsChangingPlan(false);
      }
    }
  };

  if (plansLoading || isCurrentPlanLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Loading plans...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Plans & Billing</h1>
            <p className="text-muted-foreground text-sm">
              Choose plans for starting solo, growing your projects, and collaborating with your team.
            </p>
          </div>

        </div>

        {/* Current Subscription Section */}
        <div className="mb-6 rounded-lg bg-muted/50 p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">Current Subscription</span>
            <span className="text-xs font-semibold text-muted-foreground">
              {isCurrentPlanLoading ? 'Updating...' : formatStatusDisplay(currentPlan.status)}
            </span>
                      </div>

            {/* Show cancellation date when scheduled for cancellation */}
            {!isCurrentPlanLoading && currentPlan.status === 'scheduled_for_cancellation' && billingCurrentPlan?.canceledAt && (
              <div className="my-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs text-amber-700">
                  ⚠️ Your subscription will be cancelled on{' '}
                  <span className="font-semibold">
                    {formatCanceledAt(billingCurrentPlan.canceledAt)}
                  </span>
                </p>
              </div>
            )}

          {isCurrentPlanLoading ? (
            <div className="text-xs text-muted-foreground">Loading current plan details...</div>
          ) : (
            <div className="space-y-2">
              {/* Plan Details */}
              <div className="text-xs text-muted-foreground">
                <span>
                  You're currently subscribed to:
                  <span className="font-semibold ml-1">{currentPlan.name}</span>
                  {currentPlan.seats && (
                    <span> ({currentPlan.seats} seat{currentPlan.seats > 1 ? 's' : ''})</span>
                  )}
                  {billingCurrentPlan?.billingCycle && (
                    <span> ({billingCurrentPlan.billingCycle === 'annual' ? 'Annual' : 'Monthly'} billing)</span>
                  )}
                  {currentPlan.price > 0 && (
                    <span> at {formatCurrency(
                      billingCurrentPlan?.billingCycle === 'annual'
                        ? currentPlan.price * currentPlan.seats * 12
                        : currentPlan.price * currentPlan.seats
                    )}/{billingCurrentPlan?.billingCycle === 'annual' ? 'year' : 'month'} total.</span>
                  )}
                </span>
              </div>

              {/* Compact Billing & Usage Info */}
              {billingCurrentPlan && (
                <div className="flex flex-wrap gap-4 text-xs">
                  {billingCurrentPlan.billingCycle && (
                    <span className="text-muted-foreground">
                      <span className="font-medium">Cycle:</span> {billingCurrentPlan.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                    </span>
                  )}
                  {billingCurrentPlan.usageResetDate && (
                    <span className="text-muted-foreground">
                      <span className="font-medium">Resets:</span> {formatDate(billingCurrentPlan.usageResetDate)}
                    </span>
                  )}
                  {billingCurrentPlan.currentUsage !== null && billingCurrentPlan.monthlyLimit && (
                    <span className="text-muted-foreground">
                      <span className="font-medium">Usage:</span> {billingCurrentPlan.currentUsage}/{billingCurrentPlan.monthlyLimit} mins
                    </span>
                  )}
                  {billingCurrentPlan.usagePercentage !== null && (
                    <span className="text-muted-foreground">
                      <span className="font-medium">Progress:</span> {Math.round(billingCurrentPlan.usagePercentage)}%
                    </span>
                  )}
                </div>
              )}

                            {/* Action Button & Status */}
              <div className="flex justify-between items-center pt-1">
                {billingCurrentPlan?.hasSubscription && billingCurrentPlan.subscriptionId ? (
                  <button
                    onClick={createBillingPortalSession}
                    className="text-xs text-muted-foreground hover:text-primary underline cursor-pointer"
                  >
                    Manage your payment preferences, or change your plan below.
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No active subscription - select a plan below to manage billing
                  </span>
                )}

                {billingCurrentPlan?.cancelAtPeriodEnd && (
                  <span className="text-xs text-orange-600 font-medium">
                    ⚠️ Subscription will cancel at period end
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section Separator */}
        <div className="border-t border-border my-8"></div>

        {/* Billing Toggle */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Monthly
            {billingCurrentPlan?.billingCycle === 'monthly' && (
              <span className="ml-1 text-xs opacity-75">(Current)</span>
            )}
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              billingPeriod === 'annual'
                ? 'bg-green-700 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Annual <span className="text-mint-500">
              {(() => {
                // Calculate average savings across all plans
                const savings = plans
                  .filter((plan) => plan.monthlyPrice > 0 && plan.annualPrice > 0)
                  .map((plan) => ((plan.monthlyPrice - plan.annualPrice) / plan.monthlyPrice) * 100)
                  .reduce((sum, val) => sum + val, 0) /
                  Math.max(1, plans.filter((plan) => plan.monthlyPrice > 0 && plan.annualPrice > 0).length);
                return `(Save ${Math.round(savings)}%)`;
              })()}
            </span>
            {billingCurrentPlan?.billingCycle === 'annual' && (
              <span className="ml-1 text-xs opacity-75">(Current)</span>
            )}
          </button>
        </div>

        {/* Section Separator */}
        <div className="border-t border-border my-8"></div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-4 gap-8 mb-16 items-stretch">
          {plans.map((plan) => {
            // Check if this is the current plan (considering both plan and billing cycle for legacy plans)
            const isCurrentPlan = billingCurrentPlan && (
              (billingCurrentPlan.planName === plan.name ||
               billingCurrentPlan.planTier?.toLowerCase() === plan.id) &&
              // If billingCycle is null, assume it matches the current billing period
              // Otherwise, check if it matches the plan interval
              (billingCurrentPlan.billingCycle === null ||
               billingCurrentPlan.billingCycle === (plan.interval === 'year' ? 'annual' : 'monthly'))
            );

            // Get current seat count for this plan
            const currentSeatsForPlan = planSeats[plan.id] || (isCurrentPlan ? currentPlan.seats || 1 : 1);

            return (
              <div key={plan.id} className="relative">
                {isCurrentPlan && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold rounded-bl-lg rounded-tr-lg z-20">
                    Current Plan
                  </div>
                )}
                <GlowBorder>
                  <Card className={`bg-background rounded-lg shadow-md overflow-hidden p-6 h-full relative ${isCurrentPlan ? 'ring-2 ring-primary ' : ''}`}>
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-green-700 dark:text-white">{plan.name}</h3>
                      <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-green-700 dark:text-white">
                          {formatCurrency(
                            billingPeriod === 'annual'
                              ? plan.annualPrice * currentSeatsForPlan * 12
                              : plan.monthlyPrice * currentSeatsForPlan
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {billingPeriod === 'annual'
                          ? `$${plan.annualPrice}/seat/month (billed annually)`
                          : `$${plan.monthlyPrice}/seat/month`
                        }
                      </p>
                    </div>

                    {/* Seat Selection Dropdown */}
                    <div className="mb-4">
                      <label htmlFor={`seat-select-legacy-${plan.id}`} className="block text-sm font-medium text-muted-foreground mb-2">
                        Number of Seats:
                      </label>
                      {plan.id === 'free' || plan.id === 'personal' ? (
                        // Fixed seat plans - show static text
                        <div className="w-full px-3 py-2 border border-border rounded-md bg-muted text-sm font-medium text-muted-foreground">
                          1 seat
                        </div>
                      ) : (
                        // Variable seat plans - show dropdown
                        <select
                          id={`seat-select-legacy-${plan.id}`}
                          value={currentSeatsForPlan}
                          onChange={(e) => setPlanSeats({ ...planSeats, [plan.id]: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500 text-sm font-medium bg-background"
                        >
                          {(() => {
                            // Determine seat range based on plan
                            let minSeats = 1;
                            let maxSeats = 20;

                            if (plan.id === 'business') {
                              minSeats = 1;
                              maxSeats = 5;
                            } else if (plan.id === 'company') {
                              minSeats = 6;
                              maxSeats = 25;
                            }

                            return Array.from({ length: maxSeats - minSeats + 1 }, (_, i) => minSeats + i)
                              .map((seat) => (
                                <option key={seat} value={seat}>{seat} seat{seat > 1 ? 's' : ''}</option>
                              ));
                          })()}
                        </select>
                      )}
                    </div>

                    <Button
                      variant={isCurrentPlan ? 'secondary' : 'outline'}
                      className={`w-full mb-6 ${isCurrentPlan ? 'text-primary border-primary/30 hover:bg-primary/20' : ''}`}
                      onClick={() => {
                        if (isCurrentPlan) {
                          // Update seats for current plan
                          handleUpdateSeats(plan.id, currentSeatsForPlan);
                        } else {
                          // Switch to this plan
                          if (plan.id === 'free') {
                            // Only allow switching to free if no active subscription
                            if (!billingCurrentPlan?.hasSubscription) {
                              toast.success('Welcome to Knowted! You can start using the free plan immediately.');
                            } else {
                              toast.error('Cannot switch to free plan while you have an active subscription. Please cancel your current subscription first.');
                            }
                          } else {
                            handleSwitchPlan(plan.id, currentSeatsForPlan);
                          }
                        }
                      }}
                      disabled={
                        (isLoading && selectedPlan === plan.id) ||
                        seatUpdateLoading ||
                        isCurrentPlanLoading ||
                        (isCurrentPlan && currentSeatsForPlan === (currentPlan.seats || 1)) ||
                        // Disable free plan if user has an active subscription (unless they're already on free)
                        (plan.id === 'free' && billingCurrentPlan?.hasSubscription && !isCurrentPlan)
                      }
                    >
                      {isCurrentPlan
                        ? (seatUpdateLoading || isCurrentPlanLoading ? 'Updating...' : 'Update Seats')
                        : isLoading && selectedPlan === plan.id ? 'Processing...' :
                        plan.id === 'free' ?
                          (billingCurrentPlan?.hasSubscription && !isCurrentPlan ? 'Not Available' : 'Start Using Free') :
                        `Get Started ${plan.name}`}
                    </Button>

                  <ul className="mb-4 space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-mint-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="mb-2 text-xs font-bold text-muted-foreground">
                    {plan.id === 'free' ? 'Key Features' :
                     plan.id === 'personal' ? 'Everything in Free, plus:' :
                     plan.id === 'business' ? 'Everything in Personal, plus:' :
                     'Everything in Business, plus:'}
                  </div>

                  <ul className="mb-8 space-y-1">
                    {plan.keyFeatures.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-mint-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Card>
              </GlowBorder>
            </div>
          );
        })}
        </div>

        {/* Error Display */}
        {seatUpdateError && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-destructive">{seatUpdateError}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Billing;
