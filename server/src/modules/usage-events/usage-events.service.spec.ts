import { createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { PinoLoggerService } from '../../common/logger/pino-logger.service';
import { OrganizationSubscription, SubscriptionStatus } from '../organization-subscriptions/entities/organization-subscription.entity';
import { ImmutableSubscriptionService } from '../organization-subscriptions/immutable-subscription.service';
import { Organizations } from '../organizations/entities/organizations.entity';
import { EventType, UsageEvent } from './entities/usage-event.entity';
import { UsageEventsService } from './usage-events.service';

describe('UsageEventsService - Feature: Usage Tracking and Analytics', () => {
  let service: UsageEventsService;
  let usageEventRepo: jest.Mocked<Repository<UsageEvent>>;
  let organizationSubscriptionsRepository: jest.Mocked<Repository<OrganizationSubscription>>;
  let organizationsRepository: jest.Mocked<Repository<Organizations>>;
  let configService: jest.Mocked<ConfigService>;
  let immutableSubscriptionService: jest.Mocked<ImmutableSubscriptionService>;
  let logger: jest.Mocked<PinoLoggerService>;

  // Test data builders for different scenarios
  const createMockUsageEvent = (overrides: Partial<UsageEvent> = {}) => {
    const event = createMock<UsageEvent>();
    event.id = 'event-123';
    event.organization_id = 'org-123';
    event.user_id = 'user-123';
    event.event_type = EventType.SEAT_ADDED;
    event.metadata = { newSeatCount: 5 };
    event.quantity = 1;
    event.created_at = new Date();
    return { ...event, ...overrides };
  };

  const createMockOrganization = (overrides: Partial<Organizations> = {}) => {
    const org = createMock<Organizations>();
    org.id = 'org-123';
    org.name = 'Test Organization';
    org.created_at = new Date('2024-01-15T10:00:00Z');
    return { ...org, ...overrides };
  };

  const createMockSubscription = (overrides: Partial<OrganizationSubscription> = {}) => {
    const sub = createMock<OrganizationSubscription>();
    sub.id = 'sub-123';
    sub.organization_id = 'org-123';
    sub.status = SubscriptionStatus.ACTIVE;
    sub.seats_count = 5;
    sub.stripe_product_id = 'prod_123';
    sub.stripe_plan_id = 'business_monthly';
    return { ...sub, ...overrides };
  };

  // Test data
  const mockUsageEvent = createMockUsageEvent();
  const mockOrganization = createMockOrganization();
  const mockSubscription = createMockSubscription();

  beforeEach(async () => {
    const mockQueryBuilder = createMock<SelectQueryBuilder<UsageEvent>>({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(10),
      getRawOne: jest.fn().mockResolvedValue({ total: '25.5' }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageEventsService,
        {
          provide: getRepositoryToken(UsageEvent),
          useValue: createMock<Repository<UsageEvent>>({
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          }),
        },
        {
          provide: getRepositoryToken(OrganizationSubscription),
          useValue: createMock<Repository<OrganizationSubscription>>(),
        },
        {
          provide: getRepositoryToken(Organizations),
          useValue: createMock<Repository<Organizations>>(),
        },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>({
            get: jest.fn().mockImplementation((key: string) => {
              const config = {
                'usage.freeTrial.monthlyMinutes': 1000,
                'usage.freeTrial.seatCount': 5,
                'usage.defaults.monthlyMinutes': 5000,
                'usage.defaults.seatCount': 10,
                'usage.paidPlans.personal.minutesPerSeat': 1000,
                'usage.paidPlans.business.minutesPerSeat': 2000,
                'usage.paidPlans.company.minutesPerSeat': 5000,
                'usage.paidPlans.custom.minutesPerSeat': 10000,
              };
              return config[key];
            }),
          }),
        },
        {
          provide: ImmutableSubscriptionService,
          useValue: createMock<ImmutableSubscriptionService>(),
        },
        {
          provide: PinoLoggerService,
          useValue: createMock<PinoLoggerService>(),
        },
      ],
    }).compile();

    service = module.get<UsageEventsService>(UsageEventsService);
    usageEventRepo = module.get(getRepositoryToken(UsageEvent));
    organizationSubscriptionsRepository = module.get(getRepositoryToken(OrganizationSubscription));
    organizationsRepository = module.get(getRepositoryToken(Organizations));
    configService = module.get(ConfigService);
    immutableSubscriptionService = module.get(ImmutableSubscriptionService);
    logger = module.get(PinoLoggerService);
  });

  describe('Feature: Event Logging', () => {
    it('should create and save usage event successfully with all parameters', async () => {
      // Given: A request to log a usage event with all parameters
      const orgId = 'org-123';
      const eventType = EventType.SEAT_ADDED;
      const userId = 'user-123';
      const metadata = { newSeatCount: 5 };
      const quantity = 1;
      usageEventRepo.create.mockReturnValue(mockUsageEvent);
      usageEventRepo.save.mockResolvedValue(mockUsageEvent);

      // When: Logging the event
      const result = await service.logEvent(orgId, eventType, userId, metadata, quantity);

      // Then: Should create and save the event with correct parameters
      expect(usageEventRepo.create).toHaveBeenCalledWith({
        organization_id: orgId,
        user_id: userId,
        event_type: eventType,
        metadata,
        quantity,
      });
      expect(usageEventRepo.save).toHaveBeenCalledWith(mockUsageEvent);
      expect(result).toEqual(mockUsageEvent);
    });

    it('should create event with default values when optional parameters are not provided', async () => {
      // Given: A request to log a usage event with minimal parameters
      const orgId = 'org-123';
      const eventType = EventType.QUERY_EXECUTED;
      usageEventRepo.create.mockReturnValue(mockUsageEvent);
      usageEventRepo.save.mockResolvedValue(mockUsageEvent);

      // When: Logging the event
      const result = await service.logEvent(orgId, eventType);

      // Then: Should create event with default values
      expect(usageEventRepo.create).toHaveBeenCalledWith({
        organization_id: orgId,
        user_id: undefined,
        event_type: eventType,
        metadata: undefined,
        quantity: 1,
      });
      expect(result).toEqual(mockUsageEvent);
    });
  });

  describe('Feature: Event Retrieval', () => {
    it('should return all events for organization when no event type filter is provided', async () => {
      // Given: A request to retrieve all events for an organization
      const orgId = 'org-123';
      const mockEvents = [mockUsageEvent];
      usageEventRepo.find.mockResolvedValue(mockEvents);

      // When: Getting events for the organization
      const result = await service.getEvents(orgId);

      // Then: Should return all events ordered by creation date
      expect(usageEventRepo.find).toHaveBeenCalledWith({
        where: { organization_id: orgId },
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(mockEvents);
    });

    it('should return filtered events when event type filter is provided', async () => {
      // Given: A request to retrieve events of a specific type for an organization
      const orgId = 'org-123';
      const eventType = EventType.SEAT_ADDED;
      const mockEvents = [mockUsageEvent];
      usageEventRepo.find.mockResolvedValue(mockEvents);

      // When: Getting events with type filter
      const result = await service.getEvents(orgId, eventType);

      // Then: Should return filtered events
      expect(usageEventRepo.find).toHaveBeenCalledWith({
        where: { organization_id: orgId, event_type: eventType },
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(mockEvents);
    });
  });

  describe('Feature: Event Counting', () => {
    it('should return event count without date filter', async () => {
      // Given: A request to count events of a specific type for an organization
      const orgId = 'org-123';
      const eventType = EventType.SEAT_ADDED;
      const mockQueryBuilder = createMock<SelectQueryBuilder<UsageEvent>>({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      });
      usageEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // When: Getting event count
      const result = await service.getEventCount(orgId, eventType);

      // Then: Should return the count with correct query parameters
      expect(usageEventRepo.createQueryBuilder).toHaveBeenCalledWith('event');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('event.organization_id = :orgId', { orgId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.event_type = :eventType', { eventType });
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should return event count with date filter when since parameter is provided', async () => {
      // Given: A request to count events with a date filter
      const orgId = 'org-123';
      const eventType = EventType.SEAT_ADDED;
      const since = new Date('2024-01-01');
      const mockQueryBuilder = createMock<SelectQueryBuilder<UsageEvent>>({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      });
      usageEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // When: Getting event count with date filter
      const result = await service.getEventCount(orgId, eventType, since);

      // Then: Should return the count with date filter applied
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.created_at >= :since', { since });
      expect(result).toBe(3);
    });
  });

  describe('Feature: Specific Event Tracking', () => {
    it('should track seat addition events with correct metadata', async () => {
      // Given: A request to track a seat addition event
      const orgId = 'org-123';
      const userId = 'user-123';
      const newSeatCount = 5;
      usageEventRepo.create.mockReturnValue(mockUsageEvent);
      usageEventRepo.save.mockResolvedValue(mockUsageEvent);

      // When: Tracking seat addition
      const result = await service.trackSeatAdded(orgId, userId, newSeatCount);

      // Then: Should log the event with correct parameters
      expect(usageEventRepo.create).toHaveBeenCalledWith({
        organization_id: orgId,
        user_id: userId,
        event_type: EventType.SEAT_ADDED,
        metadata: { newSeatCount },
        quantity: 1,
      });
      expect(result).toEqual(mockUsageEvent);
    });

    it('should track seat removal events with correct metadata', async () => {
      // Given: A request to track a seat removal event
      const orgId = 'org-123';
      const userId = 'user-123';
      const newSeatCount = 3;
      usageEventRepo.create.mockReturnValue(mockUsageEvent);
      usageEventRepo.save.mockResolvedValue(mockUsageEvent);

      // When: Tracking seat removal
      const result = await service.trackSeatRemoved(orgId, userId, newSeatCount);

      // Then: Should log the event with correct parameters
      expect(usageEventRepo.create).toHaveBeenCalledWith({
        organization_id: orgId,
        user_id: userId,
        event_type: EventType.SEAT_REMOVED,
        metadata: { newSeatCount },
        quantity: 1,
      });
      expect(result).toEqual(mockUsageEvent);
    });

    it('should track storage upload events with file size conversion', async () => {
      // Given: A request to track a storage upload event
      const orgId = 'org-123';
      const userId = 'user-123';
      const fileSizeBytes = 1073741824; // 1 GB in bytes
      usageEventRepo.create.mockReturnValue(mockUsageEvent);
      usageEventRepo.save.mockResolvedValue(mockUsageEvent);

      // When: Tracking storage upload
      const result = await service.trackStorageUploaded(orgId, userId, fileSizeBytes);

      // Then: Should log the event with converted file size
      expect(usageEventRepo.create).toHaveBeenCalledWith({
        organization_id: orgId,
        user_id: userId,
        event_type: EventType.STORAGE_UPLOADED,
        metadata: {
          fileSizeBytes,
          fileSizeGB: 1.0,
        },
        quantity: 1.0,
      });
      expect(result).toEqual(mockUsageEvent);
    });

    it('should track query execution events with query type metadata', async () => {
      // Given: A request to track a query execution event
      const orgId = 'org-123';
      const userId = 'user-123';
      const queryType = 'SELECT';
      usageEventRepo.create.mockReturnValue(mockUsageEvent);
      usageEventRepo.save.mockResolvedValue(mockUsageEvent);

      // When: Tracking query execution
      const result = await service.trackQueryExecuted(orgId, userId, queryType);

      // Then: Should log the event with query type metadata
      expect(usageEventRepo.create).toHaveBeenCalledWith({
        organization_id: orgId,
        user_id: userId,
        event_type: EventType.QUERY_EXECUTED,
        metadata: { queryType },
        quantity: 1,
      });
      expect(result).toEqual(mockUsageEvent);
    });

    it('should track call minutes usage events with duration metadata', async () => {
      // Given: A request to track call minutes usage
      const orgId = 'org-123';
      const userId = 'user-123';
      const minutes = 30;
      usageEventRepo.create.mockReturnValue(mockUsageEvent);
      usageEventRepo.save.mockResolvedValue(mockUsageEvent);

      // When: Tracking call minutes usage
      const result = await service.trackCallMinutesUsed(orgId, userId, minutes);

      // Then: Should log the event with duration metadata
      expect(usageEventRepo.create).toHaveBeenCalledWith({
        organization_id: orgId,
        user_id: userId,
        event_type: EventType.CALL_MINUTES_USED,
        metadata: { meetingDurationMinutes: minutes },
        quantity: minutes,
      });
      expect(result).toEqual(mockUsageEvent);
    });
  });

  describe('Feature: Usage Calculation', () => {
    it('should calculate seats usage as difference between added and removed seats', async () => {
      // Given: A request to calculate current seats usage
      const orgId = 'org-123';
      const metricType = 'seats';
      const mockQueryBuilder = createMock<SelectQueryBuilder<UsageEvent>>({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn()
          .mockResolvedValueOnce(10) // added seats
          .mockResolvedValueOnce(3), // removed seats
      });
      usageEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // When: Getting current usage for seats
      const result = await service.getCurrentUsage(orgId, metricType);

      // Then: Should return the net difference
      expect(result).toBe(7); // 10 - 3 = 7
    });

    it('should calculate meeting types usage as difference between created and deleted', async () => {
      // Given: A request to calculate current meeting types usage
      const orgId = 'org-123';
      const metricType = 'meeting_types';
      const mockQueryBuilder = createMock<SelectQueryBuilder<UsageEvent>>({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn()
          .mockResolvedValueOnce(5) // created
          .mockResolvedValueOnce(1), // deleted
      });
      usageEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // When: Getting current usage for meeting types
      const result = await service.getCurrentUsage(orgId, metricType);

      // Then: Should return the net difference
      expect(result).toBe(4); // 5 - 1 = 4
    });

    it('should calculate other metrics usage by summing quantities', async () => {
      // Given: A request to calculate usage for a metric that uses quantity summation
      const orgId = 'org-123';
      const metricType = 'storage';
      const mockQueryBuilder = createMock<SelectQueryBuilder<UsageEvent>>({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '15.5' }),
      });
      usageEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // When: Getting current usage for storage
      const result = await service.getCurrentUsage(orgId, metricType);

      // Then: Should return the sum of quantities
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('SUM(event.quantity)', 'total');
      expect(result).toBe(15.5);
    });

    it('should handle null total from query result gracefully', async () => {
      // Given: A request to calculate usage when no events exist
      const orgId = 'org-123';
      const metricType = 'storage';
      const mockQueryBuilder = createMock<SelectQueryBuilder<UsageEvent>>({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      });
      usageEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // When: Getting current usage
      const result = await service.getCurrentUsage(orgId, metricType);

      // Then: Should return 0 for null total
      expect(result).toBe(0);
    });

    it('should throw error for unknown metric types', async () => {
      // Given: A request to calculate usage for an unknown metric type
      const orgId = 'org-123';
      const metricType = 'unknown_metric';

      // When: Getting current usage for unknown metric
      // Then: Should throw an error
      await expect(service.getCurrentUsage(orgId, metricType)).rejects.toThrow(
        'Unknown metric type: unknown_metric',
      );
    });

    it('should apply date filter when since parameter is provided', async () => {
      // Given: A request to calculate usage with a date filter
      const orgId = 'org-123';
      const metricType = 'storage';
      const since = new Date('2024-01-01');
      const mockQueryBuilder = createMock<SelectQueryBuilder<UsageEvent>>({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '10.0' }),
      });
      usageEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // When: Getting current usage with date filter
      const result = await service.getCurrentUsage(orgId, metricType, since);

      // Then: Should apply the date filter and return the result
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.created_at >= :since', { since });
      expect(result).toBe(10.0);
    });
  });

  describe('Feature: Usage Summary', () => {
    it('should return comprehensive usage summary for all metrics', async () => {
      // Given: A request to get usage summary for all metrics
      const orgId = 'org-123';
      const mockQueryBuilder = createMock<SelectQueryBuilder<UsageEvent>>({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
        getRawOne: jest.fn().mockResolvedValue({ total: '10.0' }),
      });
      usageEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // When: Getting usage summary
      const result = await service.getUsageSummary(orgId);

      // Then: Should return summary for all tracked metrics
      expect(result).toEqual({
        seats: 0, // 5 - 5 = 0
        storage: 10.0,
        queries: 10.0,
        call_minutes: 10.0,
        meeting_types: 0, // 5 - 5 = 0
        monthly_reports: 10.0,
        meetings: 10.0,
        ai_memory: 10.0,
      });
    });
  });

  describe('Feature: Monthly Minutes Usage', () => {
    it('should return free trial usage for organization without subscription', async () => {
      // Given: An organization without subscription requesting monthly minutes usage
      const orgId = 'org-123';
      const mockQueryBuilder = createMock<SelectQueryBuilder<UsageEvent>>({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '150.0' }),
      });
      immutableSubscriptionService.getCurrentSubscription.mockResolvedValue(null);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      usageEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // When: Getting monthly minutes usage
      const result = await service.getMonthlyMinutesUsage(orgId);

      // Then: Should return free trial limits and usage
      expect(result).toEqual({
        currentUsage: 150.0,
        monthlyLimit: 1000,
        usagePercentage: 15,
        canInviteKnowted: true,
        resetDate: expect.any(String),
        planTier: 'free',
        seatCount: 5,
      });
    });

    it('should return paid plan usage for organization with subscription', async () => {
      // Given: An organization with subscription requesting monthly minutes usage
      const orgId = 'org-123';
      const mockQueryBuilder = createMock<SelectQueryBuilder<UsageEvent>>({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '500.0' }),
      });
      immutableSubscriptionService.getCurrentSubscription.mockResolvedValue(mockSubscription);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      usageEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Mock the manager.getRepository method
      const mockPricingPlanRepo = createMock<Repository<any>>({
        findOne: jest.fn().mockResolvedValue({
          id: 'plan-123',
          tier: 'business',
          seatLimit: 50,
          stripeProductId: 'prod_123',
        }),
      });

      Object.defineProperty(usageEventRepo, 'manager', {
        value: {
          getRepository: jest.fn().mockReturnValue(mockPricingPlanRepo),
        },
        writable: true,
      });

      // When: Getting monthly minutes usage
      const result = await service.getMonthlyMinutesUsage(orgId);

      // Then: Should return paid plan limits and usage
      expect(result.currentUsage).toBe(500.0);
      expect(result.monthlyLimit).toBe(10000); // 2000 * 5 seats
      expect(result.planTier).toBe('business');
      expect(result.seatCount).toBe(5);
    });

    it('should throw error when organization is not found', async () => {
      // Given: A request for monthly minutes usage for a non-existent organization
      const orgId = 'org-123';
      immutableSubscriptionService.getCurrentSubscription.mockResolvedValue(null);
      organizationsRepository.findOne.mockResolvedValue(null);

      // When: Getting monthly minutes usage
      // Then: Should throw an error
      await expect(service.getMonthlyMinutesUsage(orgId)).rejects.toThrow(
        'Organization org-123 not found',
      );
    });
  });

  describe('Feature: Monthly Minutes Reset', () => {
    it('should reset monthly minutes usage and log reset event', async () => {
      // Given: A request to reset monthly minutes usage for an organization
      const orgId = 'org-123';
      const reason = 'admin_override';
      const mockQueryBuilder = createMock<SelectQueryBuilder<UsageEvent>>({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '100.0' }),
      });
      usageEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      usageEventRepo.create.mockReturnValue(mockUsageEvent);
      usageEventRepo.save.mockResolvedValue(mockUsageEvent);

      // When: Resetting monthly minutes usage
      const result = await service.resetMonthlyMinutesUsage(orgId, reason);

      // Then: Should log reset event and return success response
      expect(usageEventRepo.create).toHaveBeenCalledWith({
        organization_id: orgId,
        user_id: 'system',
        event_type: EventType.MONTHLY_MINUTES_RESET,
        metadata: {
          reason,
          resetDate: expect.any(String),
          previousUsage: 100.0,
        },
        quantity: 1,
      });
      expect(result).toEqual({
        success: true,
        message: 'Monthly minutes usage reset successfully',
        organizationId: orgId,
        resetDate: expect.any(String),
        reason,
      });
    });
  });

  describe('Feature: Reset History Tracking', () => {
    it('should return reset history for organization with formatted data', async () => {
      // Given: A request to get monthly minutes reset history
      const orgId = 'org-123';
      const mockResetEvents = [
        createMock<UsageEvent>({
          id: 'event-1',
          event_type: EventType.MONTHLY_MINUTES_RESET,
          created_at: new Date('2024-01-01'),
          user_id: 'admin-123',
          metadata: {
            reason: 'admin_override',
            previousUsage: 500,
          },
        }),
        createMock<UsageEvent>({
          id: 'event-2',
          event_type: EventType.MONTHLY_MINUTES_RESET,
          created_at: new Date('2024-02-01'),
          user_id: 'system',
          metadata: {
            reason: 'monthly_reset',
            previousUsage: 800,
          },
        }),
      ];
      usageEventRepo.find.mockResolvedValue(mockResetEvents);

      // When: Getting reset history
      const result = await service.getMonthlyMinutesResetHistory(orgId);

      // Then: Should return formatted reset history
      expect(usageEventRepo.find).toHaveBeenCalledWith({
        where: {
          organization_id: orgId,
          event_type: EventType.MONTHLY_MINUTES_RESET,
        },
        order: { created_at: 'DESC' },
      });
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        resetDate: '2024-01-01T00:00:00.000Z',
        reason: 'admin_override',
        previousUsage: 500,
        resetBy: 'admin-123',
      });
    });
  });
});
