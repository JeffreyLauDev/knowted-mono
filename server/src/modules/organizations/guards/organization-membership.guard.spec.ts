import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { SKIP_ORGANIZATION_MEMBERSHIP_KEY } from '../decorators/skip-organization-membership.decorator';
import { OrganizationsService } from '../organizations.service';
import { OrganizationMembershipGuard } from './organization-membership.guard';

describe('OrganizationMembershipGuard - Feature: Organization Access Control', () => {
  let guard: OrganizationMembershipGuard;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let reflector: jest.Mocked<Reflector>;

  // Test data builders for different scenarios
  const createMockUser = (id: string = 'user-123', email: string = 'test@example.com') => ({
    sub: id,
    email,
  });

  const createMockOrganization = (id: string, name: string) => ({ id, name });

  const createUserWithOrganizations = (userId: string, organizationIds: string[]) => {
    return organizationIds.map(id => createMockOrganization(id, `${id} Organization`));
  };

  const createPublicRequest = (url: string = '/api/public') => ({
    url,
    user: null,
    params: {},
    query: {},
  });

  const createProtectedRequest = (organizationId: string, user: any, source: 'params' | 'query' = 'params') => {
    const request: any = {
      url: '/api/protected',
      user,
      params: {},
      query: {},
    };

    if (source === 'params') {
      request.params.organizationId = organizationId;
    } else if (source === 'query') {
      request.query.organizationId = organizationId;
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

  // Test data
  const mockUser = createMockUser();
  const mockOrganizationId = 'org-123';
  const mockUserOrganizations = createUserWithOrganizations(mockUser.sub, [
    'org-123',
    'org-456',
    'org-from-query-underscore',
    'org-from-query',
    'org-from-params',
    'org-from-body',
    'org-from-body-underscore',
    'org-from-id',
  ]);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationMembershipGuard,
        {
          provide: OrganizationsService,
          useValue: createMock<OrganizationsService>(),
        },
        {
          provide: Reflector,
          useValue: createMock<Reflector>(),
        },
      ],
    }).compile();

    guard = module.get<OrganizationMembershipGuard>(OrganizationMembershipGuard);
    organizationsService = module.get(OrganizationsService);
    reflector = module.get(Reflector);
  });

  describe('Feature: Public Endpoint Access', () => {
    it('should allow access to public endpoints without organization membership check', async () => {
      // Given: A public endpoint that doesn't require organization membership
      const mockContext = createMockContext(createPublicRequest());
      reflector.getAllAndOverride.mockReturnValue(true);

      // When: Checking access to the public endpoint
      const result = await guard.canActivate(mockContext);

      // Then: Access should be granted without checking organization membership
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
      expect(organizationsService.getUserOrganizations).not.toHaveBeenCalled();
    });
  });

  describe('Feature: Skip Organization Membership Check', () => {
    it('should allow access when organization membership check is explicitly skipped', async () => {
      // Given: An endpoint that explicitly skips organization membership validation
      const mockContext = createMockContext(createPublicRequest('/api/skip-membership'));
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(true); // SKIP_ORGANIZATION_MEMBERSHIP_KEY

      // When: Checking access to the endpoint
      const result = await guard.canActivate(mockContext);

      // Then: Access should be granted without checking organization membership
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_ORGANIZATION_MEMBERSHIP_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
      expect(organizationsService.getUserOrganizations).not.toHaveBeenCalled();
    });
  });

  describe('Feature: User Authentication Validation', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should reject access when user is not authenticated', async () => {
      // Given: A protected endpoint with no authenticated user
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, null));
      reflector.getAllAndOverride.mockReturnValue(false);

      // When: Checking access to the protected endpoint
      // Then: Should throw UnauthorizedException
      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Invalid user authentication');
    });

    it('should reject access when user authentication is incomplete (missing sub)', async () => {
      // Given: A protected endpoint with incomplete user authentication
      const incompleteUser = { email: 'test@example.com' }; // Missing sub
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, incompleteUser));

      // When: Checking access to the protected endpoint
      // Then: Should throw UnauthorizedException
      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Invalid user authentication');
    });
  });

  describe('Feature: Organization ID Resolution', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should reject access when organization ID is not provided', async () => {
      // Given: A protected endpoint without organization ID
      const mockContext = createMockContext({
        url: '/api/protected',
        user: mockUser,
        params: {},
        query: {},
      });

      // When: Checking access to the protected endpoint
      // Then: Should throw ForbiddenException
      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Organization ID is required');
    });

    it('should find organization ID from request parameters', async () => {
      // Given: Organization ID in request params
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser, 'params'));
      organizationsService.getUserOrganizations.mockResolvedValue(mockUserOrganizations);

      // When: Checking access
      const result = await guard.canActivate(mockContext);

      // Then: Should allow access and verify membership
      expect(result).toBe(true);
      expect(organizationsService.getUserOrganizations).toHaveBeenCalledWith(mockUser.sub);
    });

    it('should find organization ID from query parameters', async () => {
      // Given: Organization ID in query params
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser, 'query'));
      organizationsService.getUserOrganizations.mockResolvedValue(mockUserOrganizations);

      // When: Checking access
      const result = await guard.canActivate(mockContext);

      // Then: Should allow access and verify membership
      expect(result).toBe(true);
      expect(organizationsService.getUserOrganizations).toHaveBeenCalledWith(mockUser.sub);
    });

    it('should support different organization ID parameter formats', async () => {
      // Given: Various organization ID parameter formats
      const testCases = [
        { source: 'query.organization_id', value: { query: { organization_id: 'org-from-query-underscore' } } },
        { source: 'query.organizationId', value: { query: { organizationId: 'org-from-query' } } },
        { source: 'params.organizationId', value: { params: { organizationId: 'org-from-params' } } },
        { source: 'params.id', value: { params: { id: 'org-from-id' } } },
      ];

      for (const testCase of testCases) {
        // Given: A request with organization ID in different formats
        const mockContext = createMockContext({
          url: '/api/protected',
          user: mockUser,
          params: {},
          query: {},
          ...testCase.value,
        });
        organizationsService.getUserOrganizations.mockResolvedValue(mockUserOrganizations);

        // When: Checking access
        const result = await guard.canActivate(mockContext);

        // Then: Should allow access and verify membership
        expect(result).toBe(true);
        expect(organizationsService.getUserOrganizations).toHaveBeenCalledWith(mockUser.sub);
      }
    });
  });

  describe('Feature: Organization Membership Validation', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should allow access when user has membership in the requested organization', async () => {
      // Given: A user with membership in the requested organization
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      organizationsService.getUserOrganizations.mockResolvedValue(mockUserOrganizations);

      // When: Checking access to the protected endpoint
      const result = await guard.canActivate(mockContext);

      // Then: Access should be granted
      expect(result).toBe(true);
      expect(organizationsService.getUserOrganizations).toHaveBeenCalledWith(mockUser.sub);
    });

    it('should reject access when user does not have membership in the requested organization', async () => {
      // Given: A user without membership in the requested organization
      const unauthorizedOrgId = 'org-999';
      const mockContext = createMockContext(createProtectedRequest(unauthorizedOrgId, mockUser));
      organizationsService.getUserOrganizations.mockResolvedValue(mockUserOrganizations);

      // When: Checking access to the protected endpoint
      // Then: Should throw ForbiddenException
      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        "You don't have access to this organization",
      );
    });

    it('should handle users with multiple organization memberships correctly', async () => {
      // Given: A user with multiple organization memberships
      const userWithMultipleOrgs = createMockUser('user-multi', 'multi@example.com');
      const userOrgs = createUserWithOrganizations(userWithMultipleOrgs.sub, ['org-1', 'org-2', 'org-3']);
      const mockContext = createMockContext(createProtectedRequest('org-2', userWithMultipleOrgs));
      organizationsService.getUserOrganizations.mockResolvedValue(userOrgs);

      // When: Checking access to an organization the user is a member of
      const result = await guard.canActivate(mockContext);

      // Then: Access should be granted
      expect(result).toBe(true);
      expect(organizationsService.getUserOrganizations).toHaveBeenCalledWith(userWithMultipleOrgs.sub);
    });

    it('should reject access when user has no organization memberships', async () => {
      // Given: A user with no organization memberships
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      organizationsService.getUserOrganizations.mockResolvedValue([]);

      // When: Checking access to the protected endpoint
      // Then: Should throw ForbiddenException
      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        "You don't have access to this organization",
      );
    });
  });

  describe('Feature: Error Handling and Resilience', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should handle service errors gracefully and reject access', async () => {
      // Given: A service error occurs during organization membership check
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      organizationsService.getUserOrganizations.mockRejectedValue(new Error('Service unavailable'));

      // When: Checking access to the protected endpoint
      // Then: Should throw ForbiddenException with generic error message
      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Failed to verify organization membership',
      );
    });

    it('should re-throw ForbiddenException from organization service', async () => {
      // Given: A ForbiddenException is thrown by the organization service
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      const originalError = new ForbiddenException('Original organization error');
      organizationsService.getUserOrganizations.mockRejectedValue(originalError);

      // When: Checking access to the protected endpoint
      // Then: Should re-throw the original ForbiddenException
      await expect(guard.canActivate(mockContext)).rejects.toThrow(originalError);
    });
  });

  describe('Feature: Complete Organization Access Flows', () => {
    it('should handle end-to-end flow for public endpoints', async () => {
      // Given: A complete request to a public endpoint
      const mockContext = createMockContext(createPublicRequest('/api/health'));
      reflector.getAllAndOverride.mockReturnValue(true);

      // When: Processing the complete access flow
      const result = await guard.canActivate(mockContext);

      // Then: Should allow access without any organization checks
      expect(result).toBe(true);
      expect(organizationsService.getUserOrganizations).not.toHaveBeenCalled();
    });

    it('should handle end-to-end flow for protected endpoints with valid membership', async () => {
      // Given: A complete request to a protected endpoint with valid organization membership
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      reflector.getAllAndOverride.mockReturnValue(false);
      organizationsService.getUserOrganizations.mockResolvedValue(mockUserOrganizations);

      // When: Processing the complete access flow
      const result = await guard.canActivate(mockContext);

      // Then: Should allow access after verifying membership
      expect(result).toBe(true);
      expect(organizationsService.getUserOrganizations).toHaveBeenCalledWith(mockUser.sub);
    });

    it('should handle end-to-end flow for protected endpoints with invalid membership', async () => {
      // Given: A complete request to a protected endpoint with invalid organization membership
      const mockContext = createMockContext(createProtectedRequest('org-unauthorized', mockUser));
      reflector.getAllAndOverride.mockReturnValue(false);
      organizationsService.getUserOrganizations.mockResolvedValue(mockUserOrganizations);

      // When: Processing the complete access flow
      // Then: Should reject access due to invalid membership
      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });
  });
});
