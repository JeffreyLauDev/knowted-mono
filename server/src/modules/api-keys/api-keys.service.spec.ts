import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organizations } from '../organizations/entities/organizations.entity';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-key.dto';
import { ApiKey } from './entities/api-key.entity';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let apiKeyRepository: Repository<ApiKey>;
  let organizationRepository: Repository<Organizations>;

  const mockApiKeyRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  const mockOrganizationRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockApiKeyRepository,
        },
        {
          provide: getRepositoryToken(Organizations),
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
    apiKeyRepository = module.get<Repository<ApiKey>>(getRepositoryToken(ApiKey));
    organizationRepository = module.get<Repository<Organizations>>(getRepositoryToken(Organizations));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an API key with generated key', async () => {
      // Arrange
      const organizationId = 'org-123';
      const createApiKeyDto: CreateApiKeyDto = {
        name: 'Test API Key',
        is_active: true,
      };
      const mockApiKey = {
        id: 'apikey-123',
        organization_id: organizationId,
        ...createApiKeyDto,
        key: 'kn_live_generated_key',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockApiKeyRepository.create.mockReturnValue(mockApiKey);
      mockApiKeyRepository.save.mockResolvedValue(mockApiKey);

      // Act
      const result = await service.create(organizationId, createApiKeyDto);

      // Assert
      expect(mockApiKeyRepository.create).toHaveBeenCalledWith({
        organization_id: organizationId,
        ...createApiKeyDto,
        key: expect.stringMatching(/^kn_live_[a-zA-Z0-9]+$/),
      });
      expect(mockApiKeyRepository.save).toHaveBeenCalledWith(mockApiKey);
      expect(result).toEqual(mockApiKey);
    });
  });

  describe('findByOrganization', () => {
    it('should return all API keys for organization', async () => {
      // Arrange
      const organizationId = 'org-123';
      const mockApiKeys = [
        {
          id: 'apikey-1',
          organization_id: organizationId,
          name: 'API Key 1',
          key: 'kn_live_key1',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'apikey-2',
          organization_id: organizationId,
          name: 'API Key 2',
          key: 'kn_live_key2',
          is_active: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockApiKeyRepository.find.mockResolvedValue(mockApiKeys);

      // Act
      const result = await service.findByOrganization(organizationId);

      // Assert
      expect(mockApiKeyRepository.find).toHaveBeenCalledWith({
        where: { organization_id: organizationId },
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(mockApiKeys);
    });

    it('should return empty array when no API keys found for organization', async () => {
      // Arrange
      const organizationId = 'org-without-keys';

      mockApiKeyRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findByOrganization(organizationId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return API key when found by ID', async () => {
      // Arrange
      const apiKeyId = 'apikey-123';
      const mockApiKey = {
        id: apiKeyId,
        organization_id: 'org-123',
        name: 'Test API Key',
        key: 'kn_live_key',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey);

      // Act
      const result = await service.findOne(apiKeyId);

      // Assert
      expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId },
      });
      expect(result).toEqual(mockApiKey);
    });

    it('should throw NotFoundException when API key does not exist', async () => {
      // Arrange
      const apiKeyId = 'non-existent-apikey';

      mockApiKeyRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(apiKeyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update API key when it exists', async () => {
      // Arrange
      const apiKeyId = 'apikey-123';
      const updateApiKeyDto: UpdateApiKeyDto = {
        name: 'Updated API Key',
        is_active: false,
      };
      const existingApiKey = {
        id: apiKeyId,
        organization_id: 'org-123',
        name: 'Original API Key',
        key: 'kn_live_key',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const updatedApiKey = {
        ...existingApiKey,
        ...updateApiKeyDto,
        updated_at: new Date(),
      };

      mockApiKeyRepository.findOne.mockResolvedValue(existingApiKey);
      mockApiKeyRepository.update.mockResolvedValue({ affected: 1 });
      mockApiKeyRepository.findOne.mockResolvedValueOnce(existingApiKey).mockResolvedValueOnce(updatedApiKey);

      // Act
      const result = await service.update(apiKeyId, updateApiKeyDto);

      // Assert
      expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId },
      });
      expect(mockApiKeyRepository.update).toHaveBeenCalledWith(apiKeyId, updateApiKeyDto);
      expect(result).toEqual(updatedApiKey);
    });

    it('should throw NotFoundException when API key does not exist', async () => {
      // Arrange
      const apiKeyId = 'non-existent-apikey';
      const updateApiKeyDto: UpdateApiKeyDto = { name: 'Updated Name' };

      mockApiKeyRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(apiKeyId, updateApiKeyDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockApiKeyRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('toggleActive', () => {
    it('should toggle API key active status when API key exists', async () => {
      // Arrange
      const apiKeyId = 'apikey-123';
      const existingApiKey = {
        id: apiKeyId,
        organization_id: 'org-123',
        name: 'Test API Key',
        key: 'kn_live_key',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const toggledApiKey = {
        ...existingApiKey,
        is_active: false,
        updated_at: new Date(),
      };

      mockApiKeyRepository.findOne.mockResolvedValue(existingApiKey);
      mockApiKeyRepository.save.mockResolvedValue(toggledApiKey);

      // Act
      const result = await service.toggleActive(apiKeyId);

      // Assert
      expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId },
      });
      expect(mockApiKeyRepository.save).toHaveBeenCalledWith({
        ...existingApiKey,
        is_active: false,
      });
      expect(result).toEqual(toggledApiKey);
    });

    it('should throw NotFoundException when API key does not exist', async () => {
      // Arrange
      const apiKeyId = 'non-existent-apikey';

      mockApiKeyRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.toggleActive(apiKeyId)).rejects.toThrow(NotFoundException);
      expect(mockApiKeyRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete API key when it exists', async () => {
      // Arrange
      const apiKeyId = 'apikey-123';
      const existingApiKey = {
        id: apiKeyId,
        organization_id: 'org-123',
        name: 'Test API Key',
        key: 'kn_live_key',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockApiKeyRepository.findOne.mockResolvedValue(existingApiKey);
      mockApiKeyRepository.delete.mockResolvedValue({ affected: 1 });

      // Act
      await service.delete(apiKeyId);

      // Assert
      expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId },
      });
      expect(mockApiKeyRepository.delete).toHaveBeenCalledWith(apiKeyId);
    });

    it('should throw NotFoundException when API key does not exist', async () => {
      // Arrange
      const apiKeyId = 'non-existent-apikey';

      mockApiKeyRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete(apiKeyId)).rejects.toThrow(NotFoundException);
      expect(mockApiKeyRepository.delete).not.toHaveBeenCalled();
    });
  });
});
