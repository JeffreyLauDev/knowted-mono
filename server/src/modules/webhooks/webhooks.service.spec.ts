import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organizations } from '../organizations/entities/organizations.entity';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { Webhook } from './entities/webhook.entity';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let webhookRepository: Repository<Webhook>;
  let organizationRepository: Repository<Organizations>;

  const mockWebhookRepository = {
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
        WebhooksService,
        {
          provide: getRepositoryToken(Webhook),
          useValue: mockWebhookRepository,
        },
        {
          provide: getRepositoryToken(Organizations),
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    webhookRepository = module.get<Repository<Webhook>>(getRepositoryToken(Webhook));
    organizationRepository = module.get<Repository<Organizations>>(getRepositoryToken(Organizations));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a webhook with generated secret', async () => {
      // Arrange
      const organizationId = 'org-123';
      const createWebhookDto: CreateWebhookDto = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        is_active: true,
      };
      const mockWebhook = {
        id: 'webhook-123',
        organization_id: organizationId,
        ...createWebhookDto,
        secret: 'whsec_generated_secret',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockWebhookRepository.create.mockReturnValue(mockWebhook);
      mockWebhookRepository.save.mockResolvedValue(mockWebhook);

      // Act
      const result = await service.create(organizationId, createWebhookDto);

      // Assert
      expect(mockWebhookRepository.create).toHaveBeenCalledWith({
        organization_id: organizationId,
        ...createWebhookDto,
        secret: expect.stringMatching(/^whsec_[a-zA-Z0-9]+$/),
      });
      expect(mockWebhookRepository.save).toHaveBeenCalledWith(mockWebhook);
      expect(result).toEqual(mockWebhook);
    });
  });

  describe('findByOrganization', () => {
    it('should return webhook when found for organization', async () => {
      // Arrange
      const organizationId = 'org-123';
      const mockWebhook = {
        id: 'webhook-123',
        organization_id: organizationId,
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: 'whsec_secret',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockWebhookRepository.findOne.mockResolvedValue(mockWebhook);

      // Act
      const result = await service.findByOrganization(organizationId);

      // Assert
      expect(mockWebhookRepository.findOne).toHaveBeenCalledWith({
        where: { organization_id: organizationId },
      });
      expect(result).toEqual(mockWebhook);
    });

    it('should return null when no webhook found for organization', async () => {
      // Arrange
      const organizationId = 'org-without-webhook';

      mockWebhookRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByOrganization(organizationId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update webhook when it exists', async () => {
      // Arrange
      const webhookId = 'webhook-123';
      const updateWebhookDto: UpdateWebhookDto = {
        name: 'Updated Webhook',
        is_active: false,
      };
      const existingWebhook = {
        id: webhookId,
        organization_id: 'org-123',
        name: 'Original Webhook',
        url: 'https://example.com/webhook',
        secret: 'whsec_secret',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const updatedWebhook = {
        ...existingWebhook,
        ...updateWebhookDto,
        updated_at: new Date(),
      };

      mockWebhookRepository.findOne.mockResolvedValue(existingWebhook);
      mockWebhookRepository.update.mockResolvedValue({ affected: 1 });
      mockWebhookRepository.findOne.mockResolvedValueOnce(existingWebhook).mockResolvedValueOnce(updatedWebhook);

      // Act
      const result = await service.update(webhookId, updateWebhookDto);

      // Assert
      expect(mockWebhookRepository.findOne).toHaveBeenCalledWith({
        where: { id: webhookId },
      });
      expect(mockWebhookRepository.update).toHaveBeenCalledWith(webhookId, updateWebhookDto);
      expect(result).toEqual(updatedWebhook);
    });

    it('should throw NotFoundException when webhook does not exist', async () => {
      // Arrange
      const webhookId = 'non-existent-webhook';
      const updateWebhookDto: UpdateWebhookDto = { name: 'Updated Name' };

      mockWebhookRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(webhookId, updateWebhookDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockWebhookRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('toggleActive', () => {
    it('should toggle webhook active status when webhook exists', async () => {
      // Arrange
      const webhookId = 'webhook-123';
      const existingWebhook = {
        id: webhookId,
        organization_id: 'org-123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: 'whsec_secret',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const toggledWebhook = {
        ...existingWebhook,
        is_active: false,
        updated_at: new Date(),
      };

      mockWebhookRepository.findOne.mockResolvedValue(existingWebhook);
      mockWebhookRepository.save.mockResolvedValue(toggledWebhook);

      // Act
      const result = await service.toggleActive(webhookId);

      // Assert
      expect(mockWebhookRepository.findOne).toHaveBeenCalledWith({
        where: { id: webhookId },
      });
      expect(mockWebhookRepository.save).toHaveBeenCalledWith({
        ...existingWebhook,
        is_active: false,
      });
      expect(result).toEqual(toggledWebhook);
    });

    it('should throw NotFoundException when webhook does not exist', async () => {
      // Arrange
      const webhookId = 'non-existent-webhook';

      mockWebhookRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.toggleActive(webhookId)).rejects.toThrow(NotFoundException);
      expect(mockWebhookRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete webhook when it exists', async () => {
      // Arrange
      const webhookId = 'webhook-123';
      const existingWebhook = {
        id: webhookId,
        organization_id: 'org-123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: 'whsec_secret',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockWebhookRepository.findOne.mockResolvedValue(existingWebhook);
      mockWebhookRepository.delete.mockResolvedValue({ affected: 1 });

      // Act
      await service.delete(webhookId);

      // Assert
      expect(mockWebhookRepository.findOne).toHaveBeenCalledWith({
        where: { id: webhookId },
      });
      expect(mockWebhookRepository.delete).toHaveBeenCalledWith(webhookId);
    });

    it('should throw NotFoundException when webhook does not exist', async () => {
      // Arrange
      const webhookId = 'non-existent-webhook';

      mockWebhookRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete(webhookId)).rejects.toThrow(NotFoundException);
      expect(mockWebhookRepository.delete).not.toHaveBeenCalled();
    });
  });
});
