import Stripe from "stripe";

export type PaymentSubscriptionWithDates = Stripe.Subscription & {
  trial_start?: number;
  current_period_start?: number;
};

export type PaymentInvoiceWithSubscription = Stripe.Invoice & {
  subscription?: {
    id: string;
  };
};
