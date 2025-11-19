import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';

import { OrganizationSubscription, SubscriptionStatus } from './entities/organization-subscription.entity';
import { ImmutableSubscriptionService } from './immutable-subscription.service';
import { ChangeMetadata } from './types/subscription-metadata.types';

describe('ImmutableSubscriptionService - Feature: Immutable Subscription Management', () => {
  let service: TestableImmutableSubscriptionService;
  let subscriptionRepo: jest.Mocked<Repository<OrganizationSubscription>>;

  // Testable service class that exposes private methods for testing
  class TestableImmutableSubscriptionService extends ImmutableSubscriptionService {
    public hasSignificantDataChange(
      current: OrganizationSubscription,
      newData: Partial<OrganizationSubscription>,
    ): boolean {
      return super.hasSignificantDataChange(current, newData);
    }

    public isExactDataDuplicate(
      existing: OrganizationSubscription,
      newData: Partial<OrganizationSubscription>,
    ): boolean {
      return super.isExactDataDuplicate(existing, newData);
    }
  }

  // Test data builders for different scenarios
  const createMockSubscription = (overrides: Partial<OrganizationSubscription> = {}) => {
    const subscription = createMock<OrganizationSubscription>();
    subscription.id = 'sub-123';
    subscription.organization_id = 'org-123';
    subscription.stripe_subscription_id = 'sub_stripe_123';
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.seats_count = 5;
    subscription.is_current = true;
    subscription.is_scheduled_for_cancellation = false;
    subscription.version = 1;
    subscription.created_at = new Date('2024-01-01');
    return { ...subscription, ...overrides };
  };

  // Test data
  const mockSubscription = createMockSubscription();
  const mockNewSubscription = createMockSubscription({
    id: 'sub-456',
    seats_count: 10,
    version: 2,
    previous_version_id: 'sub-123',
    created_at: new Date('2024-01-02'),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestableImmutableSubscriptionService,
        {
          provide: getRepositoryToken(OrganizationSubscription),
          useValue: createMock<Repository<OrganizationSubscription>>({
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<TestableImmutableSubscriptionService>(TestableImmutableSubscriptionService);
    subscriptionRepo = module.get(getRepositoryToken(OrganizationSubscription));
  });

  describe('Feature: Subscription Record Creation', () => {
    it('should create initial subscription record when no current subscription exists', async () => {
      // Given: A request to create a subscription record for an organization without existing subscription
      const subscriptionData = {
        organization_id: 'org-123',
        stripe_subscription_id: 'sub_stripe_123',
        status: SubscriptionStatus.ACTIVE,
        seats_count: 5,
      };
      const changeReason = 'Initial subscription creation';
      const changeMetadata: ChangeMetadata = { source: 'webhook' };
      subscriptionRepo.findOne.mockResolvedValue(null);
      subscriptionRepo.find.mockResolvedValue([]);
      subscriptionRepo.create.mockReturnValue(mockSubscription);
      subscriptionRepo.save.mockResolvedValue(mockSubscription);

      // When: Creating the subscription record
      const result = await service.createSubscriptionRecord(subscriptionData, changeReason, changeMetadata);

      // Then: Should create a new record with version 1
      expect(subscriptionRepo.findOne).toHaveBeenCalledWith({
        where: {
          organization_id: subscriptionData.organization_id,
          stripe_subscription_id: subscriptionData.stripe_subscription_id,
          is_current: true,
        },
      });
      expect(subscriptionRepo.create).toHaveBeenCalledWith({
        ...subscriptionData,
        is_current: true,
        version: 1,
        previous_version_id: null,
        change_reason: changeReason,
        change_metadata: changeMetadata,
        created_at: expect.any(Date),
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should create new version when current subscription exists and data has changed', async () => {
      // Given: A request to update an existing subscription with changed data
      const subscriptionData = {
        organization_id: 'org-123',
        stripe_subscription_id: 'sub_stripe_123',
        status: SubscriptionStatus.ACTIVE,
        seats_count: 10,
      };
      const changeReason = 'Seat count updated';
      const changeMetadata: ChangeMetadata = { previous_seats: 5, new_seats: 10 };
      subscriptionRepo.findOne.mockResolvedValue(mockSubscription);
      subscriptionRepo.find.mockResolvedValue([]);
      subscriptionRepo.update.mockResolvedValue({ affected: 1 } as UpdateResult);
      subscriptionRepo.create.mockReturnValue(mockNewSubscription);
      subscriptionRepo.save.mockResolvedValue(mockNewSubscription);

      // When: Creating the subscription record
      const result = await service.createSubscriptionRecord(subscriptionData, changeReason, changeMetadata);

      // Then: Should supersede current record and create new version
      expect(subscriptionRepo.update).toHaveBeenCalledWith(
        { id: mockSubscription.id },
        {
          is_current: false,
          superseded_at: expect.any(Date),
        },
      );
      expect(subscriptionRepo.create).toHaveBeenCalledWith({
        ...subscriptionData,
        is_current: true,
        version: 2,
        previous_version_id: mockSubscription.id,
        change_reason: changeReason,
        change_metadata: changeMetadata,
        created_at: expect.any(Date),
      });
      expect(result).toEqual(mockNewSubscription);
    });

    it('should return existing record when concurrent duplicate is detected', async () => {
      // Given: A request to create a subscription record that already exists due to concurrent processing
      const subscriptionData = {
        organization_id: 'org-123',
        stripe_subscription_id: 'sub_stripe_123',
        status: SubscriptionStatus.ACTIVE,
        seats_count: 5,
      };
      const changeReason = 'Webhook event';
      const concurrentDuplicates = [mockSubscription, mockNewSubscription];
      subscriptionRepo.findOne.mockResolvedValue(null);
      subscriptionRepo.find
        .mockResolvedValueOnce([]) // recentDuplicates
        .mockResolvedValueOnce(concurrentDuplicates); // concurrentDuplicates

      // When: Creating the subscription record
      const result = await service.createSubscriptionRecord(subscriptionData, changeReason);

      // Then: Should return existing record instead of creating duplicate
      expect(result).toEqual(mockSubscription);
      expect(subscriptionRepo.create).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Given: A request to create a subscription record when database error occurs
      const subscriptionData = {
        organization_id: 'org-123',
        stripe_subscription_id: 'sub_stripe_123',
        status: SubscriptionStatus.ACTIVE,
        seats_count: 5,
      };
      const changeReason = 'Test error';
      subscriptionRepo.findOne.mockRejectedValue(new Error('Database error'));

      // When: Creating the subscription record
      // Then: Should propagate the error
      await expect(service.createSubscriptionRecord(subscriptionData, changeReason)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Feature: Current Subscription Retrieval', () => {
    it('should return current subscription for organization', async () => {
      // Given: A request to get current subscription for an organization
      const organizationId = 'org-123';
      subscriptionRepo.findOne.mockResolvedValue(mockSubscription);

      // When: Getting current subscription
      const result = await service.getCurrentSubscription(organizationId);

      // Then: Should return the current subscription
      expect(subscriptionRepo.findOne).toHaveBeenCalledWith({
        where: {
          organization_id: organizationId,
          is_current: true,
        },
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should return current subscription with stripe subscription id filter', async () => {
      // Given: A request to get current subscription with specific Stripe subscription ID
      const organizationId = 'org-123';
      const stripeSubscriptionId = 'sub_stripe_123';
      subscriptionRepo.findOne.mockResolvedValue(mockSubscription);

      // When: Getting current subscription with filter
      const result = await service.getCurrentSubscription(organizationId, stripeSubscriptionId);

      // Then: Should return the subscription matching both criteria
      expect(subscriptionRepo.findOne).toHaveBeenCalledWith({
        where: {
          organization_id: organizationId,
          is_current: true,
          stripe_subscription_id: stripeSubscriptionId,
        },
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should return null when no subscription is found', async () => {
      // Given: A request to get current subscription for an organization without subscription
      const organizationId = 'org-123';
      subscriptionRepo.findOne.mockResolvedValue(null);

      // When: Getting current subscription
      const result = await service.getCurrentSubscription(organizationId);

      // Then: Should return null
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Given: A request to get current subscription when database error occurs
      const organizationId = 'org-123';
      subscriptionRepo.findOne.mockRejectedValue(new Error('Database error'));

      // When: Getting current subscription
      // Then: Should propagate the error
      await expect(service.getCurrentSubscription(organizationId)).rejects.toThrow('Database error');
    });
  });

  describe('Feature: Subscription History Retrieval', () => {
    it('should return subscription history for organization ordered by version', async () => {
      // Given: A request to get subscription history for an organization
      const organizationId = 'org-123';
      const mockHistory = [mockSubscription, mockNewSubscription];
      subscriptionRepo.find.mockResolvedValue(mockHistory);

      // When: Getting subscription history
      const result = await service.getSubscriptionHistory(organizationId);

      // Then: Should return history ordered by version descending
      expect(subscriptionRepo.find).toHaveBeenCalledWith({
        where: { organization_id: organizationId },
        order: { version: 'DESC' },
      });
      expect(result).toEqual(mockHistory);
    });

    it('should return subscription history with stripe subscription id filter', async () => {
      // Given: A request to get subscription history for a specific Stripe subscription
      const organizationId = 'org-123';
      const stripeSubscriptionId = 'sub_stripe_123';
      const mockHistory = [mockSubscription, mockNewSubscription];
      subscriptionRepo.find.mockResolvedValue(mockHistory);

      // When: Getting subscription history with filter
      const result = await service.getSubscriptionHistory(organizationId, stripeSubscriptionId);

      // Then: Should return history filtered by Stripe subscription ID
      expect(subscriptionRepo.find).toHaveBeenCalledWith({
        where: {
          organization_id: organizationId,
          stripe_subscription_id: stripeSubscriptionId,
        },
        order: { version: 'DESC' },
      });
      expect(result).toEqual(mockHistory);
    });

    it('should handle database errors gracefully', async () => {
      // Given: A request to get subscription history when database error occurs
      const organizationId = 'org-123';
      subscriptionRepo.find.mockRejectedValue(new Error('Database error'));

      // When: Getting subscription history
      // Then: Should propagate the error
      await expect(service.getSubscriptionHistory(organizationId)).rejects.toThrow('Database error');
    });
  });

  describe('Feature: Subscription Analytics', () => {
    it('should return comprehensive analytics with versioning data', async () => {
      // Given: A request to get subscription analytics for an organization with multiple subscriptions
      const organizationId = 'org-123';
      const mockHistory = [
        mockSubscription,
        mockNewSubscription,
        createMock<OrganizationSubscription>({
          id: 'sub-789',
          organization_id: 'org-123',
          stripe_subscription_id: 'sub_stripe_456',
          status: SubscriptionStatus.CANCELLED,
          is_current: true,
          is_scheduled_for_cancellation: false,
          version: 3,
        }),
      ];
      subscriptionRepo.find.mockResolvedValue(mockHistory);

      // When: Getting subscription analytics
      const result = await service.getSubscriptionAnalyticsWithVersioning(organizationId);

      // Then: Should return comprehensive analytics with calculated metrics
      expect(result.summary).toEqual({
        totalRecords: 3,
        totalSubscriptions: 2, // unique stripe_subscription_id
        activeSubscriptions: 2,
        cancelledSubscriptions: 1,
        scheduledForCancellation: 0,
        totalRevenue: 0,
        churnRate: 50, // 1 cancelled / 2 total
        retentionRate: 50,
      });
      expect(result.currentRecords).toHaveLength(3);
      expect(result.versionHistory).toHaveLength(3);
      expect(result.allRecords).toEqual(mockHistory);
    });

    it('should handle empty history gracefully', async () => {
      // Given: A request to get subscription analytics for an organization with no history
      const organizationId = 'org-123';
      subscriptionRepo.find.mockResolvedValue([]);

      // When: Getting subscription analytics
      const result = await service.getSubscriptionAnalyticsWithVersioning(organizationId);

      // Then: Should return empty analytics with zero values
      expect(result.summary).toEqual({
        totalRecords: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        cancelledSubscriptions: 0,
        scheduledForCancellation: 0,
        totalRevenue: 0,
        churnRate: 0,
        retentionRate: 100,
      });
      expect(result.currentRecords).toHaveLength(0);
      expect(result.versionHistory).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      // Given: A request to get subscription analytics when database error occurs
      const organizationId = 'org-123';
      subscriptionRepo.find.mockRejectedValue(new Error('Database error'));

      // When: Getting subscription analytics
      // Then: Should propagate the error
      await expect(service.getSubscriptionAnalyticsWithVersioning(organizationId)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Feature: Subscription Timeline', () => {
    it('should return subscription timeline with change tracking', async () => {
      // Given: A request to get subscription timeline for an organization with multiple changes
      const organizationId = 'org-123';
      const mockHistory = [
        createMock<OrganizationSubscription>({
          id: 'sub-1',
          version: 1,
          status: SubscriptionStatus.ACTIVE,
          seats_count: 5,
          is_scheduled_for_cancellation: false,
          created_at: new Date('2024-01-01'),
          change_reason: 'Initial subscription',
        }),
        createMock<OrganizationSubscription>({
          id: 'sub-2',
          version: 2,
          status: SubscriptionStatus.ACTIVE,
          seats_count: 10,
          is_scheduled_for_cancellation: false,
          created_at: new Date('2024-01-02'),
          change_reason: 'Seat count updated',
        }),
      ];
      subscriptionRepo.find.mockResolvedValue(mockHistory);

      // When: Getting subscription timeline
      const result = await service.getSubscriptionTimeline(organizationId);

      // Then: Should return timeline with change tracking
      expect(result.timeline).toHaveLength(2);
      expect(result.timeline[0].event).toBe('Initial subscription');
      expect(result.timeline[1].event).toBe('Seat count updated');
      expect(result.timeline[1].changes).toEqual({
        seats_count: {
          from: 5,
          to: 10,
        },
      });
      expect(result.summary.totalChanges).toBe(2);
      expect(result.summary.mostFrequentChanges).toContain('Initial subscription');
    });

    it('should handle single record timeline without changes', async () => {
      // Given: A request to get subscription timeline for an organization with single record
      const organizationId = 'org-123';
      const mockHistory = [
        createMock<OrganizationSubscription>({
          id: 'sub-1',
          version: 1,
          status: SubscriptionStatus.ACTIVE,
          seats_count: 5,
          created_at: new Date('2024-01-01'),
          change_reason: 'Initial subscription',
        }),
      ];
      subscriptionRepo.find.mockResolvedValue(mockHistory);

      // When: Getting subscription timeline
      const result = await service.getSubscriptionTimeline(organizationId);

      // Then: Should return timeline without changes
      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].changes).toBeUndefined();
      expect(result.summary.totalChanges).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      // Given: A request to get subscription timeline when database error occurs
      const organizationId = 'org-123';
      subscriptionRepo.find.mockRejectedValue(new Error('Database error'));

      // When: Getting subscription timeline
      // Then: Should propagate the error
      await expect(service.getSubscriptionTimeline(organizationId)).rejects.toThrow('Database error');
    });
  });

  describe('Feature: Data Change Detection', () => {
    it('should detect significant data changes between subscription versions', () => {
      // Given: A current subscription and new data with significant changes
      const current = createMock<OrganizationSubscription>({
        seats_count: 5,
        stripe_plan_id: 'business_monthly',
        status: SubscriptionStatus.ACTIVE,
        is_scheduled_for_cancellation: false,
      });
      const newData = {
        seats_count: 10,
        stripe_plan_id: 'business_monthly',
        status: SubscriptionStatus.ACTIVE,
        is_scheduled_for_cancellation: false,
      };

      // When: Checking for significant data changes
      const hasChanges = service.hasSignificantDataChange(current, newData);

      // Then: Should detect the changes
      expect(hasChanges).toBe(true);
    });

    it('should not detect changes when subscription data is identical', () => {
      // Given: A current subscription and new data that are identical
      const current = createMock<OrganizationSubscription>({
        seats_count: 5,
        stripe_plan_id: 'business_monthly',
        status: SubscriptionStatus.ACTIVE,
        is_scheduled_for_cancellation: false,
      });
      const newData = {
        seats_count: 5,
        stripe_plan_id: 'business_monthly',
        status: SubscriptionStatus.ACTIVE,
        is_scheduled_for_cancellation: false,
      };

      // When: Checking for significant data changes
      const hasChanges = service.hasSignificantDataChange(current, newData);

      // Then: Should not detect changes
      expect(hasChanges).toBe(false);
    });

    it('should detect exact data duplicates to prevent redundant records', () => {
      // Given: An existing subscription and new data that are exactly the same
      const existing = createMock<OrganizationSubscription>({
        seats_count: 5,
        stripe_plan_id: 'business_monthly',
        status: SubscriptionStatus.ACTIVE,
        is_scheduled_for_cancellation: false,
        stripe_price_id: 'price_123',
      });
      const newData = {
        seats_count: 5,
        stripe_plan_id: 'business_monthly',
        status: SubscriptionStatus.ACTIVE,
        is_scheduled_for_cancellation: false,
        stripe_price_id: 'price_123',
      };

      // When: Checking for exact data duplicates
      const isDuplicate = service.isExactDataDuplicate(existing, newData);

      // Then: Should detect the duplicate
      expect(isDuplicate).toBe(true);
    });

    it('should not detect duplicates when subscription data differs', () => {
      // Given: An existing subscription and new data that differ
      const existing = createMock<OrganizationSubscription>({
        seats_count: 5,
        stripe_plan_id: 'business_monthly',
        status: SubscriptionStatus.ACTIVE,
        is_scheduled_for_cancellation: false,
        stripe_price_id: 'price_123',
      });
      const newData = {
        seats_count: 10,
        stripe_plan_id: 'business_monthly',
        status: SubscriptionStatus.ACTIVE,
        is_scheduled_for_cancellation: false,
        stripe_price_id: 'price_123',
      };

      // When: Checking for exact data duplicates
      const isDuplicate = service.isExactDataDuplicate(existing, newData);

      // Then: Should not detect duplicates
      expect(isDuplicate).toBe(false);
    });
  });
});
