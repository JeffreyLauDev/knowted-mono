import { createMock } from '@golevelup/ts-jest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OrganizationSubscription, SubscriptionStatus } from '../organization-subscriptions/entities/organization-subscription.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { PlanTier, PricingPlan } from '../pricing/entities/pricing-plan.entity';
import { PricingService } from '../pricing/pricing.service';
import { SeatManagementService } from './seat-management.service';

describe('SeatManagementService - Feature: Seat Management and Plan Validation', () => {
  let service: TestableSeatManagementService;
  let orgSubRepo: jest.Mocked<Repository<OrganizationSubscription>>;
  let pricingPlanRepo: jest.Mocked<Repository<PricingPlan>>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let pricingService: jest.Mocked<PricingService>;

  // Testable service class that exposes protected methods for testing
  class TestableSeatManagementService extends SeatManagementService {
    public async getPlanTierFromSubscription(
      subscription: OrganizationSubscription,
    ): Promise<PlanTier> {
      return super.getPlanTierFromSubscription(subscription);
    }

    public async getPricingPlanByTier(
      planTier: PlanTier,
    ): Promise<PricingPlan | null> {
      return super.getPricingPlanByTier(planTier);
    }
  }

  // Test data builders for different scenarios
  const createMockSubscription = (overrides: Partial<OrganizationSubscription> = {}) => {
    const subscription = createMock<OrganizationSubscription>();
    subscription.id = 'sub-123';
    subscription.organization_id = 'org-123';
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.seats_count = 5;
    subscription.stripe_product_id = 'prod_business';
    subscription.stripe_plan_id = 'business_monthly';
    return { ...subscription, ...overrides };
  };

  const createMockPricingPlan = (tier: PlanTier, overrides: Partial<PricingPlan> = {}) => {
    const plan = createMock<PricingPlan>();
    plan.id = `plan-${tier.toLowerCase()}`;
    plan.tier = tier;
    plan.seatLimit = tier === PlanTier.PERSONAL ? 5 : tier === PlanTier.BUSINESS ? 50 : 200;
    plan.stripeProductId = `prod_${tier.toLowerCase()}`;
    plan.isActive = true;
    return { ...plan, ...overrides };
  };

  // Test data
  const mockSubscription = createMockSubscription();
  const mockPricingPlan = createMockPricingPlan(PlanTier.BUSINESS);
  const mockPersonalPlan = createMockPricingPlan(PlanTier.PERSONAL);
  const mockCompanyPlan = createMockPricingPlan(PlanTier.COMPANY);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestableSeatManagementService,
        {
          provide: getRepositoryToken(OrganizationSubscription),
          useValue: createMock<Repository<OrganizationSubscription>>({
            findOne: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(PricingPlan),
          useValue: createMock<Repository<PricingPlan>>({
            findOne: jest.fn(),
            find: jest.fn(),
          }),
        },
        {
          provide: OrganizationsService,
          useValue: createMock<OrganizationsService>(),
        },
        {
          provide: PricingService,
          useValue: createMock<PricingService>(),
        },
      ],
    }).compile();

    service = module.get<TestableSeatManagementService>(TestableSeatManagementService);
    orgSubRepo = module.get(getRepositoryToken(OrganizationSubscription));
    pricingPlanRepo = module.get(getRepositoryToken(PricingPlan));
    organizationsService = module.get(OrganizationsService);
    pricingService = module.get(PricingService);
  });

  describe('Feature: Seat Addition Validation', () => {
    it('should validate seat addition successfully when within plan limits', async () => {
      // Given: An organization wants to add seats within their current plan limits
      const organizationId = 'org-123';
      const additionalSeats = 3;
      orgSubRepo.findOne.mockResolvedValue(mockSubscription);
      pricingPlanRepo.findOne.mockResolvedValue(mockPricingPlan);

      // When: Validating the seat addition
      const result = await service.validateSeatAddition(organizationId, additionalSeats);

      // Then: Should approve the addition with correct calculations
      expect(result.isValid).toBe(true);
      expect(result.currentSeats).toBe(5);
      expect(result.requestedSeats).toBe(8); // 5 + 3
      expect(result.planTier).toBe(PlanTier.BUSINESS);
      expect(result.seatLimit).toBe(50);
    });

    it('should reject seat addition when no active subscription exists', async () => {
      // Given: An organization without an active subscription tries to add seats
      const organizationId = 'org-123';
      const additionalSeats = 3;
      orgSubRepo.findOne.mockResolvedValue(null);

      // When: Validating the seat addition
      // Then: Should throw NotFoundException
      await expect(service.validateSeatAddition(organizationId, additionalSeats)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Feature: Seat Count Validation', () => {
    it('should validate seat count successfully when within plan limits', async () => {
      // Given: An organization requests a seat count within their plan limits
      const organizationId = 'org-123';
      const requestedSeats = 10;
      orgSubRepo.findOne.mockResolvedValue(mockSubscription);
      pricingPlanRepo.findOne.mockResolvedValue(mockPricingPlan);

      // When: Validating the seat count
      const result = await service.validateSeatCount(organizationId, requestedSeats);

      // Then: Should approve the request
      expect(result.isValid).toBe(true);
      expect(result.currentSeats).toBe(5);
      expect(result.requestedSeats).toBe(10);
      expect(result.planTier).toBe(PlanTier.BUSINESS);
      expect(result.seatLimit).toBe(50);
      expect(result.requiresUpgrade).toBeUndefined();
    });

    it('should require plan upgrade when seat count exceeds current plan limits', async () => {
      // Given: An organization requests more seats than their current plan allows
      const organizationId = 'org-123';
      const requestedSeats = 100; // Exceeds business plan limit of 50
      orgSubRepo.findOne.mockResolvedValue(mockSubscription);
      pricingPlanRepo.findOne.mockResolvedValue(mockPricingPlan);
      pricingPlanRepo.find.mockResolvedValue([mockCompanyPlan]);

      // When: Validating the seat count
      const result = await service.validateSeatCount(organizationId, requestedSeats);

      // Then: Should require upgrade with appropriate recommendation
      expect(result.isValid).toBe(false);
      expect(result.requiresUpgrade).toBe(true);
      expect(result.message).toContain('Cannot add seats');
      expect(result.suggestedPlan).toBe(PlanTier.COMPANY);
    });

    it('should reject validation when no active subscription exists', async () => {
      // Given: An organization without an active subscription requests seat validation
      const organizationId = 'org-123';
      const requestedSeats = 10;
      orgSubRepo.findOne.mockResolvedValue(null);

      // When: Validating the seat count
      // Then: Should throw NotFoundException
      await expect(service.validateSeatCount(organizationId, requestedSeats)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject validation when pricing plan cannot be found', async () => {
      // Given: An organization with subscription but missing pricing plan data
      const organizationId = 'org-123';
      const requestedSeats = 10;
      orgSubRepo.findOne.mockResolvedValue(mockSubscription);
      pricingPlanRepo.findOne.mockResolvedValue(null);

      // When: Validating the seat count
      // Then: Should throw NotFoundException
      await expect(service.validateSeatCount(organizationId, requestedSeats)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Feature: Plan Upgrade Recommendations', () => {
    it('should recommend appropriate plan for requested seat count', async () => {
      // Given: A request for upgrade recommendation for a specific seat count
      const requestedSeats = 100;
      pricingPlanRepo.find.mockResolvedValue([mockPersonalPlan, mockPricingPlan, mockCompanyPlan]);

      // When: Getting upgrade recommendation
      const result = await service.getUpgradeRecommendation(requestedSeats);

      // Then: Should recommend the smallest plan that can accommodate the seats
      expect(result).toEqual({
        currentPlan: null,
        currentSeats: 100,
        currentSeatLimit: 0,
        recommendedPlan: PlanTier.COMPANY,
        recommendedSeatLimit: 200,
        upgradeReason: 'Plan supports up to 200 seats',
      });
    });

    it('should return null when no plan can accommodate the requested seats', async () => {
      // Given: A request for an extremely high seat count that no plan supports
      const requestedSeats = 1000;
      pricingPlanRepo.find.mockResolvedValue([mockPersonalPlan, mockPricingPlan, mockCompanyPlan]);

      // When: Getting upgrade recommendation
      const result = await service.getUpgradeRecommendation(requestedSeats);

      // Then: Should return null (no suitable plan found)
      expect(result).toBeNull();
    });

    it('should recommend the smallest suitable plan for moderate seat requirements', async () => {
      // Given: A request for a moderate seat count that multiple plans can support
      const requestedSeats = 10;
      pricingPlanRepo.find.mockResolvedValue([mockPersonalPlan, mockPricingPlan, mockCompanyPlan]);

      // When: Getting upgrade recommendation
      const result = await service.getUpgradeRecommendation(requestedSeats);

      // Then: Should recommend the smallest plan that can accommodate the seats
      expect(result?.recommendedPlan).toBe(PlanTier.BUSINESS);
      expect(result?.recommendedSeatLimit).toBe(50);
    });
  });

  describe('Feature: Current Usage Analysis', () => {
    it('should return null when current seat usage is within plan limits', async () => {
      // Given: An organization with seat usage within their plan limits
      const organizationId = 'org-123';
      orgSubRepo.findOne.mockResolvedValue(mockSubscription);
      pricingPlanRepo.findOne.mockResolvedValue(mockPricingPlan);

      // When: Checking if upgrade is needed
      const result = await service.checkUpgradeNeeded(organizationId);

      // Then: Should return null (no upgrade needed)
      expect(result).toBeNull();
    });

    it('should recommend upgrade when current seat usage exceeds plan limits', async () => {
      // Given: An organization with seat usage exceeding their plan limits
      const organizationId = 'org-123';
      const subscriptionWithExcessSeats = createMockSubscription({ seats_count: 100 });
      orgSubRepo.findOne.mockResolvedValue(subscriptionWithExcessSeats);
      pricingPlanRepo.findOne.mockResolvedValue(mockPricingPlan);
      pricingPlanRepo.find.mockResolvedValue([mockCompanyPlan]);

      // When: Checking if upgrade is needed
      const result = await service.checkUpgradeNeeded(organizationId);

      // Then: Should recommend upgrade with appropriate details
      expect(result).toEqual({
        currentPlan: PlanTier.BUSINESS,
        currentSeats: 100,
        currentSeatLimit: 50,
        recommendedPlan: PlanTier.COMPANY,
        recommendedSeatLimit: 200,
        upgradeReason: 'Current usage (100 seats) exceeds plan limit (50 seats)',
      });
    });

    it('should return null when no active subscription exists', async () => {
      // Given: An organization without an active subscription
      const organizationId = 'org-123';
      orgSubRepo.findOne.mockResolvedValue(null);

      // When: Checking if upgrade is needed
      const result = await service.checkUpgradeNeeded(organizationId);

      // Then: Should return null (no subscription to check)
      expect(result).toBeNull();
    });

    it('should return null when pricing plan cannot be found', async () => {
      // Given: An organization with subscription but missing pricing plan data
      const organizationId = 'org-123';
      orgSubRepo.findOne.mockResolvedValue(mockSubscription);
      pricingPlanRepo.findOne.mockResolvedValue(null);

      // When: Checking if upgrade is needed
      const result = await service.checkUpgradeNeeded(organizationId);

      // Then: Should return null (cannot determine limits)
      expect(result).toBeNull();
    });
  });

  describe('Feature: Seat Usage Information', () => {
    it('should return current seat usage information with percentage calculation', async () => {
      // Given: An organization with active subscription and pricing plan
      const organizationId = 'org-123';
      orgSubRepo.findOne.mockResolvedValue(mockSubscription);
      pricingPlanRepo.findOne.mockResolvedValue(mockPricingPlan);

      // When: Getting current seat usage information
      const result = await service.getCurrentSeatUsage(organizationId);

      // Then: Should return comprehensive usage information
      expect(result).toEqual({
        currentSeats: 5,
        planTier: PlanTier.BUSINESS,
        seatLimit: 50,
        usagePercentage: 10, // 5/50 * 100
      });
    });

    it('should throw error when no active subscription exists', async () => {
      // Given: An organization without an active subscription
      const organizationId = 'org-123';
      orgSubRepo.findOne.mockResolvedValue(null);

      // When: Getting current seat usage information
      // Then: Should throw NotFoundException
      await expect(service.getCurrentSeatUsage(organizationId)).rejects.toThrow(NotFoundException);
    });

    it('should throw error when pricing plan cannot be found', async () => {
      // Given: An organization with subscription but missing pricing plan data
      const organizationId = 'org-123';
      orgSubRepo.findOne.mockResolvedValue(mockSubscription);
      pricingPlanRepo.findOne.mockResolvedValue(null);

      // When: Getting current seat usage information
      // Then: Should throw NotFoundException
      await expect(service.getCurrentSeatUsage(organizationId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Feature: Plan Compatibility Analysis', () => {
    it('should return compatible plans for specific seat count', async () => {
      // Given: A request for plans that support a specific seat count
      const seatCount = 50;
      pricingPlanRepo.find.mockResolvedValue([mockPricingPlan]);

      // When: Getting compatible plans
      const result = await service.getCompatiblePlans(seatCount);

      // Then: Should return plans that support the exact seat count
      expect(pricingPlanRepo.find).toHaveBeenCalledWith({
        where: {
          isActive: true,
          seatLimit: seatCount,
        },
        order: { seatLimit: 'ASC' },
      });
      expect(result).toEqual([mockPricingPlan]);
    });

    it('should return empty array when no plans support the seat count', async () => {
      // Given: A request for plans supporting an unsupported seat count
      const seatCount = 1000;
      pricingPlanRepo.find.mockResolvedValue([]);

      // When: Getting compatible plans
      const result = await service.getCompatiblePlans(seatCount);

      // Then: Should return empty array
      expect(result).toEqual([]);
    });
  });

  describe('Feature: Plan Tier Resolution', () => {
    it('should resolve plan tier from subscription using Stripe product ID', async () => {
      // Given: A subscription with a valid Stripe product ID
      const subscription = createMockSubscription({ stripe_product_id: 'prod_business' });
      pricingPlanRepo.findOne.mockResolvedValue(mockPricingPlan);

      // When: Getting plan tier from subscription
      const result = await service.getPlanTierFromSubscription(subscription);

      // Then: Should resolve to the correct plan tier
      expect(pricingPlanRepo.findOne).toHaveBeenCalledWith({
        where: { stripeProductId: subscription.stripe_product_id },
      });
      expect(result).toBe(PlanTier.BUSINESS);
    });

    it('should fallback to plan ID when Stripe product ID is not found', async () => {
      // Given: A subscription with unknown Stripe product ID but valid plan ID
      const subscription = createMockSubscription({ 
        stripe_product_id: 'unknown_product',
        stripe_plan_id: 'business_monthly'
      });
      pricingPlanRepo.findOne.mockResolvedValue(null);

      // When: Getting plan tier from subscription
      const result = await service.getPlanTierFromSubscription(subscription);

      // Then: Should fallback to plan ID parsing
      expect(result).toBe(PlanTier.BUSINESS);
    });

    it('should default to business tier when plan tier cannot be determined', async () => {
      // Given: A subscription with no identifiable plan information
      const subscription = createMockSubscription({ 
        stripe_product_id: null,
        stripe_plan_id: 'unknown_plan'
      });
      pricingPlanRepo.findOne.mockResolvedValue(null);

      // When: Getting plan tier from subscription
      const result = await service.getPlanTierFromSubscription(subscription);

      // Then: Should default to business tier
      expect(result).toBe(PlanTier.BUSINESS);
    });

    it('should retrieve pricing plan by tier', async () => {
      // Given: A request for a specific plan tier
      const planTier = PlanTier.BUSINESS;
      pricingPlanRepo.findOne.mockResolvedValue(mockPricingPlan);

      // When: Getting pricing plan by tier
      const result = await service.getPricingPlanByTier(planTier);

      // Then: Should return the correct pricing plan
      expect(pricingPlanRepo.findOne).toHaveBeenCalledWith({
        where: { tier: planTier },
      });
      expect(result).toEqual(mockPricingPlan);
    });

    it('should throw error when pricing plan is not found for tier', async () => {
      // Given: A request for a non-existent plan tier
      const planTier = PlanTier.BUSINESS;
      pricingPlanRepo.findOne.mockResolvedValue(null);

      // When: Getting pricing plan by tier
      // Then: Should throw NotFoundException
      await expect(service.getSeatLimitForPlan(planTier)).rejects.toThrow(NotFoundException);
    });
  });
});
