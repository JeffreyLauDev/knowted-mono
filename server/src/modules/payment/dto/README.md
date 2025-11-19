# Payment Module DTOs

This directory contains all the Data Transfer Objects (DTOs) for the Payment module. These DTOs provide proper TypeScript types and OpenAPI documentation for the frontend to use.

## Available DTOs

### Request DTOs

#### `UpdateSubscriptionSeatsDto`
Used for updating subscription seat count.
```typescript
{
  seatsCount: number;
}
```

#### `CreateCheckoutSessionDto`
Used for creating checkout sessions.
```typescript
{
  organizationId: string;
  planName: string;
  pricePerSeat: number;
  billingCycle: string;
  seatsCount: number;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  customerEmail?: string;
  customerName?: string;
}
```

#### `CreateFreeTrialCheckoutSessionDto`
Used for creating free trial checkout sessions.
```typescript
{
  organizationId: string;
  customerEmail: string;
  customerName: string;
  seatsCount?: number;
}
```

### Response DTOs

#### `SubscriptionDetailsResponseDto`
Response for subscription details endpoint.
```typescript
{
  hasSubscription: boolean;
  activeSubscription: SubscriptionDetailsDto | null;
  allSubscriptions: SubscriptionDetailsDto[];
  subscriptionCount: number;
  message?: string;
}
```

#### `SubscriptionDetailsDto`
Individual subscription details.
```typescript
{
  id: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  seatsCount: number;
  planId: string;
  customerId?: string;
  stripeProductId?: string;
  trialEnd?: string;
  trialStart?: string;
  currentPeriodStart?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### `SubscriptionStatusResponseDto`
Response for subscription status endpoint.
```typescript
{
  hasSubscription: boolean;
  status?: SubscriptionStatus | null;
  isActive: boolean;
  isTrial: boolean;
  isPastDue?: boolean;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  seatsCount?: number;
  planId?: string;
  subscriptionId?: string;
}
```

#### `PaymentHistoryResponseDto`
Response for payment history endpoint.
```typescript
{
  payments: PaymentHistoryItemDto[];
  total: number;
}
```

#### `PaymentHistoryItemDto`
Individual payment history item.
```typescript
{
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  paymentMethod?: string;
  description?: string;
  customerEmail?: string;
  livemode: boolean;
}
```

#### `InvoiceResponseDto`
Response for invoices endpoint.
```typescript
{
  invoices: InvoiceItemDto[];
  total: number;
}
```

#### `InvoiceItemDto`
Individual invoice item.
```typescript
{
  id: string;
  number: string;
  amountDue: number;
  amountPaid: number;
  status: string;
  created: string;
  dueDate?: number | null;
  periodStart?: number | null;
  periodEnd?: number | null;
  subscriptionId?: string;
  invoicePdf?: string;
  hostedInvoiceUrl?: string;
  description?: string;
  currency: string;
  customerEmail?: string;
  livemode: boolean;
}
```

#### `CustomerDetailsDto`
Customer information.
```typescript
{
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: CustomerAddressDto;
  created: string;
  livemode: boolean;
  metadata?: Record<string, string>;
  defaultPaymentMethod?: string;
  description?: string;
}
```

#### `CheckoutSessionResponseDto`
Response for checkout session creation.
```typescript
{
  sessionId: string;
  url: string;
  organizationId: string;
}
```

#### `FreeTrialCheckoutSessionResponseDto`
Response for free trial checkout session creation.
```typescript
{
  sessionId: string;
  url: string;
  organizationId: string;
  trialDays: number;
}
```

#### `BillingPortalSessionResponseDto`
Response for billing portal session creation.
```typescript
{
  id: string;
  url: string;
  customer: string;
  return_url: string;
  created: number;
  livemode: boolean;
}
```

## Usage

These DTOs are automatically used by the NestJS OpenAPI decorators to generate proper API documentation. The frontend can use these types directly from the generated OpenAPI specification.

### Frontend Integration

The frontend can generate TypeScript interfaces from the OpenAPI specification using tools like:
- `openapi-typescript`
- `swagger-typescript-api`
- `orval`

Example using `openapi-typescript`:
```bash
npx openapi-typescript http://localhost:3000/api-json -o types/api.ts
```

This will generate TypeScript interfaces that match the DTOs defined here, ensuring type safety between frontend and backend. 