import { createMock } from '@golevelup/ts-jest';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { SlackNotificationService } from '../../services/slack-notification.service';
import { EmailService } from './email.service';
import { EmailTemplates, MeetingData } from './templates/email-templates';
import { SecurityTemplates } from './templates/security-templates';

// Mock Mailgun
jest.mock('mailgun.js', () => {
  return jest.fn().mockImplementation(() => ({
    client: jest.fn().mockReturnValue({
      messages: {
        create: jest.fn(),
      },
    }),
  }));
});

// Mock email templates
jest.mock('./templates/email-templates', () => ({
  EmailTemplates: {
    organizationInvitation: jest.fn(),
    testEmail: jest.fn(),
    meetingAnalysis: jest.fn(),
  },
}));

jest.mock('./templates/security-templates', () => ({
  SecurityTemplates: {
    suspiciousActivity: jest.fn(),
    systemIssue: jest.fn(),
  },
}));

// Mock SlackNotificationService
jest.mock('../../services/slack-notification.service', () => ({
  SlackNotificationService: jest.fn().mockImplementation(() => ({
    notifySystemIssue: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('EmailService - Feature: Email Delivery and Management', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;
  let slackNotificationService: jest.Mocked<SlackNotificationService>;
  let mockMailgunClient: any;

  // Test data builders for different email scenarios
  const createValidConfig = () => ({
    MAILGUN_API_KEY: 'test-api-key',
    MAILGUN_DOMAIN: 'test.mailgun.org',
    FRONTEND_URL: 'https://app.knowted.io',
    ADMIN_EMAIL: 'admin@knowted.io',
  });

  const createInvalidConfig = () => ({
    MAILGUN_API_KEY: undefined,
    MAILGUN_DOMAIN: undefined,
  });

  const createMeetingData = (overrides: Partial<MeetingData> = {}): MeetingData => ({
    title: 'Weekly Team Sync',
    summary: 'Discussed project progress and next steps',
    duration_mins: 30,
    meeting_date: new Date('2024-01-15T10:00:00Z'),
    host_email: 'host@example.com',
    participants_email: ['participant1@example.com', 'participant2@example.com'],
    owner_email: 'owner@example.com',
    video_url: 'https://example.com/video',
    transcript_url: 'https://example.com/transcript',
    chapters: 'Chapter 1: Introduction',
    shareUrl: 'https://app.knowted.io/meeting/123',
    meetingId: 'meeting-123',
    ...overrides,
  });

  const createSecurityIncident = (overrides = {}) => ({
    type: 'Suspicious Login Attempt',
    severity: 'high' as const,
    details: 'Multiple failed login attempts detected',
    affectedUsers: ['user@example.com'],
    ip: '192.168.1.100',
    userEmail: 'user@example.com',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
        {
          provide: SlackNotificationService,
          useValue: createMock<SlackNotificationService>(),
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
    slackNotificationService = module.get(SlackNotificationService);

    // Mock the mailgun client
    mockMailgunClient = {
      messages: {
        create: jest.fn(),
      },
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Feature: Service Initialization and Configuration', () => {
    it('should initialize successfully with valid configuration', () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        const config = createValidConfig();
        return config[key as keyof typeof config];
      });

      // Act
      const newService = new EmailService(configService, slackNotificationService);

      // Assert
      expect(newService).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('MAILGUN_API_KEY');
      expect(configService.get).toHaveBeenCalledWith('MAILGUN_DOMAIN');
    });

    it('should handle missing configuration gracefully', () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        const config = createInvalidConfig();
        return config[key as keyof typeof config];
      });

      // Act
      const newService = new EmailService(configService, slackNotificationService);

      // Assert
      expect(newService).toBeDefined();
      // Service should still be created but email functionality will be disabled
    });
  });

  describe('Feature: Basic Email Sending', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        const config = createValidConfig();
        return config[key as keyof typeof config];
      });

      // Mock the mailgun instance
      (service as any).mailgun = {
        client: jest.fn().mockReturnValue(mockMailgunClient),
      };
      (service as any).domain = 'test.mailgun.org';
    });

    it('should send email successfully on first attempt', async () => {
      // Arrange
      const to = 'test@example.com';
      const subject = 'Test Subject';
      const html = '<p>Test content</p>';
      mockMailgunClient.messages.create.mockResolvedValue({ id: 'msg-123' });

      // Act
      await service.sendEmail(to, subject, html);

      // Assert
      expect(mockMailgunClient.messages.create).toHaveBeenCalledWith('test.mailgun.org', {
        from: 'Knowted <noreply@knowted.io>',
        to: [to],
        subject,
        html,
      });
      expect(mockMailgunClient.messages.create).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      // Arrange
      const to = 'test@example.com';
      const subject = 'Test Subject';
      const html = '<p>Test content</p>';
      const error = new Error('Network error') as any;
      error.status = 500;
      
      mockMailgunClient.messages.create
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ id: 'msg-123' });

      // Act
      await service.sendEmail(to, subject, html);

      // Assert
      expect(mockMailgunClient.messages.create).toHaveBeenCalledTimes(2);
    });

    it('should fail after maximum retry attempts', async () => {
      // Arrange
      const to = 'test@example.com';
      const subject = 'Test Subject';
      const html = '<p>Test content</p>';
      const error = new Error('Persistent error') as any;
      error.status = 500;
      
      mockMailgunClient.messages.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.sendEmail(to, subject, html)).rejects.toThrow('Persistent error');
      expect(mockMailgunClient.messages.create).toHaveBeenCalledTimes(3);
    });

    it('should not retry on client errors (4xx)', async () => {
      // Arrange
      const to = 'test@example.com';
      const subject = 'Test Subject';
      const html = '<p>Test content</p>';
      const error = new Error('Bad request') as any;
      error.status = 400;
      
      mockMailgunClient.messages.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.sendEmail(to, subject, html)).rejects.toThrow('Bad request');
      expect(mockMailgunClient.messages.create).toHaveBeenCalledTimes(1);
    });

    it('should skip sending when mailgun is not configured', async () => {
      // Arrange
      (service as any).mailgun = undefined;
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act
      await service.sendEmail('test@example.com', 'Test', '<p>Test</p>');

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Email service not available. Skipping email to test@example.com: Test'
      );
    });
  });

  describe('Feature: Organization Invitation Emails', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        const config = createValidConfig();
        return config[key as keyof typeof config];
      });

      (service as any).mailgun = {
        client: jest.fn().mockReturnValue(mockMailgunClient),
      };
      (service as any).domain = 'test.mailgun.org';

      (EmailTemplates.organizationInvitation as jest.Mock).mockReturnValue('<html>Invitation template</html>');
    });

    it('should send organization invitation email successfully', async () => {
      // Arrange
      const to = 'newuser@example.com';
      const firstName = 'John';
      const organizationName = 'Acme Corp';
      const inviteId = 'invite-123';
      const teamName = 'Engineering';
      
      mockMailgunClient.messages.create.mockResolvedValue({ id: 'msg-123' });

      // Act
      await service.sendOrganizationInvitation(to, firstName, organizationName, inviteId, teamName);

      // Assert
      expect(EmailTemplates.organizationInvitation).toHaveBeenCalledWith(
        firstName,
        organizationName,
        inviteId,
        teamName,
        'https://app.knowted.io'
      );
      expect(mockMailgunClient.messages.create).toHaveBeenCalledWith('test.mailgun.org', {
        from: 'Knowted <noreply@knowted.io>',
        to: [to],
        subject: `You've been invited to join ${organizationName} on Knowted`,
        html: '<html>Invitation template</html>',
      });
    });

    it('should send invitation without team name', async () => {
      // Arrange
      const to = 'newuser@example.com';
      const firstName = 'Jane';
      const organizationName = 'Beta Corp';
      const inviteId = 'invite-456';
      
      mockMailgunClient.messages.create.mockResolvedValue({ id: 'msg-456' });

      // Act
      await service.sendOrganizationInvitation(to, firstName, organizationName, inviteId);

      // Assert
      expect(EmailTemplates.organizationInvitation).toHaveBeenCalledWith(
        firstName,
        organizationName,
        inviteId,
        undefined,
        'https://app.knowted.io'
      );
    });

    it('should throw error when email sending fails', async () => {
      // Arrange
      const to = 'newuser@example.com';
      const firstName = 'John';
      const organizationName = 'Acme Corp';
      const inviteId = 'invite-123';
      const error = new Error('Email service unavailable');
      
      mockMailgunClient.messages.create.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.sendOrganizationInvitation(to, firstName, organizationName, inviteId)
      ).rejects.toThrow('Failed to send invitation email: Email service unavailable');
    });
  });

  describe('Feature: Test Email Functionality', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        const config = createValidConfig();
        return config[key as keyof typeof config];
      });

      (service as any).mailgun = {
        client: jest.fn().mockReturnValue(mockMailgunClient),
      };
      (service as any).domain = 'test.mailgun.org';

      (EmailTemplates.testEmail as jest.Mock).mockReturnValue('<html>Test email template</html>');
    });

    it('should send test email successfully', async () => {
      // Arrange
      const to = 'admin@example.com';
      mockMailgunClient.messages.create.mockResolvedValue({ id: 'msg-test' });

      // Act
      await service.sendTestEmail(to);

      // Assert
      expect(EmailTemplates.testEmail).toHaveBeenCalled();
      expect(mockMailgunClient.messages.create).toHaveBeenCalledWith('test.mailgun.org', {
        from: 'Knowted <noreply@knowted.io>',
        to: [to],
        subject: 'Test Email from Knowted',
        html: '<html>Test email template</html>',
      });
    });

    it('should propagate errors from sendEmail', async () => {
      // Arrange
      const to = 'admin@example.com';
      const error = new Error('Test email failed');
      mockMailgunClient.messages.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.sendTestEmail(to)).rejects.toThrow('Test email failed');
    });
  });

  describe('Feature: Meeting Analysis Email Distribution', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        const config = createValidConfig();
        return config[key as keyof typeof config];
      });

      (service as any).mailgun = {
        client: jest.fn().mockReturnValue(mockMailgunClient),
      };
      (service as any).domain = 'test.mailgun.org';

      (EmailTemplates.meetingAnalysis as jest.Mock).mockReturnValue('<html>Meeting analysis template</html>');
    });

    it('should send meeting analysis to all unique participants', async () => {
      // Arrange
      const meetingData = createMeetingData();
      const organizationName = 'Acme Corp';
      mockMailgunClient.messages.create.mockResolvedValue({ id: 'msg-meeting' });

      // Act
      await service.sendMeetingAnalysisEmail(meetingData, organizationName);

      // Assert
      const expectedEmails = [
        'participant1@example.com',
        'participant2@example.com',
        'host@example.com',
        'owner@example.com',
      ];
      
      expect(mockMailgunClient.messages.create).toHaveBeenCalledTimes(4);
      
      expectedEmails.forEach(email => {
        expect(mockMailgunClient.messages.create).toHaveBeenCalledWith('test.mailgun.org', {
          from: 'Knowted <noreply@knowted.io>',
          to: [email],
          subject: `Meeting Summary:  ${meetingData.title}`,
          html: '<html>Meeting analysis template</html>',
        });
      });
    });

    it('should handle duplicate emails by sending only once', async () => {
      // Arrange
      const meetingData = createMeetingData({
        participants_email: ['host@example.com', 'host@example.com'],
        host_email: 'host@example.com',
        owner_email: 'host@example.com',
      });
      const organizationName = 'Acme Corp';
      mockMailgunClient.messages.create.mockResolvedValue({ id: 'msg-meeting' });

      // Act
      await service.sendMeetingAnalysisEmail(meetingData, organizationName);

      // Assert
      expect(mockMailgunClient.messages.create).toHaveBeenCalledTimes(1);
      expect(mockMailgunClient.messages.create).toHaveBeenCalledWith('test.mailgun.org', {
        from: 'Knowted <noreply@knowted.io>',
        to: ['host@example.com'],
        subject: `Meeting Summary:  ${meetingData.title}`,
        html: '<html>Meeting analysis template</html>',
      });
    });

    it('should skip invalid or empty email addresses', async () => {
      // Arrange
      const meetingData = createMeetingData({
        participants_email: ['valid@example.com', '', '   '],
        host_email: 'host@example.com',
        owner_email: undefined, // No owner email
      });
      const organizationName = 'Acme Corp';
      mockMailgunClient.messages.create.mockClear(); // Clear any previous calls
      mockMailgunClient.messages.create.mockResolvedValue({ id: 'msg-meeting' });

      // Act
      await service.sendMeetingAnalysisEmail(meetingData, organizationName);

      // Assert
      // Should send to: valid@example.com, host@example.com (2 emails)
      expect(mockMailgunClient.messages.create).toHaveBeenCalledTimes(2);
    });

    it('should continue sending to other participants if one fails', async () => {
      // Arrange
      const meetingData = createMeetingData();
      const organizationName = 'Acme Corp';
      const error = new Error('Email failed') as any;
      error.status = 500; // Server error to trigger retry
      
      // Clear any previous calls and set up fresh mocks
      mockMailgunClient.messages.create.mockClear();
      
      // The meeting data has 4 unique emails: participant1, participant2, host, owner
      let callCount = 0;
      mockMailgunClient.messages.create.mockImplementation((domain, msg) => {
        callCount++;
        
        // First email fails with server error (triggers retry), others succeed
        if (callCount <= 3) {
          return Promise.reject(error); // First email fails 3 times (retry)
        } else {
          return Promise.resolve({ id: 'msg-success' }); // Other emails succeed
        }
      });

      // Act
      await service.sendMeetingAnalysisEmail(meetingData, organizationName);

      // Assert
      // First email: 3 attempts (1 + 2 retries), other 3 emails: 1 attempt each = 6 total
      expect(mockMailgunClient.messages.create).toHaveBeenCalledTimes(6);
    });

    it('should return early when mailgun is not configured', async () => {
      // Arrange
      (service as any).mailgun = undefined;
      const meetingData = createMeetingData();
      const organizationName = 'Acme Corp';
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      // Act
      await service.sendMeetingAnalysisEmail(meetingData, organizationName);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Mailgun not configured - cannot send emails');
      expect(mockMailgunClient.messages.create).not.toHaveBeenCalled();
    });
  });

  describe('Feature: Security Incident Alerts', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        const config = createValidConfig();
        return config[key as keyof typeof config];
      });

      (service as any).mailgun = {
        client: jest.fn().mockReturnValue(mockMailgunClient),
      };
      (service as any).domain = 'test.mailgun.org';

      (SecurityTemplates.suspiciousActivity as jest.Mock).mockReturnValue('<html>Security alert template</html>');
    });

    it('should send security incident alert to admin', async () => {
      // Arrange
      const incident = createSecurityIncident();
      mockMailgunClient.messages.create.mockResolvedValue({ id: 'msg-security' });

      // Act
      await service.sendSecurityIncidentAlert(incident);

      // Assert
      expect(SecurityTemplates.suspiciousActivity).toHaveBeenCalledWith({
        type: incident.type,
        details: incident.details,
        time: expect.any(String),
        ip: incident.ip,
        userEmail: incident.userEmail,
      });
      expect(mockMailgunClient.messages.create).toHaveBeenCalledWith('test.mailgun.org', {
        from: 'Knowted <noreply@knowted.io>',
        to: ['admin@knowted.io'],
        subject: `Knowted Security Alert: ${incident.type} (${incident.severity.toUpperCase()})`,
        html: '<html>Security alert template</html>',
      });
    });

    it('should send alert to affected users when provided', async () => {
      // Arrange
      const incident = createSecurityIncident({
        affectedUsers: ['user1@example.com', 'user2@example.com'],
      });
      mockMailgunClient.messages.create.mockResolvedValue({ id: 'msg-security' });

      // Act
      await service.sendSecurityIncidentAlert(incident);

      // Assert
      expect(mockMailgunClient.messages.create).toHaveBeenCalledTimes(3); // 1 admin + 2 users
      expect(mockMailgunClient.messages.create).toHaveBeenCalledWith('test.mailgun.org', {
        from: 'Knowted <noreply@knowted.io>',
        to: ['user1@example.com'],
        subject: 'Security Alert: Suspicious Activity Detected',
        html: '<html>Security alert template</html>',
      });
    });

    it('should use default admin email when not configured', async () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        if (key === 'ADMIN_EMAIL') return undefined;
        const config = createValidConfig();
        return config[key as keyof typeof config];
      });
      
      const incident = createSecurityIncident();
      mockMailgunClient.messages.create.mockResolvedValue({ id: 'msg-security' });

      // Act
      await service.sendSecurityIncidentAlert(incident);

      // Assert
      expect(mockMailgunClient.messages.create).toHaveBeenCalledWith('test.mailgun.org', {
        from: 'Knowted <noreply@knowted.io>',
        to: ['jeffrey.lau@zenovateai.agency'],
        subject: `Knowted Security Alert: ${incident.type} (${incident.severity.toUpperCase()})`,
        html: '<html>Security alert template</html>',
      });
    });

    it('should propagate errors from email sending', async () => {
      // Arrange
      const incident = createSecurityIncident();
      const error = new Error('Security alert failed');
      mockMailgunClient.messages.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.sendSecurityIncidentAlert(incident)).rejects.toThrow('Security alert failed');
    });
  });

  describe('Feature: System Issue Notifications', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        const config = createValidConfig();
        return config[key as keyof typeof config];
      });

      (service as any).mailgun = {
        client: jest.fn().mockReturnValue(mockMailgunClient),
      };
      (service as any).domain = 'test.mailgun.org';

      (SecurityTemplates.systemIssue as jest.Mock).mockReturnValue('<html>System issue template</html>');
    });

    it('should send system issue notification to admin', async () => {
      // Arrange
      const issue = {
        type: 'Database Connection',
        description: 'Unable to connect to primary database',
        status: 'Investigating',
        severity: 'high' as const,
      };
      mockMailgunClient.messages.create.mockResolvedValue({ id: 'msg-system' });

      // Act
      await service.notifySystemIssue(issue);

      // Assert
      expect(SecurityTemplates.systemIssue).toHaveBeenCalledWith({
        issue: issue.description,
        time: expect.any(String),
        status: issue.status,
        severity: issue.severity,
      });
      expect(mockMailgunClient.messages.create).toHaveBeenCalledWith('test.mailgun.org', {
        from: 'Knowted <noreply@knowted.io>',
        to: ['admin@knowted.io'],
        subject: `System Issue Alert: ${issue.type} (${issue.severity.toUpperCase()})`,
        html: '<html>System issue template</html>',
      });
      expect(slackNotificationService.notifySystemIssue).toHaveBeenCalledWith(issue);
    });

    it('should handle different severity levels', async () => {
      // Arrange
      const severities = ['low', 'medium', 'high', 'critical'] as const;
      mockMailgunClient.messages.create.mockResolvedValue({ id: 'msg-system' });

      // Act & Assert
      for (const severity of severities) {
        const issue = {
          type: 'Test Issue',
          description: 'Test description',
          status: 'Active',
          severity,
        };

        await service.notifySystemIssue(issue);
        expect(mockMailgunClient.messages.create).toHaveBeenCalledWith('test.mailgun.org', {
          from: 'Knowted <noreply@knowted.io>',
          to: ['admin@knowted.io'],
          subject: `System Issue Alert: ${issue.type} (${severity.toUpperCase()})`,
          html: '<html>System issue template</html>',
        });
        expect(slackNotificationService.notifySystemIssue).toHaveBeenCalledWith(issue);
      }
    });

    it('should propagate errors from email sending', async () => {
      // Arrange
      const issue = {
        type: 'Test Issue',
        description: 'Test description',
        status: 'Active',
        severity: 'medium' as const,
      };
      const error = new Error('System notification failed');
      mockMailgunClient.messages.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.notifySystemIssue(issue)).rejects.toThrow('System notification failed');
    });
  });
});
