import { createMock } from '@golevelup/ts-jest';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import Stripe from 'stripe';

import { OrganizationSubscription, SubscriptionStatus } from '../organization-subscriptions/entities/organization-subscription.entity';
import { ImmutableSubscriptionService } from '../organization-subscriptions/immutable-subscription.service';
import { OrganizationSubscriptionsService } from '../organization-subscriptions/organization-subscriptions.service';
import { Organizations } from '../organizations/entities/organizations.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { PlanTier, PricingPlan } from '../pricing/entities/pricing-plan.entity';
import { PricingService } from '../pricing/pricing.service';
import { SeatManagementService } from '../seat-management/seat-management.service';
import { UsageEventsService } from '../usage-events/usage-events.service';
import { PaymentService } from './payment.service';

// Mock Data - Absolute minimal data for business logic testing
const mockSubscription = { 
  id: 'sub_123', 
  status: 'active', 
  customer: 'cus_123', 
  metadata: { organization_id: 'org_123' },
  items: { data: [{ price: { product: 'prod_123' } }] }
};

const mockPricingPlan = { 
  seatLimit: 10, 
  stripeMonthlyPriceId: 'price_monthly_123',
  isActive: true
};

const mockUsageData = { 
  currentUsage: 100, 
  monthlyLimit: 500,
  usagePercentage: 20,
  canInviteKnowted: true,
  resetDate: '2024-02-15T00:00:00.000Z'
};

// Use createMock for complex Stripe events - only override what we need
const mockWebhookEvent = createMock<Stripe.Event>({
  type: 'customer.subscription.updated',
  data: { 
    object: createMock<Stripe.Subscription>({
      id: 'sub_123', 
      status: 'past_due', 
      customer: 'cus_123', 
      metadata: { organization_id: 'org_123' },
      items: { data: [{ price: { product: 'prod_123' } }] },
      canceled_at: null, // Ensure it's a primitive value
      cancel_at_period_end: false
    })
  }
});

const mockCancellationEvent = createMock<Stripe.Event>({
  type: 'customer.subscription.updated',
  data: { 
    object: {
      ...createMock<Stripe.Subscription>({
        id: 'sub_123', 
        status: 'active', 
        customer: 'cus_123', 
        metadata: { organization_id: 'org_123' },
        items: { data: [{ price: { product: 'prod_123' } }] },
        cancel_at_period_end: true, // Boolean flag
        cancel_at: 1643673600, // Unix timestamp for 2022-02-01
        canceled_at: null,
        cancellation_details: { reason: 'customer_request' as Stripe.Subscription.CancellationDetails.Reason } 
      }),
      current_period_end: 1643673600, // Unix timestamp for cancellation date (added by StripeSubscriptionWithDates)
    } as Stripe.Subscription & { current_period_end: number }
  }
});

