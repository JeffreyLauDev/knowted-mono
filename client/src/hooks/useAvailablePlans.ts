import billingConfig from '@/pages/dashboard/billing-config.json';

interface BillingFeature {
  featureType: string;
  label: string;
  value: string | null;
  isEnabled: boolean;
  sortOrder: number;
}

interface BillingPlan {
  tier: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  cta: string;
  seatLimit: number;
  isPopular: boolean;
  features: BillingFeature[];
  stripeProductId: string | null;
  stripeMonthlyPriceId: string | null;
  stripeAnnualPriceId: string | null;
}

export interface EnhancedPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  keyFeatures: string[];
  seats: number;
  popular: boolean;
  productId?: string;
  priceId?: string;
}

export const useAvailablePlans = (): {
  plans: EnhancedPlan[];
  isLoading: boolean;
  error: unknown;
  rawPlans: BillingPlan[];
} => {
  const transformPlans = (apiPlans: BillingPlan[]): EnhancedPlan[] => {
    return apiPlans.map((plan) => {
      // Convert features to string array and categorize them properly
      const allFeatures = plan.features
        .filter((feature) => feature.isEnabled)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      // Main features: features with values (like "1 Seat", "5 GB Storage", etc.)
      const mainFeatures = allFeatures
        .filter((feature) => feature.value !== null)
        .map((feature) => feature.value as string);

      // Key features: boolean features without values (like "Data Export", "Custom Summaries", etc.)
      const keyFeatures = allFeatures
        .filter((feature) => feature.value === null)
        .map((feature) => feature.label);

      return {
        id: plan.tier.toLowerCase(),
        name: plan.name,
        description: plan.description,
        price: plan.monthlyPrice, // Default to monthly price
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        currency: 'AUD',
        interval: 'month' as const,
        features: mainFeatures,
        keyFeatures: keyFeatures,
        seats: plan.seatLimit,
        popular: plan.isPopular,
        productId: plan.stripeProductId || undefined,
        priceId: plan.stripeMonthlyPriceId || undefined
      };
    });
  };

  const plans = billingConfig.plans || [];

  return {
    plans: plans.length > 0 ? transformPlans(plans) : [],
    isLoading: false,
    error: null,
    rawPlans: plans
  };
};
