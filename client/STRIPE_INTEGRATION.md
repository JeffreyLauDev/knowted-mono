# Stripe Integration for Knowted Frontend

This document outlines the simplified Stripe billing integration implemented in the Knowted frontend application.

## Overview

The integration uses **Stripe Checkout** for a secure, redirect-based payment experience. This approach is simpler, more secure, and requires less code while providing a professional checkout experience.

## Features

- ✅ Subscription plan selection with seat count
- ✅ Stripe Checkout redirect flow
- ✅ Billing portal management
- ✅ Subscription cancellation
- ✅ Seat count updates
- ✅ Success/cancel URL handling
- ✅ Real subscription data display
- ✅ Payment history and invoices
- ✅ Responsive design with Tailwind CSS
- ✅ TypeScript support
- ✅ Error handling and loading states

## Components

### Core Files

- `src/hooks/useBilling.ts` - Billing hook with API integration
- `src/pages/dashboard/Billing.tsx` - Main billing page
- `src/components/dashboard/BillingManagement.tsx` - Dashboard billing widget

### API Integration

Uses Orval-generated API functions:
- `useStripeControllerCreateCheckoutSession`
- `usePaymentControllerCreateBillingPortalSession`
- `usePaymentControllerGetOrganizationSubscriptionDetails`
- `useStripeControllerGetPaymentHistory`
- `useStripeControllerGetInvoices`
- `useStripeControllerGetCustomer`
- `usePaymentControllerCancelSubscription`
- `useStripeControllerUpdateSubscriptionSeats`

## Setup

### 1. Backend API

Ensure your backend provides these endpoints:
- `POST /api/v1/stripe/create-checkout-session`
- `POST /api/v1/stripe/create-billing-portal-session`
- `GET /api/v1/stripe/organization/{organizationId}/subscription`
- `GET /api/v1/stripe/organization/{organizationId}/payment-history`
- `GET /api/v1/stripe/organization/{organizationId}/invoices`
- `GET /api/v1/stripe/customer/{customerId}`
- `POST /api/v1/stripe/subscription/{subscriptionId}/cancel`
- `POST /api/v1/stripe/subscription/{subscriptionId}/update-seats`

### 2. No Frontend Dependencies Required

This integration uses redirects only, so no Stripe packages are needed in the frontend.

## Usage

### Basic Billing Hook

```typescript
import { useBilling } from '@/hooks/useBilling';

const MyComponent = () => {
  const { 
    createCheckoutSession, 
    createBillingPortalSession, 
    subscriptionDetails,
    paymentHistory,
    invoices,
    isLoading 
  } = useBilling();

  const handleSubscribe = async () => {
    await createCheckoutSession('pro', 5);
  };

  const handleManageBilling = async () => {
    await createBillingPortalSession();
  };
};
```

## Payment Flow

### Stripe Checkout Flow
1. User selects plan and seats
2. Clicks "Subscribe"
3. User is redirected to Stripe Checkout
4. Payment is completed on Stripe's secure site
5. User is redirected back with success/cancel status
6. Subscription is immediately active

## Security Benefits

- **No Payment Data**: Your servers never handle credit card information
- **PCI DSS Compliant**: Stripe handles all compliance requirements
- **Fraud Protection**: Stripe's built-in fraud detection
- **Secure**: SSL/TLS encryption on Stripe's servers
- **Simplified**: Less code to maintain and fewer security concerns

## Styling

The integration uses Tailwind CSS and includes:
- Responsive design
- Dark/light mode support
- Loading states and animations
- Error handling UI
- Professional checkout experience

## Customization

### Plan Configuration

Update plans in `src/pages/dashboard/Billing.tsx`:
```typescript
const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    features: ['Feature 1', 'Feature 2'],
    seats: 10
  }
  // ... more plans
];
```

### Success/Cancel URLs

Customize redirect URLs in `src/hooks/useBilling.ts`:
```typescript
successUrl: successUrl || `${window.location.origin}/organization/billing?success=true`,
cancelUrl: cancelUrl || `${window.location.origin}/organization/billing?canceled=true`
```

## Migration from Stripe Elements

If you previously used Stripe Elements, this simplified approach:

1. **Removes complexity**: No need for Stripe.js or React Stripe.js
2. **Improves security**: No payment data on your servers
3. **Reduces maintenance**: Less code to maintain
4. **Better UX**: Users get Stripe's optimized checkout experience
5. **Simpler testing**: No need to mock Stripe Elements

## Troubleshooting

### Common Issues

1. **Redirect not working**: Check that your backend returns a `url` property in the checkout session response
2. **Success/cancel not detected**: Ensure URL parameters are properly set in your backend
3. **Subscription not showing**: Verify that the organization subscription API is working correctly

### Debug Mode

Enable debug logging in the browser console to see API calls and responses:
```typescript
// Add to useBilling hook for debugging
```

## Future Enhancements

Potential improvements:
- [ ] Webhook handling for subscription updates
- [ ] Invoice management
- [ ] Usage-based billing
- [ ] Multi-currency support
- [ ] Subscription upgrades/downgrades
- [ ] Payment method management
- [ ] Billing history display

## Support

For issues or questions:
1. Check Stripe documentation
2. Review error logs in browser console
3. Verify API endpoint responses
4. Test with Stripe's test mode first 