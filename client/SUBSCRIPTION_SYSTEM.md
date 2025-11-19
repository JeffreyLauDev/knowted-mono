# Subscription Modal System

This document describes the new subscription modal system that provides a better user experience than blocking redirects.

## Overview

The subscription system now uses a modal popup instead of blocking the entire screen. Users can see the UI behind the modal and are required to start a free trial to continue using the app.

## Key Features

- **Transparent Background**: Modal appears with backdrop blur, showing the UI behind
- **Credit Card Required**: Free trial requires credit card to start
- **Required to Continue**: Users must start trial to access protected features
- **No Dismissal**: Modal cannot be closed when subscription is required
- **Automatic Redirect**: Clicking "Start Free Trial" redirects to Stripe payment link

## Components

### 1. SubscriptionModal (`src/components/dashboard/SubscriptionModal.tsx`)

A modal dialog that appears when users don't have an active subscription.

**Features:**
- Transparent background with backdrop blur
- Clear messaging about credit card requirement
- "Start Free Trial" button that redirects to Stripe
- Cannot be dismissed when subscription is required
- Loading states and error handling
- Responsive design

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Callback when modal is closed (ignored when required)

### 2. SubscriptionButton (`src/components/dashboard/SubscriptionButton.tsx`)

A reusable button component that opens the subscription modal.

**Props:**
- `variant?: 'default' | 'outline' | 'ghost'` - Button variant
- `size?: 'default' | 'sm' | 'lg'` - Button size
- `className?: string` - Additional CSS classes
- `children?: React.ReactNode` - Button text (defaults to "Start Free Trial")
- `requireSubscription?: boolean` - Whether subscription is required

## Hooks

### 1. useSubscriptionCheck (`src/hooks/useSubscriptionCheck.ts`)

Core hook for checking subscription status.

**Returns:**
- `hasActiveSubscription: boolean` - Whether user has active subscription
- `isLoading: boolean` - Loading state
- `redirectToPayment: () => void` - Function to redirect to Stripe
- `subscriptionDetails: unknown` - Raw subscription data

### 2. useSubscriptionModal (`src/hooks/useSubscriptionModal.ts`)

Hook for managing subscription modal state.

**Parameters:**
- `autoShow?: boolean` - Whether to automatically show modal when no subscription
- `requireSubscription?: boolean` - Whether subscription is required (prevents closing)

**Returns:**
- `isModalOpen: boolean` - Modal visibility state
- `openModal: () => void` - Function to open modal
- `closeModal: () => void` - Function to close modal (ignored when required)
- `hasActiveSubscription: boolean` - Subscription status
- `isLoading: boolean` - Loading state

## Usage Examples

### 1. Required Subscription in Protected Routes

```tsx
import { useSubscriptionModal } from '@/hooks/useSubscriptionModal';
import SubscriptionModal from '@/components/dashboard/SubscriptionModal';

const MyProtectedComponent = () => {
  const { isModalOpen, closeModal } = useSubscriptionModal(true, true); // autoShow = true, required = true

  return (
    <>
      <div>Your protected content here</div>
      <SubscriptionModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
};
```

### 2. Optional Subscription Modal

```tsx
import { useSubscriptionModal } from '@/hooks/useSubscriptionModal';
import SubscriptionModal from '@/components/dashboard/SubscriptionModal';

const MyComponent = () => {
  const { isModalOpen, openModal, closeModal } = useSubscriptionModal(false, false);

  return (
    <>
      <button onClick={openModal}>Upgrade to Premium</button>
      <SubscriptionModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
};
```

### 3. Using SubscriptionButton Component

```tsx
import SubscriptionButton from '@/components/dashboard/SubscriptionButton';

const MyComponent = () => {
  return (
    <div>
      <h2>Upgrade Your Plan</h2>
      <SubscriptionButton variant="outline" size="lg" requireSubscription={true}>
        Get Premium Access
      </SubscriptionButton>
    </div>
  );
};
```

### 4. Direct Subscription Check

```tsx
import { useSubscriptionCheck } from '@/hooks/useSubscriptionCheck';

const MyComponent = () => {
  const { hasActiveSubscription, isLoading, redirectToPayment } = useSubscriptionCheck();

  if (isLoading) return <div>Loading...</div>;

  if (!hasActiveSubscription) {
    return (
      <div>
        <p>You need a subscription to access this feature</p>
        <button onClick={redirectToPayment}>Start Free Trial</button>
      </div>
    );
  }

  return <div>Premium content here</div>;
};
```

## Integration with Protected Routes

The `ProtectedRoute` component now automatically shows the subscription modal when:
- User is authenticated
- Subscription is required (`requireSubscription={true}`)
- User doesn't have an active subscription

**Important**: When subscription is required, the modal cannot be dismissed and users must start the free trial to continue.

```tsx
<ProtectedRoute requireSubscription={true}>
  <Dashboard />
</ProtectedRoute>
```

## Stripe Integration

The system integrates with Stripe by:
1. Passing organization ID via `client_reference_id` parameter
2. Pre-filling user email via `prefilled_email` parameter
3. Using the test payment link: `https://buy.stripe.com/test_eVq4gyfGG7Bf2y12HN43S03`

## Trial Requirements

- **Credit Card Required**: Users must provide a credit card to start the trial
- **No Charges During Trial**: No charges are made during the 7-day trial period
- **Automatic Billing**: After trial ends, subscription automatically starts unless cancelled
- **Cancel Anytime**: Users can cancel before the trial ends to avoid charges

## Benefits

1. **Better UX**: Users can see the UI behind the modal
2. **Required Conversion**: Users must start trial to access features
3. **Clear Requirements**: Transparent about credit card requirement
4. **Flexible**: Can be used for required or optional subscription flows
5. **Consistent**: Same modal design and behavior everywhere
6. **Transparent Background**: Modern backdrop blur effect

## Migration from Old System

The old system that automatically redirected users has been removed. To migrate:

1. Replace automatic redirects with modal triggers
2. Use `useSubscriptionModal` hook with `requireSubscription={true}` for required flows
3. Use `SubscriptionButton` component for manual triggers
4. Update `ProtectedRoute` components to use the new system 