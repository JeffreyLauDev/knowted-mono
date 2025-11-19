import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { Organizations } from '../../organizations/entities/organizations.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { PermissionsService } from '../permissions.service';
import { AccessLevel, ResourceType } from '../types/permissions.types';
import { PERMISSION_KEY, PermissionGuard } from './permission.guard';

describe('PermissionGuard - Feature: Fine-Grained Permission Control', () => {
  let guard: PermissionGuard;
  let reflector: jest.Mocked<Reflector>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let userOrganizationRepository: jest.Mocked<Repository<UserOrganization>>;
  let organizationsRepository: jest.Mocked<Repository<Organizations>>;

  // Test data builders for different scenarios
  const createMockUser = (id: string = 'user-123', email: string = 'test@example.com') => ({
    sub: id,
    email,
  });

  const createMockTeam = (id: string, isAdmin: boolean = false) => ({
    id,
    name: `Team ${id}`,
    description: `Description for team ${id}`,
    organization_id: 'org-123',
    organization: null,
    created_at: new Date(),
    updated_at: null,
    is_admin: isAdmin,
  });

  const createMockUserOrganization = (userId: string, organizationId: string, teamId: string, isAdmin: boolean = false) => {
    const userOrg = createMock<UserOrganization>();
    userOrg.user_id = userId;
    userOrg.organization_id = organizationId;
    userOrg.team = createMockTeam(teamId, isAdmin);
    return userOrg;
  };

  const createPublicRequest = (url: string = '/api/public') => ({
    url,
    user: null,
    params: {},
    query: {},
    body: {},
  });

  const createProtectedRequest = (organizationId: string, user: any, source: 'params' | 'query' | 'body' = 'params') => {
    const request: any = {
      url: '/api/protected',
      user,
      params: {},
      query: {},
      body: {},
    };

    if (source === 'params') {
      request.params.organizationId = organizationId;
    } else if (source === 'query') {
      request.query.organizationId = organizationId;
    } else if (source === 'body') {
      request.body.organizationId = organizationId;
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

  const createPermissionMetadata = (resource: ResourceType, action: AccessLevel, getResourceId?: (request: any) => string | null) => ({
    resource,
    action,
    getResourceId,
  });

  // Test data
  const mockUser = createMockUser();
  const mockOrganizationId = 'org-123';
  const mockTeamId = 'team-123';
  const mockAdminTeamId = 'admin-team-123';

  const mockUserOrg = createMockUserOrganization(mockUser.sub, mockOrganizationId, mockTeamId, false);
  const mockAdminUserOrg = createMockUserOrganization(mockUser.sub, mockOrganizationId, mockAdminTeamId, true);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        {
          provide: Reflector,
          useValue: createMock<Reflector>(),
        },
        {
          provide: PermissionsService,
          useValue: createMock<PermissionsService>(),
        },
        {
          provide: getRepositoryToken(UserOrganization),
          useValue: createMock<Repository<UserOrganization>>(),
        },
        {
          provide: getRepositoryToken(Organizations),
          useValue: createMock<Repository<Organizations>>(),
        },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get(Reflector);
    permissionsService = module.get(PermissionsService);
    userOrganizationRepository = module.get(getRepositoryToken(UserOrganization));
    organizationsRepository = module.get(getRepositoryToken(Organizations));
  });

  describe('Feature: Public Endpoint Access', () => {
    it('should allow access to public endpoints without permission checks', async () => {
      // Given: A public endpoint that doesn't require permission validation
      const mockContext = createMockContext(createPublicRequest());
      reflector.getAllAndOverride.mockReturnValue(true);

      // When: Checking access to the public endpoint
      const result = await guard.canActivate(mockContext);

      // Then: Access should be granted without any permission checks
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
      expect(userOrganizationRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('Feature: Permission Metadata Validation', () => {
    it('should allow access when no permission metadata is found', async () => {
      // Given: An endpoint without permission metadata
      const mockContext = createMockContext(createPublicRequest('/api/no-permission'));
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(undefined);

      // When: Checking access to the endpoint
      const result = await guard.canActivate(mockContext);

      // Then: Access should be granted (no permission required)
      expect(result).toBe(true);
      expect(reflector.get).toHaveBeenCalledWith(PERMISSION_KEY, mockContext.getHandler());
    });

    it('should reject organization resource permissions as they are always available', async () => {
      // Given: An endpoint with organization permission metadata (invalid usage)
      const mockContext = createMockContext(createPublicRequest('/api/organization'));
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(createPermissionMetadata('organization' as ResourceType, 'read' as AccessLevel));

      // When: Checking access to the endpoint
      // Then: Should throw UnauthorizedException with specific error message
      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        "Invalid permission decorator: @RequirePermission('organization', 'read') is not allowed. Organization access is always available for authenticated users.",
      );
    });
  });

  describe('Feature: Request Parameter Validation', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(createPermissionMetadata('meeting' as ResourceType, 'read' as AccessLevel));
    });

    it('should reject access when user is not authenticated', async () => {
      // Given: A protected endpoint with no authenticated user
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, null));

      // When: Checking access to the protected endpoint
      // Then: Should throw UnauthorizedException
      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Missing required parameters');
    });

    it('should reject access when organization ID is not provided', async () => {
      // Given: A protected endpoint without organization ID
      const mockContext = createMockContext({
        url: '/api/protected',
        user: mockUser,
        params: {},
        query: {},
        body: {},
      });

      // When: Checking access to the protected endpoint
      // Then: Should throw UnauthorizedException
      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Missing required parameters');
    });

    it('should find organization ID from different request sources', async () => {
      // Given: Various organization ID parameter formats
      const testCases = [
        { source: 'params', value: { params: { organizationId: 'org-from-params' } } },
        { source: 'query', value: { query: { organizationId: 'org-from-query' } } },
        { source: 'query_underscore', value: { query: { organization_id: 'org-from-query-underscore' } } },
        { source: 'body', value: { body: { organizationId: 'org-from-body' } } },
        { source: 'body_underscore', value: { body: { organization_id: 'org-from-body-underscore' } } },
      ];

      for (const testCase of testCases) {
        // Given: A request with organization ID in different formats
        const mockContext = createMockContext({
          url: '/api/protected',
          user: mockUser,
          params: {},
          query: {},
          body: {},
          ...testCase.value,
        });
        userOrganizationRepository.find.mockResolvedValue([mockUserOrg]);
        permissionsService.checkPermission.mockResolvedValue(true);

        // When: Checking access
        const result = await guard.canActivate(mockContext);

        // Then: Should allow access and verify with correct organization ID
        expect(result).toBe(true);
        const expectedOrgId = testCase.value.params?.organizationId || 
                             testCase.value.query?.organizationId || 
                             testCase.value.query?.organization_id || 
                             testCase.value.body?.organizationId || 
                             testCase.value.body?.organization_id;
        expect(userOrganizationRepository.find).toHaveBeenCalledWith({
          where: {
            user_id: mockUser.sub,
            organization_id: expectedOrgId,
          },
          relations: ['team'],
        });
      }
    });
  });

  describe('Feature: Admin User Access', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(createPermissionMetadata('meeting' as ResourceType, 'read' as AccessLevel));
    });

    it('should grant access to admin users without permission checks', async () => {
      // Given: An admin user accessing a protected resource
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      userOrganizationRepository.find.mockResolvedValue([mockAdminUserOrg]);

      // When: Checking access to the protected endpoint
      const result = await guard.canActivate(mockContext);

      // Then: Access should be granted without checking specific permissions
      expect(result).toBe(true);
      expect(userOrganizationRepository.find).toHaveBeenCalledWith({
        where: {
          user_id: mockUser.sub,
          organization_id: mockOrganizationId,
        },
        relations: ['team'],
      });
      expect(permissionsService.checkPermission).not.toHaveBeenCalled();
    });
  });

  describe('Feature: Team-Based Permission Validation', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(createPermissionMetadata('meeting' as ResourceType, 'read' as AccessLevel));
    });

    it('should check permissions for non-admin users', async () => {
      // Given: A non-admin user accessing a protected resource
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      userOrganizationRepository.find.mockResolvedValue([mockUserOrg]);
      permissionsService.checkPermission.mockResolvedValue(true);

      // When: Checking access to the protected endpoint
      const result = await guard.canActivate(mockContext);

      // Then: Access should be granted after checking team permissions
      expect(result).toBe(true);
      expect(permissionsService.checkPermission).toHaveBeenCalledWith(
        mockTeamId,
        'meeting',
        null,
        'read',
      );
    });

    it('should grant access if any team has the required permission', async () => {
      // Given: A user with multiple teams, where one has permission
      const mockUserOrg2 = createMockUserOrganization(mockUser.sub, mockOrganizationId, 'team-456', false);
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      userOrganizationRepository.find.mockResolvedValue([mockUserOrg, mockUserOrg2]);
      permissionsService.checkPermission
        .mockResolvedValueOnce(false) // First team doesn't have permission
        .mockResolvedValueOnce(true);  // Second team has permission

      // When: Checking access to the protected endpoint
      const result = await guard.canActivate(mockContext);

      // Then: Access should be granted (any team with permission is sufficient)
      expect(result).toBe(true);
      expect(permissionsService.checkPermission).toHaveBeenCalledTimes(2);
    });

    it('should reject access when no team has the required permission', async () => {
      // Given: A user whose teams don't have the required permission
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      userOrganizationRepository.find.mockResolvedValue([mockUserOrg]);
      permissionsService.checkPermission.mockResolvedValue(false);

      // When: Checking access to the protected endpoint
      // Then: Should throw UnauthorizedException
      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'You do not have permission to perform this action',
      );
    });
  });

  describe('Feature: Resource ID Resolution', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
      userOrganizationRepository.find.mockResolvedValue([mockUserOrg]);
      permissionsService.checkPermission.mockResolvedValue(true);
    });

    it('should use custom getResourceId function when provided', async () => {
      // Given: A permission with a custom resource ID function
      const getResourceId = jest.fn().mockReturnValue('meeting-123');
      reflector.get.mockReturnValue(createPermissionMetadata('meeting_types' as ResourceType, 'read' as AccessLevel, getResourceId));
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));

      // When: Checking access to the protected endpoint
      const result = await guard.canActivate(mockContext);

      // Then: Should use the custom function and pass the resource ID to permission check
      expect(result).toBe(true);
      expect(getResourceId).toHaveBeenCalledWith(expect.any(Object));
      expect(permissionsService.checkPermission).toHaveBeenCalledWith(
        mockTeamId,
        'meeting_types',
        'meeting-123',
        'read',
      );
    });

    it('should use permissionsService.getResourceIdForPermission as fallback', async () => {
      // Given: A permission without custom resource ID function
      reflector.get.mockReturnValue(createPermissionMetadata('meeting_types' as ResourceType, 'read' as AccessLevel));
      permissionsService.getResourceIdForPermission.mockResolvedValue('meeting-456');
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));

      // When: Checking access to the protected endpoint
      const result = await guard.canActivate(mockContext);

      // Then: Should use the service fallback and pass the resource ID to permission check
      expect(result).toBe(true);
      expect(permissionsService.getResourceIdForPermission).toHaveBeenCalledWith(
        'meeting_types',
        expect.any(Object),
      );
      expect(permissionsService.checkPermission).toHaveBeenCalledWith(
        mockTeamId,
        'meeting_types',
        'meeting-456',
        'read',
      );
    });

    it('should handle specific resource types that require resource IDs', async () => {
      // Given: A permission for a specific resource type that requires resource ID
      reflector.get.mockReturnValue(createPermissionMetadata('meeting_types' as ResourceType, 'read' as AccessLevel));
      permissionsService.getResourceIdForPermission.mockResolvedValue('meeting-789');
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));

      // When: Checking access to the protected endpoint
      const result = await guard.canActivate(mockContext);

      // Then: Should pass the resource ID to permission check for specific resource types
      expect(result).toBe(true);
      expect(permissionsService.checkPermission).toHaveBeenCalledWith(
        mockTeamId,
        'meeting_types',
        'meeting-789',
        'read',
      );
    });
  });

  describe('Feature: Error Handling and Resilience', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(createPermissionMetadata('meeting' as ResourceType, 'read' as AccessLevel));
    });

    it('should handle database errors gracefully', async () => {
      // Given: A database error occurs during team lookup
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      userOrganizationRepository.find.mockRejectedValue(new Error('Database connection failed'));

      // When: Checking access to the protected endpoint
      // Then: Should re-throw the database error
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Database connection failed');
    });

    it('should handle permission service errors gracefully', async () => {
      // Given: A permission service error occurs during permission check
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      userOrganizationRepository.find.mockResolvedValue([mockUserOrg]);
      permissionsService.checkPermission.mockRejectedValue(new Error('Permission service unavailable'));

      // When: Checking access to the protected endpoint
      // Then: Should re-throw the permission service error
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Permission service unavailable');
    });
  });

  describe('Feature: Complete Permission Flow Scenarios', () => {
    it('should handle end-to-end flow for public endpoints', async () => {
      // Given: A complete request to a public endpoint
      const mockContext = createMockContext(createPublicRequest('/api/health'));
      reflector.getAllAndOverride.mockReturnValue(true);

      // When: Processing the complete permission flow
      const result = await guard.canActivate(mockContext);

      // Then: Should allow access without any permission checks
      expect(result).toBe(true);
      expect(userOrganizationRepository.find).not.toHaveBeenCalled();
    });

    it('should handle end-to-end flow for admin users', async () => {
      // Given: A complete request from an admin user
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(createPermissionMetadata('meeting' as ResourceType, 'write' as AccessLevel));
      userOrganizationRepository.find.mockResolvedValue([mockAdminUserOrg]);

      // When: Processing the complete permission flow
      const result = await guard.canActivate(mockContext);

      // Then: Should allow access without checking specific permissions
      expect(result).toBe(true);
      expect(permissionsService.checkPermission).not.toHaveBeenCalled();
    });

    it('should handle end-to-end flow for non-admin users with valid permissions', async () => {
      // Given: A complete request from a non-admin user with valid permissions
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(createPermissionMetadata('meeting' as ResourceType, 'read' as AccessLevel));
      userOrganizationRepository.find.mockResolvedValue([mockUserOrg]);
      permissionsService.checkPermission.mockResolvedValue(true);

      // When: Processing the complete permission flow
      const result = await guard.canActivate(mockContext);

      // Then: Should allow access after verifying team permissions
      expect(result).toBe(true);
      expect(permissionsService.checkPermission).toHaveBeenCalledWith(
        mockTeamId,
        'meeting',
        null,
        'read',
      );
    });

    it('should handle end-to-end flow for non-admin users without valid permissions', async () => {
      // Given: A complete request from a non-admin user without valid permissions
      const mockContext = createMockContext(createProtectedRequest(mockOrganizationId, mockUser));
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(createPermissionMetadata('meeting' as ResourceType, 'write' as AccessLevel));
      userOrganizationRepository.find.mockResolvedValue([mockUserOrg]);
      permissionsService.checkPermission.mockResolvedValue(false);

      // When: Processing the complete permission flow
      // Then: Should reject access due to insufficient permissions
      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });
  });
});
