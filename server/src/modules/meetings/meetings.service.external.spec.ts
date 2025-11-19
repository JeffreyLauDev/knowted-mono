import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { ConfigService } from '@nestjs/config';
import { PinoLoggerService } from '../../common/logger/pino-logger.service';
import { CalendarSyncService } from '../calendar/calendar-sync.service';
import { MeetingBaasIntegrationService } from '../calendar/meetingbaas-integration.service';
import { EmailService } from '../email/email.service';
import { Organizations } from '../organizations/entities/organizations.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { ProfilesService } from '../profiles/profiles.service';
import { SupabaseService } from '../supabase/supabase.service';
import { TeamsService } from '../teams/teams.service';
import { UsageEventsService } from '../usage-events/usage-events.service';
import { WebhookNotificationService } from '../webhooks/webhook-notification.service';
import { Meetings } from './entities/meetings.entity';
import { MeetingSharesService } from './meeting-shares.service';
import { MeetingsService } from './meetings.service';

describe('MeetingsService - External API', () => {
  let service: MeetingsService;
  let meetingsRepository: jest.Mocked<Repository<Meetings>>;
  let organizationsRepository: jest.Mocked<Repository<Organizations>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        {
          provide: getRepositoryToken(Meetings),
          useValue: createMock<Repository<Meetings>>({
            createQueryBuilder: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(Organizations),
          useValue: createMock<Repository<Organizations>>(),
        },
        {
          provide: PermissionsService,
          useValue: createMock<PermissionsService>(),
        },
        {
          provide: ProfilesService,
          useValue: createMock<ProfilesService>(),
        },
        {
          provide: TeamsService,
          useValue: createMock<TeamsService>(),
        },
        {
          provide: UsageEventsService,
          useValue: createMock<UsageEventsService>(),
        },
        {
          provide: MeetingBaasIntegrationService,
          useValue: createMock<MeetingBaasIntegrationService>(),
        },
        {
          provide: CalendarSyncService,
          useValue: createMock<CalendarSyncService>(),
        },
        {
          provide: SupabaseService,
          useValue: createMock<SupabaseService>(),
        },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
        {
          provide: MeetingSharesService,
          useValue: createMock<MeetingSharesService>(),
        },
        {
          provide: EmailService,
          useValue: createMock<EmailService>(),
        },
        {
          provide: PinoLoggerService,
          useValue: createMock<PinoLoggerService>(),
        },
        {
          provide: WebhookNotificationService,
          useValue: createMock<WebhookNotificationService>(),
        },
      ],
    }).compile();

    service = module.get<MeetingsService>(MeetingsService);
    meetingsRepository = module.get(getRepositoryToken(Meetings));
    organizationsRepository = module.get(getRepositoryToken(Organizations));
  });

  describe('findAllExternal', () => {
    let queryBuilder: jest.Mocked<SelectQueryBuilder<Meetings>>;

    beforeEach(() => {
      queryBuilder = createMock<SelectQueryBuilder<Meetings>>({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });

      jest.spyOn(meetingsRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);
    });

    it('should return paginated meetings for organization', async () => {
      // Arrange
      const organizationId = 'org-123';
      const mockMeetings = [
        {
          id: 'meeting-1',
          title: 'Meeting 1',
          organization_id: organizationId,
          analysed: true,
          meeting_date: new Date('2024-01-01'),
          participants_email: ['user1@example.com'],
        },
        {
          id: 'meeting-2',
          title: 'Meeting 2',
          organization_id: organizationId,
          analysed: true,
          meeting_date: new Date('2024-01-02'),
          participants_email: ['user2@example.com'],
        },
      ] as Meetings[];

      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([mockMeetings, 2]);

      // Act
      const result = await service.findAllExternal(organizationId, {
        limit: 5,
        page: 0,
      });

      // Assert
      expect(result).toEqual({
        data: mockMeetings,
        total: 2,
        page: 0,
        limit: 5,
        totalPages: 1,
      });

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'meeting.organization_id = :organizationId',
        { organizationId },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'meeting.analysed = :analysed',
        { analysed: true },
      );
    });

    it('should filter by meeting_id', async () => {
      // Arrange
      const organizationId = 'org-123';
      const meetingId = 'meeting-123';

      // Act
      await service.findAllExternal(organizationId, {
        meeting_id: meetingId,
      });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('meeting.id = :meetingId', {
        meetingId,
      });
    });

    it('should filter by meeting_type_id', async () => {
      // Arrange
      const organizationId = 'org-123';
      const meetingTypeId = 'type-123';

      // Act
      await service.findAllExternal(organizationId, {
        meeting_type_id: meetingTypeId,
      });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'meeting.meeting_type_id = :meetingTypeId',
        { meetingTypeId },
      );
    });

    it('should filter by user_id', async () => {
      // Arrange
      const organizationId = 'org-123';
      const userId = 'user-123';

      // Act
      await service.findAllExternal(organizationId, {
        user_id: userId,
      });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('meeting.user_id = :userId', {
        userId,
      });
    });

    it('should filter by participant_email', async () => {
      // Arrange
      const organizationId = 'org-123';
      const participantEmail = 'participant@example.com';

      // Act
      await service.findAllExternal(organizationId, {
        participant_email: participantEmail,
      });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        ':participantEmail = ANY(meeting.participants_email)',
        { participantEmail },
      );
    });

    it('should filter by date range (from_date and to_date)', async () => {
      // Arrange
      const organizationId = 'org-123';
      const fromDate = '2024-01-01T00:00:00Z';
      const toDate = '2024-12-31T23:59:59Z';

      // Act
      await service.findAllExternal(organizationId, {
        from_date: fromDate,
        to_date: toDate,
      });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'meeting.meeting_date BETWEEN :fromDate AND :toDate',
        { fromDate, toDate },
      );
    });

    it('should filter by from_date only', async () => {
      // Arrange
      const organizationId = 'org-123';
      const fromDate = '2024-01-01T00:00:00Z';

      // Act
      await service.findAllExternal(organizationId, {
        from_date: fromDate,
      });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'meeting.meeting_date >= :fromDate',
        { fromDate },
      );
    });

    it('should filter by to_date only', async () => {
      // Arrange
      const organizationId = 'org-123';
      const toDate = '2024-12-31T23:59:59Z';

      // Act
      await service.findAllExternal(organizationId, {
        to_date: toDate,
      });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'meeting.meeting_date <= :toDate',
        { toDate },
      );
    });

    it('should apply pagination with default values', async () => {
      // Arrange
      const organizationId = 'org-123';
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      // Act
      await service.findAllExternal(organizationId, {});

      // Assert
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(5); // Default limit
    });

    it('should apply custom pagination', async () => {
      // Arrange
      const organizationId = 'org-123';
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      // Act
      await service.findAllExternal(organizationId, {
        page: 2,
        limit: 10,
      });

      // Assert
      expect(queryBuilder.skip).toHaveBeenCalledWith(20); // page 2 * limit 10
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should cap limit at 100', async () => {
      // Arrange
      const organizationId = 'org-123';
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      // Act
      await service.findAllExternal(organizationId, {
        limit: 200, // Should be capped at 100
      });

      // Assert
      expect(queryBuilder.take).toHaveBeenCalledWith(100);
    });

    it('should order by meeting_date DESC by default', async () => {
      // Arrange
      const organizationId = 'org-123';
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      // Act
      await service.findAllExternal(organizationId, {});

      // Assert
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('meeting.meeting_date', 'DESC');
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('meeting.created_at', 'DESC');
    });

    it('should order by created_at when specified', async () => {
      // Arrange
      const organizationId = 'org-123';
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      // Act
      await service.findAllExternal(organizationId, {
        order_by: 'created_at',
        order_direction: 'ASC',
      });

      // Assert
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('meeting.created_at', 'ASC');
      expect(queryBuilder.addOrderBy).not.toHaveBeenCalled(); // Should not add secondary sort when ordering by created_at
    });

    it('should order by duration_mins when specified', async () => {
      // Arrange
      const organizationId = 'org-123';
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      // Act
      await service.findAllExternal(organizationId, {
        order_by: 'duration_mins',
        order_direction: 'ASC',
      });

      // Assert
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('meeting.duration_mins', 'ASC');
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('meeting.created_at', 'ASC');
    });

    it('should calculate totalPages correctly', async () => {
      // Arrange
      const organizationId = 'org-123';
      const mockMeetings = Array(15).fill({} as Meetings);
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([mockMeetings.slice(0, 5), 15]);

      // Act
      const result = await service.findAllExternal(organizationId, {
        limit: 5,
        page: 0,
      });

      // Assert
      expect(result.totalPages).toBe(3); // 15 total / 5 per page = 3 pages
    });

    it('should combine multiple filters', async () => {
      // Arrange
      const organizationId = 'org-123';
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

      // Act
      await service.findAllExternal(organizationId, {
        meeting_type_id: 'type-123',
        participant_email: 'user@example.com',
        from_date: '2024-01-01',
        to_date: '2024-12-31',
        limit: 10,
        page: 1,
        order_by: 'duration_mins',
        order_direction: 'ASC',
      });

      // Assert - Verify all filters are applied
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'meeting.meeting_type_id = :meetingTypeId',
        { meetingTypeId: 'type-123' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        ':participantEmail = ANY(meeting.participants_email)',
        { participantEmail: 'user@example.com' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'meeting.meeting_date BETWEEN :fromDate AND :toDate',
        { fromDate: '2024-01-01', toDate: '2024-12-31' },
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(10); // page 1 * limit 10
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('meeting.duration_mins', 'ASC');
    });
  });
});

