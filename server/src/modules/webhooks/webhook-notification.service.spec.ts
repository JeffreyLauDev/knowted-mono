import axios from 'axios';
import * as crypto from 'crypto';
import { WebhookNotificationService } from './webhook-notification.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock crypto
jest.mock('crypto');
const mockedCrypto = crypto as jest.Mocked<typeof crypto>;

describe('WebhookNotificationService', () => {
  let service: WebhookNotificationService;
  let mockWebhookRepository: any;

  beforeEach(() => {
    // Create a simple mock repository
    mockWebhookRepository = {
      findOne: jest.fn(),
    };

    // Create service instance with mocked dependencies
    service = new WebhookNotificationService(mockWebhookRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMeetingCompletedWebhook', () => {
    it('should send webhook notification when active webhook exists', async () => {
      // Arrange
      const organizationId = 'org-123';
      const mockWebhook = {
        id: 'webhook-123',
        organization_id: organizationId,
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: 'whsec_test_secret',
        is_active: true,
      };
      
      const mockMeeting = {
        id: 'meeting-123',
        title: 'Test Meeting',
        summary: 'Meeting summary',
        email_summary: 'Email summary',
        duration_mins: 30,
        meeting_date: new Date('2024-01-15T10:00:00Z'),
        host_email: 'host@example.com',
        participants_email: ['participant@example.com'],
        video_url: 'https://example.com/video',
        transcript_url: 'https://example.com/transcript',
        chapters: 'Chapter 1: Introduction',
        thumbnail: 'https://example.com/thumbnail',
        meeting_url: 'https://example.com/meeting',
        bot_id: 'bot-123',
        analysed: true,
        meta_data: { key: 'value' },
        summary_meta_data: { key: 'value' },
        transcript_json: { data: [], type: 'array' },
        transcript: 'Meeting transcript',
        video_processing_status: 'completed',
        organization_id: organizationId,
        team_id: 'team-123',
        calendar_id: 'calendar-123',
        user_id: 'user-123',
        created_at: new Date('2024-01-15T09:00:00Z'),
        updated_at: new Date('2024-01-15T11:00:00Z'),
        organization: { id: organizationId },
      };

      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test-signature'),
      };
      mockedCrypto.createHmac.mockReturnValue(mockHmac as any);
      mockedAxios.post.mockResolvedValue({ status: 200 });

      mockWebhookRepository.findOne.mockResolvedValue(mockWebhook);

      // Act
      await service.sendMeetingCompletedWebhook(organizationId, mockMeeting as any, 'created');

      // Assert
      expect(mockWebhookRepository.findOne).toHaveBeenCalledWith({
        where: { 
          organization_id: organizationId,
          is_active: true,
        },
      });
      expect(mockedCrypto.createHmac).toHaveBeenCalledWith('sha256', 'whsec_test_secret');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.stringContaining('"event":"meeting.completed"'),
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': 'sha256=test-signature',
            'User-Agent': 'Knowted-Webhook/1.0',
          },
          timeout: 10000,
        }
      );
    });

    it('should not send webhook when no active webhook exists', async () => {
      // Arrange
      const organizationId = 'org-without-webhook';
      const mockMeeting = {
        id: 'meeting-123',
        title: 'Test Meeting',
      };

      mockWebhookRepository.findOne.mockResolvedValue(null);

      // Act
      await service.sendMeetingCompletedWebhook(organizationId, mockMeeting as any, 'created');

      // Assert
      expect(mockWebhookRepository.findOne).toHaveBeenCalledWith({
        where: { 
          organization_id: organizationId,
          is_active: true,
        },
      });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle webhook sending errors gracefully', async () => {
      // Arrange
      const organizationId = 'org-123';
      const mockWebhook = {
        id: 'webhook-123',
        organization_id: organizationId,
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: 'whsec_test_secret',
        is_active: true,
      };
      
      const mockMeeting = {
        id: 'meeting-123',
        title: 'Test Meeting',
      };

      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test-signature'),
      };
      mockedCrypto.createHmac.mockReturnValue(mockHmac as any);
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      mockWebhookRepository.findOne.mockResolvedValue(mockWebhook);

      // Act & Assert - should not throw error
      await expect(
        service.sendMeetingCompletedWebhook(organizationId, mockMeeting as any, 'created')
      ).resolves.not.toThrow();

      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should prepare correct webhook payload structure', async () => {
      // Arrange
      const organizationId = 'org-123';
      const mockWebhook = {
        id: 'webhook-123',
        organization_id: organizationId,
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: 'whsec_test_secret',
        is_active: true,
      };
      
      const mockMeeting = {
        id: 'meeting-123',
        title: 'Test Meeting',
        summary: 'Meeting summary',
        email_summary: 'Email summary',
        duration_mins: 30,
        meeting_date: new Date('2024-01-15T10:00:00Z'),
        host_email: 'host@example.com',
        participants_email: ['participant@example.com'],
        video_url: 'https://example.com/video',
        transcript_url: 'https://example.com/transcript',
        chapters: 'Chapter 1: Introduction',
        thumbnail: 'https://example.com/thumbnail',
        meeting_url: 'https://example.com/meeting',
        bot_id: 'bot-123',
        analysed: true,
        meta_data: { key: 'value' },
        summary_meta_data: { key: 'value' },
        transcript_json: { data: [], type: 'array' },
        transcript: 'Meeting transcript',
        video_processing_status: 'completed',
        organization_id: organizationId,
        team_id: 'team-123',
        calendar_id: 'calendar-123',
        user_id: 'user-123',
        created_at: new Date('2024-01-15T09:00:00Z'),
        updated_at: new Date('2024-01-15T11:00:00Z'),
        organization: { id: organizationId },
      };

      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test-signature'),
      };
      mockedCrypto.createHmac.mockReturnValue(mockHmac as any);
      mockedAxios.post.mockResolvedValue({ status: 200 });

      mockWebhookRepository.findOne.mockResolvedValue(mockWebhook);

      // Act
      await service.sendMeetingCompletedWebhook(organizationId, mockMeeting as any, 'updated');

      // Assert
      const expectedPayload = {
        event: 'meeting.completed',
        action: 'updated',
        timestamp: expect.any(String),
        data: {
          meeting: {
            id: 'meeting-123',
            title: 'Test Meeting',
            summary: 'Meeting summary',
            email_summary: 'Email summary',
            duration_mins: 30,
            meeting_date: new Date('2024-01-15T10:00:00Z'),
            host_email: 'host@example.com',
            participants_email: ['participant@example.com'],
            video_url: 'https://example.com/video',
            transcript_url: 'https://example.com/transcript',
            chapters: 'Chapter 1: Introduction',
            thumbnail: 'https://example.com/thumbnail',
            meeting_url: 'https://example.com/meeting',
            bot_id: 'bot-123',
            analysed: true,
            meta_data: { key: 'value' },
            summary_meta_data: { key: 'value' },
            transcript_json: { data: [], type: 'array' },
            transcript: 'Meeting transcript',
            video_processing_status: 'completed',
            organization_id: organizationId,
            team_id: 'team-123',
            calendar_id: 'calendar-123',
            user_id: 'user-123',
            created_at: new Date('2024-01-15T09:00:00Z'),
            updated_at: new Date('2024-01-15T11:00:00Z'),
          },
          organization: {
            id: organizationId,
          },
          user: {
            id: 'user-123',
          },
        },
      };

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.stringContaining('"event":"meeting.completed"'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': 'sha256=test-signature',
            'User-Agent': 'Knowted-Webhook/1.0',
          }),
          timeout: 10000,
        })
      );
    });
  });
});
