import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationsService } from '../../organizations/organizations.service';
import { ApiKey } from '../entities/api-key.entity';
import { ApiKeyAuthGuard } from './api-key-auth.guard';

describe('ApiKeyAuthGuard', () => {
  let guard: ApiKeyAuthGuard;
  let apiKeyRepository: Repository<ApiKey>;
  let configService: ConfigService;
  let organizationsService: OrganizationsService;

  const mockApiKeyRepository = {
    findOne: jest.fn(),
  };

  const mockOrganizationsService = {
    getUserOrganizationWithTeam: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyAuthGuard,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockApiKeyRepository,
        },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>({
            get: jest.fn().mockReturnValue(undefined),
          }),
        },
        {
          provide: OrganizationsService,
          useValue: mockOrganizationsService,
        },
      ],
    }).compile();

    guard = module.get<ApiKeyAuthGuard>(ApiKeyAuthGuard);
    apiKeyRepository = module.get<Repository<ApiKey>>(getRepositoryToken(ApiKey));
    configService = module.get(ConfigService);
    organizationsService = module.get(OrganizationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when valid API key is provided', async () => {
      // Arrange
      const apiKey = 'kn_live_valid_key';
      const mockApiKey = {
        id: 'apikey-123',
        organization_id: 'org-123',
        name: 'Test API Key',
        key: apiKey,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        organization: {
          id: 'org-123',
          name: 'Test Organization',
          owner_id: 'user-123',
        },
      };

      const mockRequest: any = {
        headers: { 'x-api-key': apiKey },
      };

      const mockContext: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { key: apiKey, is_active: true },
        relations: ['organization'],
      });
      expect(result).toBe(true);
      expect(mockRequest.organization).toEqual(mockApiKey.organization);
      expect(mockRequest.apiKey).toEqual(mockApiKey);
      expect(mockRequest.user).toEqual({ sub: 'user-123' });
    });

    it('should return false when API key is missing', async () => {
      // Arrange
      const mockRequest: any = {
        headers: {},
      };

      const mockContext: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
      expect(mockApiKeyRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return false when API key is invalid', async () => {
      // Arrange
      const invalidApiKey = 'kn_live_invalid_key';
      const mockRequest: any = {
        headers: { 'x-api-key': invalidApiKey },
      };

      const mockContext: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      mockApiKeyRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { key: invalidApiKey, is_active: true },
        relations: ['organization'],
      });
      expect(result).toBe(false);
    });

    it('should return false when API key is inactive', async () => {
      // Arrange
      const inactiveApiKey = 'kn_live_inactive_key';
      const mockRequest: any = {
        headers: { 'x-api-key': inactiveApiKey },
      };

      const mockContext: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      mockApiKeyRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });
  });
});
