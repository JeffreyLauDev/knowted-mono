import { createMock } from '@golevelup/ts-jest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PinoLoggerService } from '../../common/logger/pino-logger.service';
import { CreateMeetingShareDto } from './dto/create-meeting-share.dto';
import { UpdateMeetingShareDto } from './dto/update-meeting-share.dto';
import { MeetingShares } from './entities/meeting-shares.entity';
import { MeetingSharesService } from './meeting-shares.service';

describe('MeetingSharesService', () => {
  let service: MeetingSharesService;
  let repository: jest.Mocked<Repository<MeetingShares>>;
  let logger: jest.Mocked<PinoLoggerService>;

  const mockMeetingShare = createMock<MeetingShares>({
    id: 'share-123',
    meeting_id: 'meeting-123',
    share_token: 'abc123def456',
    created_by: 'user-123',
    expires_at: null,
    is_enabled: true,
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
  });

  const mockCreateDto: CreateMeetingShareDto = {
    meeting_id: 'meeting-123',
    expires_at: '2024-12-31T23:59:59Z',
  };

  const mockUpdateDto: UpdateMeetingShareDto = {
    is_enabled: false,
    expires_at: '2024-06-30T23:59:59Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingSharesService,
        {
          provide: getRepositoryToken(MeetingShares),
          useValue: createMock<Repository<MeetingShares>>(),
        },
        {
          provide: PinoLoggerService,
          useValue: createMock<PinoLoggerService>(),
        },
      ],
    }).compile();

    service = module.get<MeetingSharesService>(MeetingSharesService);
    repository = module.get(getRepositoryToken(MeetingShares));
    logger = module.get(PinoLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createShareLink', () => {
    it('should create a new share link successfully', async () => {
      // Arrange
      repository.findOne.mockResolvedValueOnce(null); // No existing share
      repository.findOne.mockResolvedValueOnce(null); // Token is unique
      repository.create.mockReturnValue(mockMeetingShare);
      repository.save.mockResolvedValue(mockMeetingShare);

      // Act
      const result = await service.createShareLink(mockCreateDto, 'user-123');

      // Assert
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { meeting_id: 'meeting-123' },
      });
      expect(repository.create).toHaveBeenCalledWith({
        meeting_id: 'meeting-123',
        share_token: expect.any(String),
        created_by: 'user-123',
        expires_at: new Date('2024-12-31T23:59:59Z'),
        is_enabled: true,
      });
      expect(repository.save).toHaveBeenCalledWith(mockMeetingShare);
      expect(result).toEqual({
        id: 'share-123',
        meeting_id: 'meeting-123',
        share_token: 'abc123def456',
        created_by: 'user-123',
        expires_at: null,
        is_enabled: true,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T10:00:00Z'),
      });
    });

    it('should create share link without expiration date', async () => {
      // Arrange
      const dtoWithoutExpiration = { meeting_id: 'meeting-123' };
      repository.findOne.mockResolvedValueOnce(null); // No existing share
      repository.findOne.mockResolvedValueOnce(null); // Token is unique
      repository.create.mockReturnValue(mockMeetingShare);
      repository.save.mockResolvedValue(mockMeetingShare);

      // Act
      const result = await service.createShareLink(dtoWithoutExpiration, 'user-123');

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        meeting_id: 'meeting-123',
        share_token: expect.any(String),
        created_by: 'user-123',
        expires_at: null,
        is_enabled: true,
      });
      expect(result).toBeDefined();
    });

    it('should throw ConflictException when share link already exists', async () => {
      // Arrange
      repository.findOne.mockResolvedValueOnce(mockMeetingShare); // Existing share found

      // Act & Assert
      await expect(
        service.createShareLink(mockCreateDto, 'user-123')
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should generate unique tokens when collision occurs', async () => {
      // Arrange
      repository.findOne.mockResolvedValueOnce(null); // No existing share
      repository.findOne
        .mockResolvedValueOnce(mockMeetingShare) // First token collision
        .mockResolvedValueOnce(null); // Second token is unique
      repository.create.mockReturnValue(mockMeetingShare);
      repository.save.mockResolvedValue(mockMeetingShare);

      // Act
      const result = await service.createShareLink(mockCreateDto, 'user-123');

      // Assert
      expect(repository.findOne).toHaveBeenCalledTimes(3); // 1 for existing share + 2 for token uniqueness
      expect(repository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle database errors during creation', async () => {
      // Arrange
      repository.findOne.mockResolvedValueOnce(null); // No existing share
      repository.findOne.mockResolvedValueOnce(null); // Token is unique
      repository.create.mockReturnValue(mockMeetingShare);
      repository.save.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        service.createShareLink(mockCreateDto, 'user-123')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getShareLink', () => {
    it('should return share link when found', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(mockMeetingShare);

      // Act
      const result = await service.getShareLink('meeting-123');

      // Assert
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { meeting_id: 'meeting-123' },
      });
      expect(result).toEqual({
        id: 'share-123',
        meeting_id: 'meeting-123',
        share_token: 'abc123def456',
        created_by: 'user-123',
        expires_at: null,
        is_enabled: true,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T10:00:00Z'),
      });
    });

    it('should return null when share link not found', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getShareLink('meeting-123');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      repository.findOne.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.getShareLink('meeting-123')).rejects.toThrow('Database error');
    });
  });

  describe('updateShareLink', () => {
    it('should update share link successfully', async () => {
      // Arrange
      const updatedShare = { ...mockMeetingShare, is_enabled: false };
      repository.findOne.mockResolvedValue(mockMeetingShare);
      repository.save.mockResolvedValue(updatedShare);

      // Act
      const result = await service.updateShareLink('meeting-123', mockUpdateDto);

      // Assert
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { meeting_id: 'meeting-123' },
      });
      expect(repository.save).toHaveBeenCalledWith({
        ...mockMeetingShare,
        is_enabled: false,
        expires_at: new Date('2024-06-30T23:59:59Z'),
      });
      expect(result).toEqual(updatedShare);
    });

    it('should throw NotFoundException when share link not found', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateShareLink('meeting-123', mockUpdateDto)
      ).rejects.toThrow(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      // Arrange
      const partialUpdateDto = { is_enabled: false };
      const updatedShare = { ...mockMeetingShare, is_enabled: false };
      repository.findOne.mockResolvedValue(mockMeetingShare);
      repository.save.mockResolvedValue(updatedShare);

      // Act
      const result = await service.updateShareLink('meeting-123', partialUpdateDto);

      // Assert
      expect(repository.save).toHaveBeenCalledWith({
        ...mockMeetingShare,
        is_enabled: false,
      });
      expect(result).toEqual(updatedShare);
    });
  });

  describe('deleteShareLink', () => {
    it('should delete share link successfully', async () => {
      // Arrange
      repository.delete.mockResolvedValue({ affected: 1, raw: [] });

      // Act
      await service.deleteShareLink('meeting-123');

      // Assert
      expect(repository.delete).toHaveBeenCalledWith({
        meeting_id: 'meeting-123',
      });
    });

    it('should throw NotFoundException when share link not found', async () => {
      // Arrange
      repository.delete.mockResolvedValue({ affected: 0, raw: [] });

      // Act & Assert
      await expect(service.deleteShareLink('meeting-123')).rejects.toThrow(NotFoundException);
    });

    it('should handle database errors during deletion', async () => {
      // Arrange
      repository.delete.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.deleteShareLink('meeting-123')).rejects.toThrow('Database error');
    });
  });

  describe('validateShareToken', () => {
    it('should return true for valid, non-expired share token', async () => {
      // Arrange
      const validShare = {
        ...mockMeetingShare,
        is_enabled: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };
      repository.query
        .mockResolvedValueOnce([{ count: '1' }]) // Meeting exists
        .mockResolvedValueOnce([{ count: '1' }]) // Meeting shares exist
        .mockResolvedValueOnce([{ count: '1' }]); // Token exists
      repository.findOne.mockResolvedValue(validShare);

      // Act
      const result = await service.validateShareToken('meeting-123', 'abc123def456');

      // Assert
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { 
          meeting_id: 'meeting-123', 
          share_token: 'abc123def456',
          is_enabled: true,
        },
      });
      expect(result).toBe(true);
    });

    it('should return true for valid share token without expiration', async () => {
      // Arrange
      const validShare = {
        ...mockMeetingShare,
        is_enabled: true,
        expires_at: null,
      };
      repository.query
        .mockResolvedValueOnce([{ count: '1' }]) // Meeting exists
        .mockResolvedValueOnce([{ count: '1' }]) // Meeting shares exist
        .mockResolvedValueOnce([{ count: '1' }]); // Token exists
      repository.findOne.mockResolvedValue(validShare);

      // Act
      const result = await service.validateShareToken('meeting-123', 'abc123def456');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-existent share token', async () => {
      // Arrange
      repository.query
        .mockResolvedValueOnce([{ count: '1' }]) // Meeting exists
        .mockResolvedValueOnce([{ count: '1' }]) // Meeting shares exist
        .mockResolvedValueOnce([{ count: '0' }]); // Token doesn't exist
      repository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateShareToken('meeting-123', 'invalid-token');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for disabled share link', async () => {
      // Arrange
      repository.query
        .mockResolvedValueOnce([{ count: '1' }]) // Meeting exists
        .mockResolvedValueOnce([{ count: '1' }]) // Meeting shares exist
        .mockResolvedValueOnce([{ count: '1' }]); // Token exists
      repository.findOne.mockResolvedValue(null); // No enabled share found

      // Act
      const result = await service.validateShareToken('meeting-123', 'abc123def456');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for expired share token', async () => {
      // Arrange
      const expiredShare = {
        ...mockMeetingShare,
        is_enabled: true,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      };
      repository.query
        .mockResolvedValueOnce([{ count: '1' }]) // Meeting exists
        .mockResolvedValueOnce([{ count: '1' }]) // Meeting shares exist
        .mockResolvedValueOnce([{ count: '1' }]); // Token exists
      repository.findOne.mockResolvedValue(expiredShare);

      // Act
      const result = await service.validateShareToken('meeting-123', 'abc123def456');

      // Assert
      expect(result).toBe(false);
    });

    it('should handle database errors during validation', async () => {
      // Arrange
      repository.query.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        service.validateShareToken('meeting-123', 'abc123def456')
      ).rejects.toThrow('Database error');
    });
  });

  describe('generateShareToken', () => {
    it('should generate a 32-character hex string', () => {
      // Act
      const token1 = (service as any).generateShareToken();
      const token2 = (service as any).generateShareToken();

      // Assert
      expect(token1).toHaveLength(32);
      expect(token2).toHaveLength(32);
      expect(token1).toMatch(/^[a-f0-9]+$/);
      expect(token2).toMatch(/^[a-f0-9]+$/);
      expect(token1).not.toBe(token2); // Should be different tokens
    });

    it('should generate unique tokens consistently', () => {
      // Arrange
      const tokens = new Set();
      const iterations = 100;

      // Act
      for (let i = 0; i < iterations; i++) {
        const token = (service as any).generateShareToken();
        tokens.add(token);
      }

      // Assert
      expect(tokens.size).toBe(iterations); // All tokens should be unique
    });
  });

  describe('Business Logic Edge Cases', () => {
    it('should handle concurrent share link creation attempts', async () => {
      // Arrange
      repository.findOne
        .mockResolvedValueOnce(null) // No existing share
        .mockResolvedValueOnce(null) // Token is unique
        .mockResolvedValueOnce(mockMeetingShare); // Simulate race condition
      repository.create.mockReturnValue(mockMeetingShare);
      repository.save.mockResolvedValue(mockMeetingShare);

      // Act
      const result = await service.createShareLink(mockCreateDto, 'user-123');

      // Assert
      expect(result).toBeDefined();
      // Should handle the race condition gracefully
    });

    it('should handle malformed expiration dates gracefully', async () => {
      // Arrange
      const dtoWithInvalidDate = {
        meeting_id: 'meeting-123',
        expires_at: 'invalid-date',
      };
      repository.findOne.mockResolvedValueOnce(null);
      repository.findOne.mockResolvedValueOnce(null);
      repository.create.mockReturnValue(mockMeetingShare);
      repository.save.mockResolvedValue(mockMeetingShare);

      // Act
      const result = await service.createShareLink(dtoWithInvalidDate, 'user-123');

      // Assert
      expect(result).toBeDefined();
      // Should handle invalid dates by creating with null expiration
    });

    it('should handle very long meeting IDs', async () => {
      // Arrange
      const longMeetingId = 'a'.repeat(1000);
      const dtoWithLongId = { meeting_id: longMeetingId };
      repository.findOne.mockResolvedValueOnce(null);
      repository.findOne.mockResolvedValueOnce(null);
      repository.create.mockReturnValue(mockMeetingShare);
      repository.save.mockResolvedValue(mockMeetingShare);

      // Act
      const result = await service.createShareLink(dtoWithLongId, 'user-123');

      // Assert
      expect(result).toBeDefined();
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { meeting_id: longMeetingId },
      });
    });
  });
});