describe('PaymentService - Business Logic', () => {
  let service: PaymentService;
  let mockStripe: {
    subscriptions: {
      retrieve: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
    customers: {
      create: jest.Mock;
    };
  };
  let mockOrgSubRepo: { findOne: jest.Mock };
  let mockPricingPlanRepo: { findOne: jest.Mock };
  let mockImmutableSubscriptionService: {
    getCurrentSubscription: jest.Mock;
    createSubscriptionRecord: jest.Mock;
  };
  let mockUsageEventsService: { getMonthlyMinutesUsage: jest.Mock };

  beforeEach(async () => {
    // Minimal mocks - only what we need for business logic
    mockStripe = {
      subscriptions: {
        retrieve: jest.fn(),
        update: jest.fn(),
        create: jest.fn()
      },
      customers: {
        create: jest.fn()
      }
    };
    mockOrgSubRepo = { findOne: jest.fn() };
    mockPricingPlanRepo = { findOne: jest.fn() };
    mockImmutableSubscriptionService = { 
      getCurrentSubscription: jest.fn(), 
      createSubscriptionRecord: jest.fn() 
    };
    mockUsageEventsService = { getMonthlyMinutesUsage: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('sk_test_123') } },
        { provide: getRepositoryToken(OrganizationSubscription), useValue: mockOrgSubRepo },
        { provide: getRepositoryToken(Organizations), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(PricingPlan), useValue: mockPricingPlanRepo },
        { provide: ImmutableSubscriptionService, useValue: mockImmutableSubscriptionService },
        { provide: OrganizationSubscriptionsService, useValue: {} },
        { provide: OrganizationsService, useValue: { findOne: jest.fn() } },
        { provide: PricingService, useValue: {} },
        { provide: SeatManagementService, useValue: {} },
        { provide: UsageEventsService, useValue: mockUsageEventsService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    (service as any).stripe = mockStripe;
  });

  describe('updateSubscriptionQuantity - Business Logic', () => {
    it('should create new subscription when Stripe update fails with incomplete_expired', async () => {
      // Arrange - minimal data for business logic
      mockStripe.subscriptions.retrieve.mockResolvedValue(mockSubscription);
      mockPricingPlanRepo.findOne.mockResolvedValue(mockPricingPlan);
      mockStripe.subscriptions.update.mockRejectedValue(new Error('incomplete_expired'));
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_123' });
      mockStripe.subscriptions.create.mockResolvedValue({ ...mockSubscription, id: 'sub_new_123' });
      mockOrgSubRepo.findOne.mockResolvedValue({ organization_id: 'org_123', stripe_customer_id: 'cus_123' });

      // Act
      await service.updateSubscriptionQuantity('sub_123', 5, 'business', 'monthly');

      // Assert - test the business logic
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          items: [{ price: 'price_monthly_123', quantity: 5 }],
        })
      );
      expect(mockImmutableSubscriptionService.createSubscriptionRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org_123',
          stripe_subscription_id: 'sub_new_123',
          seats_count: 5,
        }),
        'Subscription replaced: seats changed to 5, plan changed to business_monthly',
        expect.objectContaining({
          stripe_error: 'incomplete_expired',
          new_stripe_subscription_id: 'sub_new_123',
        })
      );
    });

    it('should throw error when seat count exceeds plan limit', async () => {
      // Arrange - minimal data for business logic
      mockStripe.subscriptions.retrieve.mockResolvedValue(mockSubscription);
      mockPricingPlanRepo.findOne.mockResolvedValue({ ...mockPricingPlan, seatLimit: 3 });

      // Act & Assert
      await expect(service.updateSubscriptionQuantity('sub_123', 10, 'business', 'monthly')).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleWebhook - Business Logic', () => {
    it('should map Stripe status to internal enum', async () => {
      // Act
      await service.handleWebhook(mockWebhookEvent);

      // Assert - test status mapping logic
      expect(mockImmutableSubscriptionService.createSubscriptionRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org_123',
          stripe_subscription_id: 'sub_123',
          status: SubscriptionStatus.PAST_DUE, // This is the business logic we're testing
        }),
        'Subscription updated via Stripe webhook',
        expect.any(Object)
      );
    });

    it('should detect cancellation scheduling', async () => {
      // Act
      await service.handleWebhook(mockCancellationEvent);

      // Assert - test cancellation detection logic
      expect(mockImmutableSubscriptionService.createSubscriptionRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SubscriptionStatus.SCHEDULED_FOR_CANCELLATION, // This is the business logic we're testing
          is_scheduled_for_cancellation: true,
          cancellation_reason: 'customer_request',
        }),
        'Cancellation scheduled via Stripe webhook',
        expect.any(Object)
      );
    });
  });

  describe('getCurrentUserPlanInformation - Business Logic', () => {
    it('should return free plan when no subscription exists', async () => {
      // Arrange - minimal data for business logic
      mockImmutableSubscriptionService.getCurrentSubscription.mockResolvedValue(null);
      mockUsageEventsService.getMonthlyMinutesUsage.mockResolvedValue(mockUsageData);

      // Act
      const result = await service.getCurrentUserPlanInformation('org_123');

      // Assert - test free plan logic
      expect(result).toEqual(expect.objectContaining({
        hasSubscription: false,
        isActive: true,
        planTier: 'free',
        planName: 'Free',
        monthlyPrice: 0,
        seatsCount: 1,
        currentUsage: 100,
        monthlyLimit: 500,
      }));
    });

    it('should determine plan tier from stripe_plan_id when pricing plan not found', async () => {
      // Arrange - minimal data for business logic
      const companySubscription = { 
        stripe_plan_id: 'company_yearly', 
        status: SubscriptionStatus.ACTIVE, 
        seats_count: 10 
      };
      
      mockImmutableSubscriptionService.getCurrentSubscription.mockResolvedValue(companySubscription);
      mockPricingPlanRepo.findOne.mockResolvedValue(null);
      mockUsageEventsService.getMonthlyMinutesUsage.mockResolvedValue(mockUsageData);

      // Act
      const result = await service.getCurrentUserPlanInformation('org_123');

      // Assert - test plan tier inference logic
      expect(result.planTier).toBe(PlanTier.COMPANY);
      expect(result.planName).toBe('Company Plan');
      expect(result.billingCycle).toBe('annual');
    });
  });
});