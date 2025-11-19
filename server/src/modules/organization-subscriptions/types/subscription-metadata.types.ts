/**
 * Stripe metadata interface for organization subscriptions
 */
export interface StripeMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Change metadata interface for subscription record changes
 */
export interface ChangeMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Changeable fields interface for subscription comparison
 */
export interface ChangeableFields {
  status: string;
  seats_count: number;
  is_scheduled_for_cancellation: boolean;
  stripe_metadata: StripeMetadata;
}

/**
 * Subscription changes interface for tracking field changes
 */
export interface SubscriptionChanges {
  [field: string]: {
    from: string | number | boolean | null | undefined;
    to: string | number | boolean | null | undefined;
  };
}
