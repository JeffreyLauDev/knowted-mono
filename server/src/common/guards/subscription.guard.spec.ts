import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OrganizationSubscription, SubscriptionStatus } from '../../modules/organization-subscriptions/entities/organization-subscription.entity';
import { SubscriptionGuard } from './subscription.guard';

describe('SubscriptionGuard - Feature: Subscription-based Access Control', () => {
  let guard: SubscriptionGuard;
  let reflector: jest.Mocked<Reflector>;
  let orgSubRepo: jest.Mocked<Repository<OrganizationSubscription>>;

  const mockOrganizationId = 'org-123';

  // Test data builders for different subscription states
  const createActiveSubscription = (orgId: string = mockOrganizationId) => {
    const subscription = createMock<OrganizationSubscription>();
    subscription.organization_id = orgId;
    subscription.status = SubscriptionStatus.ACTIVE;
    return subscription;
  };

  const createTrialingSubscription = (orgId: string = mockOrganizationId) => {
    const subscription = createMock<OrganizationSubscription>();
    subscription.organization_id = orgId;
    subscription.status = SubscriptionStatus.TRIALING;
    return subscription;
  };

  const createInactiveSubscription = (orgId: string = mockOrganizationId, status: SubscriptionStatus = SubscriptionStatus.CANCELLED) => {
    const subscription = createMock<OrganizationSubscription>();
    subscription.organization_id = orgId;
    subscription.status = status;
    return subscription;
  };

  const createMockRequest = (organizationId?: string, source: 'params' | 'body' | 'query' = 'params') => {
    const request: any = { 
      url: '/api/protected',
      params: {},
      body: {},
      query: {},
    };
    
    if (organizationId) {
      request[source].organizationId = organizationId;
    }
    
    return request;
  };

  const createMockContext = (request: any) => {
    const mockContext = createMock<ExecutionContext>();
    mockContext.switchToHttp.mockReturnValue({
      getRequest: () => request,
    } as any);
    return mockContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionGuard,
        {
          provide: Reflector,
          useValue: createMock<Reflector>(),
        },
        {
          provide: getRepositoryToken(OrganizationSubscription),
          useValue: createMock<Repository<OrganizationSubscription>>(),
        },
      ],
    }).compile();

    guard = module.get<SubscriptionGuard>(SubscriptionGuard);
    reflector = module.get(Reflector);
    orgSubRepo = module.get(getRepositoryToken(OrganizationSubscription));
  });

  describe('Feature: Public Endpoints (No Subscription Required)', () => {
    it('should allow access to public endpoints that do not require subscription', async () => {
      // Given: A public endpoint that doesn't require subscription
      const mockContext = createMockContext({ url: '/api/public' });
      reflector.getAllAndOverride.mockReturnValue(false);

      // When: Checking access to the endpoint
      const result = await guard.canActivate(mockContext);

      // Then: Access should be granted without checking subscription
      expect(result).toBe(true);
      expect(orgSubRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Feature: Subscription-Protected Endpoints', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(true);
    });

    describe('Scenario: Organization with Active Subscription', () => {
      it('should allow access when organization has an active subscription', async () => {
        // Given: An organization with an active subscription
        const mockContext = createMockContext(createMockRequest(mockOrganizationId));
        orgSubRepo.findOne.mockResolvedValue(createActiveSubscription());

        // When: Checking access to a protected endpoint
        const result = await guard.canActivate(mockContext);

        // Then: Access should be granted
        expect(result).toBe(true);
        expect(orgSubRepo.findOne).toHaveBeenCalledWith({
          where: { organization_id: mockOrganizationId },
        });
      });

      it('should allow access when organization has a trialing subscription', async () => {
        // Given: An organization with a trialing subscription
        const mockContext = createMockContext(createMockRequest(mockOrganizationId));
        orgSubRepo.findOne.mockResolvedValue(createTrialingSubscription());

        // When: Checking access to a protected endpoint
        const result = await guard.canActivate(mockContext);

        // Then: Access should be granted (trialing is considered active)
        expect(result).toBe(true);
      });
    });

    describe('Scenario: Organization with Inactive Subscription', () => {
      it('should deny access when organization has no subscription', async () => {
        // Given: An organization with no subscription
        const mockContext = createMockContext(createMockRequest(mockOrganizationId));
        orgSubRepo.findOne.mockResolvedValue(null);

        // When: Checking access to a protected endpoint
        // Then: Access should be denied with appropriate error
        await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
        
        const error = await guard.canActivate(mockContext).catch(e => e);
        expect(error.response).toEqual({
          message: 'No subscription found',
          error: 'NO_SUBSCRIPTION',
          upgradeRequired: true,
        });
      });

      it('should deny access when subscription is cancelled', async () => {
        // Given: An organization with a cancelled subscription
        const mockContext = createMockContext(createMockRequest(mockOrganizationId));
        orgSubRepo.findOne.mockResolvedValue(createInactiveSubscription(mockOrganizationId, SubscriptionStatus.CANCELLED));

        // When: Checking access to a protected endpoint
        // Then: Access should be denied with subscription status
        await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
        
        const error = await guard.canActivate(mockContext).catch(e => e);
        expect(error.response).toEqual({
          message: 'Subscription is not active',
          error: 'INACTIVE_SUBSCRIPTION',
          currentStatus: SubscriptionStatus.CANCELLED,
          upgradeRequired: true,
        });
      });

      it('should deny access for all inactive subscription statuses', async () => {
        // Given: Various inactive subscription statuses
        const inactiveStatuses = [
          SubscriptionStatus.CANCELLED,
          SubscriptionStatus.PAST_DUE,
          SubscriptionStatus.INCOMPLETE,
          SubscriptionStatus.INCOMPLETE_EXPIRED,
          SubscriptionStatus.UNPAID,
          SubscriptionStatus.PAUSED,
          SubscriptionStatus.SCHEDULED_FOR_CANCELLATION,
          SubscriptionStatus.EXPIRED,
        ];

        for (const status of inactiveStatuses) {
          // Given: An organization with inactive subscription
          const mockContext = createMockContext(createMockRequest(mockOrganizationId));
          orgSubRepo.findOne.mockResolvedValue(createInactiveSubscription(mockOrganizationId, status));

          // When: Checking access to a protected endpoint
          // Then: Access should be denied
          await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
        }
      });
    });

    describe('Scenario: Organization ID Resolution', () => {
      it('should find organization ID from request parameters', async () => {
        // Given: Organization ID in request params
        const mockContext = createMockContext(createMockRequest(mockOrganizationId, 'params'));
        orgSubRepo.findOne.mockResolvedValue(createActiveSubscription());

        // When: Checking access
        await guard.canActivate(mockContext);

        // Then: Should query with the correct organization ID
        expect(orgSubRepo.findOne).toHaveBeenCalledWith({
          where: { organization_id: mockOrganizationId },
        });
      });

      it('should find organization ID from request body', async () => {
        // Given: Organization ID in request body
        const mockContext = createMockContext(createMockRequest(mockOrganizationId, 'body'));
        orgSubRepo.findOne.mockResolvedValue(createActiveSubscription());

        // When: Checking access
        await guard.canActivate(mockContext);

        // Then: Should query with the correct organization ID
        expect(orgSubRepo.findOne).toHaveBeenCalledWith({
          where: { organization_id: mockOrganizationId },
        });
      });

      it('should find organization ID from query parameters', async () => {
        // Given: Organization ID in query params
        const mockContext = createMockContext(createMockRequest(mockOrganizationId, 'query'));
        orgSubRepo.findOne.mockResolvedValue(createActiveSubscription());

        // When: Checking access
        await guard.canActivate(mockContext);

        // Then: Should query with the correct organization ID
        expect(orgSubRepo.findOne).toHaveBeenCalledWith({
          where: { organization_id: mockOrganizationId },
        });
      });

      it('should allow access when no organization ID is found (non-organization request)', async () => {
        // Given: A request without organization ID
        const mockContext = createMockContext(createMockRequest());
        const loggerSpy = jest.spyOn(guard['logger'], 'warn');

        // When: Checking access
        const result = await guard.canActivate(mockContext);

        // Then: Should allow access and log warning
        expect(result).toBe(true);
        expect(loggerSpy).toHaveBeenCalledWith(
          'No organization ID found in request for subscription check',
        );
        expect(orgSubRepo.findOne).not.toHaveBeenCalled();
      });
    });
  });

  describe('Feature: Error Handling and Resilience', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(true);
    });

    it('should allow access when database errors occur (fail-open for resilience)', async () => {
      // Given: A database error occurs during subscription check
      const mockContext = createMockContext(createMockRequest(mockOrganizationId));
      orgSubRepo.findOne.mockRejectedValue(new Error('Database connection failed'));
      const loggerSpy = jest.spyOn(guard['logger'], 'error');

      // When: Checking access
      const result = await guard.canActivate(mockContext);

      // Then: Should allow access and log the error (fail-open strategy)
      expect(result).toBe(true);
      expect(loggerSpy).toHaveBeenCalledWith(
        `Error checking subscription for organization ${mockOrganizationId}:`,
        expect.any(Error),
      );
    });

    it('should re-throw ForbiddenException from subscription validation', async () => {
      // Given: A ForbiddenException is thrown during subscription check
      const mockContext = createMockContext(createMockRequest(mockOrganizationId));
      const originalError = new ForbiddenException('Original subscription error');
      orgSubRepo.findOne.mockRejectedValue(originalError);

      // When: Checking access
      // Then: Should re-throw the original ForbiddenException
      await expect(guard.canActivate(mockContext)).rejects.toThrow(originalError);
    });
  });
});
