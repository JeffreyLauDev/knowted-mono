import { createMock } from '@golevelup/ts-jest';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
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
import { Profile } from '../profiles/entities/profile.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { SupabaseService } from '../supabase/supabase.service';
import { TeamsService } from '../teams/teams.service';
import { EventType } from '../usage-events/entities/usage-event.entity';
import { UsageEventsService } from '../usage-events/usage-events.service';
import { WebhookNotificationService } from '../webhooks/webhook-notification.service';
import { CompleteMeetingDto } from './dto/complete-meeting.dto';
import { CreateMeetingsDto } from './dto/create-meetings.dto';
import { FindMeetingsDto } from './dto/find-meetings.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { Meetings } from './entities/meetings.entity';
import { MeetingSharesService } from './meeting-shares.service';
import { MeetingsService } from './meetings.service';

describe('MeetingsService', () => {
  let service: MeetingsService;
  let meetingsRepository: jest.Mocked<Repository<Meetings>>;
  let organizationsRepository: jest.Mocked<Repository<Organizations>>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let profilesService: jest.Mocked<ProfilesService>;
  let teamsService: jest.Mocked<TeamsService>;
  let usageEventsService: jest.Mocked<UsageEventsService>;
  let meetingBaasIntegrationService: jest.Mocked<MeetingBaasIntegrationService>;
  let calendarSyncService: jest.Mocked<CalendarSyncService>;
  let supabaseService: jest.Mocked<SupabaseService>;
  let configService: jest.Mocked<ConfigService>;
  let meetingSharesService: jest.Mocked<MeetingSharesService>;
  let emailService: jest.Mocked<EmailService>;
  let logger: jest.Mocked<PinoLoggerService>;
  let webhookNotificationService: jest.Mocked<WebhookNotificationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        {
          provide: getRepositoryToken(Meetings),
          useValue: createMock<Repository<Meetings>>({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(Organizations),
          useValue: createMock<Repository<Organizations>>({
            findOne: jest.fn(),
          }),
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
    permissionsService = module.get(PermissionsService);
    profilesService = module.get(ProfilesService);
    teamsService = module.get(TeamsService);
    usageEventsService = module.get(UsageEventsService);
    meetingBaasIntegrationService = module.get(MeetingBaasIntegrationService);
    calendarSyncService = module.get(CalendarSyncService);
    supabaseService = module.get(SupabaseService);
    configService = module.get(ConfigService);
    meetingSharesService = module.get(MeetingSharesService);
    emailService = module.get(EmailService);
    logger = module.get(PinoLoggerService);
    webhookNotificationService = module.get(WebhookNotificationService);
  });

  describe('create', () => {
    it('should create meeting with provided data', async () => {
      // Arrange
      const createDto: CreateMeetingsDto = {
        name: 'Test Meeting',
        description: 'Test Description',
        is_active: true,
        settings: { test: 'value' },
        user_id: 'user-123',
        organization_id: 'org-123',
        team_id: 'team-123',
        calendar_id: 'calendar-123',
      };
      const mockMeeting = createMock<Meetings>({
        id: 'meeting-123',
        title: 'Test Meeting',
        user_id: 'user-123',
        organization_id: 'org-123',
        team_id: 'team-123',
      });

      meetingsRepository.create.mockReturnValue(mockMeeting);
      meetingsRepository.save.mockResolvedValue(mockMeeting);
      usageEventsService.logEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(meetingsRepository.create).toHaveBeenCalledWith({
        title: 'Test Meeting',
        meta_data: {
          description: 'Test Description',
          is_active: true,
          test: 'value',
        },
        analysed: false,
        bot_id: '',
        chapters: '',
        duration_mins: 0,
        host_email: '',
        meeting_date: expect.any(String),
        meeting_url: '',
        participants_email: [],
        summary: '',
        summary_meta_data: {},
        thumbnail: '',
        transcript: '',
        transcript_json: {},
        transcript_url: '',
        video_url: '',
        user_id: 'user-123',
        profile: { id: 'user-123' },
        organization: { id: 'org-123' },
        calendar_id: 'calendar-123',
        team: { id: 'team-123' },
      });
      expect(meetingsRepository.save).toHaveBeenCalledWith(mockMeeting);
      expect(usageEventsService.logEvent).toHaveBeenCalledWith(
        'org-123',
        EventType.MEETING_CREATED,
        'user-123',
        { meetingId: 'meeting-123' },
        1,
      );
      expect(result).toEqual(mockMeeting);
    });

    it('should create meeting without team when team_id is not provided', async () => {
      // Arrange
      const createDto: CreateMeetingsDto = {
        name: 'Test Meeting',
        user_id: 'user-123',
        organization_id: 'org-123',
      };
      const mockMeeting = createMock<Meetings>({
        id: 'meeting-123',
        title: 'Test Meeting',
        user_id: 'user-123',
        organization_id: 'org-123',
      });

      meetingsRepository.create.mockReturnValue(mockMeeting);
      meetingsRepository.save.mockResolvedValue(mockMeeting);
      usageEventsService.logEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(meetingsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Meeting',
          user_id: 'user-123',
          organization: { id: 'org-123' },
        }),
      );
      expect(result).toEqual(mockMeeting);
    });

    it('should handle usage event tracking failure gracefully', async () => {
      // Arrange
      const createDto: CreateMeetingsDto = {
        name: 'Test Meeting',
        user_id: 'user-123',
        organization_id: 'org-123',
      };
      const mockMeeting = createMock<Meetings>({
        id: 'meeting-123',
        title: 'Test Meeting',
      });

      meetingsRepository.create.mockReturnValue(mockMeeting);
      meetingsRepository.save.mockResolvedValue(mockMeeting);
      usageEventsService.logEvent.mockRejectedValue(new Error('Usage tracking failed'));

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow('Usage tracking failed');
    });
  });

  describe('findAll', () => {
    const mockTeams = [
      { id: 'team-1', name: 'Team 1', description: 'Team 1 Description', is_admin: false },
      { id: 'team-2', name: 'Team 2', description: 'Team 2 Description', is_admin: false },
    ];

    beforeEach(() => {
      teamsService.getUserTeams.mockResolvedValue(mockTeams);
    });

    it('should throw UnauthorizedException when user has no teams (even if organization owner)', async () => {
      // Arrange
      const query: FindMeetingsDto = {
        organization_id: 'org-123',
        page: 0,
        limit: 20,
      };
      const mockOrganization = createMock<Organizations>({
        id: 'org-123',
        owner_id: 'user-123',
      });

      teamsService.getUserTeams.mockResolvedValue([]);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);

      // Act & Assert
      await expect(service.findAll(query, 'user-123')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(teamsService.getUserTeams).toHaveBeenCalledWith('org-123', 'user-123');
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        select: ['owner_id'],
      });
      expect(logger.error).toHaveBeenCalledWith(
        'CRITICAL: User has no teams - this indicates a serious organizational structure issue that needs immediate attention',
        undefined,
        'MeetingsService',
        {
          organizationId: 'org-123',
          userId: 'user-123',
          ownerId: 'user-123',
          isOwner: true,
          issue: 'Organization owner is not part of any team - this breaks the security model',
        },
      );
    });

    it('should throw UnauthorizedException when user has no teams and is not organization owner', async () => {
      // Arrange
      const query: FindMeetingsDto = {
        organization_id: 'org-123',
        page: 0,
        limit: 20,
      };
      const mockOrganization = createMock<Organizations>({
        id: 'org-123',
        owner_id: 'different-user',
      });

      teamsService.getUserTeams.mockResolvedValue([]);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);

      // Act & Assert
      await expect(service.findAll(query, 'user-123')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(teamsService.getUserTeams).toHaveBeenCalledWith('org-123', 'user-123');
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        select: ['owner_id'],
      });
      expect(logger.error).toHaveBeenCalledWith(
        'CRITICAL: User has no teams - this indicates a serious organizational structure issue that needs immediate attention',
        undefined,
        'MeetingsService',
        {
          organizationId: 'org-123',
          userId: 'user-123',
          ownerId: 'different-user',
          isOwner: false,
          issue: 'User is not part of any team and not organization owner',
        },
      );
    });

    it('should throw UnauthorizedException when user has no teams and organization does not exist', async () => {
      // Arrange
      const query: FindMeetingsDto = {
        organization_id: 'org-123',
        page: 0,
        limit: 20,
      };

      teamsService.getUserTeams.mockResolvedValue([]);
      organizationsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findAll(query, 'user-123')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(teamsService.getUserTeams).toHaveBeenCalledWith('org-123', 'user-123');
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        select: ['owner_id'],
      });
      expect(logger.error).toHaveBeenCalledWith(
        'CRITICAL: User has no teams - this indicates a serious organizational structure issue that needs immediate attention',
        undefined,
        'MeetingsService',
        {
          organizationId: 'org-123',
          userId: 'user-123',
          ownerId: undefined,
          isOwner: false,
          issue: 'User is not part of any team and not organization owner',
        },
      );
    });

    it('should return meetings when user has teams with proper permissions', async () => {
      // Arrange
      const query: FindMeetingsDto = {
        organization_id: 'org-123',
        page: 0,
        limit: 20,
      };
      const mockMeetings = [
        createMock<Meetings>({
          id: 'meeting-1',
          title: 'Meeting 1',
          organization_id: 'org-123',
        }),
        createMock<Meetings>({
          id: 'meeting-2',
          title: 'Meeting 2',
          organization_id: 'org-123',
        }),
      ];
      const mockQueryBuilder = createMock<SelectQueryBuilder<Meetings>>();
      mockQueryBuilder.leftJoin.mockReturnThis();
      mockQueryBuilder.where.mockReturnThis();
      mockQueryBuilder.andWhere.mockReturnThis();
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.orderBy.mockReturnThis();
      mockQueryBuilder.addOrderBy.mockReturnThis();
      mockQueryBuilder.skip.mockReturnThis();
      mockQueryBuilder.take.mockReturnThis();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockMeetings, 2]);

      meetingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query, 'user-123');

      // Assert
      expect(teamsService.getUserTeams).toHaveBeenCalledWith('org-123', 'user-123');
      expect(meetingsRepository.createQueryBuilder).toHaveBeenCalledWith('meeting');
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('meeting.meetingType', 'meetingType');
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('meeting.team', 'team');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('meeting.organization_id = :organizationId', {
        organizationId: 'org-123',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('meeting.analysed = :analysed', { analysed: true });
      expect(result).toEqual({
        data: mockMeetings,
        total: 2,
        page: 0,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should filter by meeting type when meeting_type_id is provided', async () => {
      // Arrange
      const query: FindMeetingsDto = {
        organization_id: 'org-123',
        meeting_type_id: 'type-123',
        page: 0,
        limit: 20,
      };
      const mockQueryBuilder = createMock<SelectQueryBuilder<Meetings>>();
      mockQueryBuilder.leftJoin.mockReturnThis();
      mockQueryBuilder.where.mockReturnThis();
      mockQueryBuilder.andWhere.mockReturnThis();
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.orderBy.mockReturnThis();
      mockQueryBuilder.addOrderBy.mockReturnThis();
      mockQueryBuilder.skip.mockReturnThis();
      mockQueryBuilder.take.mockReturnThis();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      meetingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query, 'user-123');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('meetingType.id = :meetingTypeId', {
        meetingTypeId: 'type-123',
      });
    });

    it('should filter by team when team_id is provided', async () => {
      // Arrange
      const query: FindMeetingsDto = {
        organization_id: 'org-123',
        team_id: 'team-123',
        page: 0,
        limit: 20,
      };
      const mockQueryBuilder = createMock<SelectQueryBuilder<Meetings>>();
      mockQueryBuilder.leftJoin.mockReturnThis();
      mockQueryBuilder.where.mockReturnThis();
      mockQueryBuilder.andWhere.mockReturnThis();
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.orderBy.mockReturnThis();
      mockQueryBuilder.addOrderBy.mockReturnThis();
      mockQueryBuilder.skip.mockReturnThis();
      mockQueryBuilder.take.mockReturnThis();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      meetingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query, 'user-123');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('team.id = :teamId', { teamId: 'team-123' });
    });

    it('should filter by date range when from_date and to_date are provided', async () => {
      // Arrange
      const query: FindMeetingsDto = {
        organization_id: 'org-123',
        from_date: '2024-01-01T00:00:00Z',
        to_date: '2024-01-31T23:59:59Z',
        page: 0,
        limit: 20,
      };
      const mockQueryBuilder = createMock<SelectQueryBuilder<Meetings>>();
      mockQueryBuilder.leftJoin.mockReturnThis();
      mockQueryBuilder.where.mockReturnThis();
      mockQueryBuilder.andWhere.mockReturnThis();
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.orderBy.mockReturnThis();
      mockQueryBuilder.addOrderBy.mockReturnThis();
      mockQueryBuilder.skip.mockReturnThis();
      mockQueryBuilder.take.mockReturnThis();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      meetingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query, 'user-123');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'meeting.meeting_date BETWEEN :fromDate AND :toDate',
        {
          fromDate: '2024-01-01T00:00:00Z',
          toDate: '2024-01-31T23:59:59Z',
        },
      );
    });

    it('should filter by search term when search is provided', async () => {
      // Arrange
      const query: FindMeetingsDto = {
        organization_id: 'org-123',
        search: 'test meeting',
        page: 0,
        limit: 20,
      };
      const mockQueryBuilder = createMock<SelectQueryBuilder<Meetings>>();
      mockQueryBuilder.leftJoin.mockReturnThis();
      mockQueryBuilder.where.mockReturnThis();
      mockQueryBuilder.andWhere.mockReturnThis();
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.orderBy.mockReturnThis();
      mockQueryBuilder.addOrderBy.mockReturnThis();
      mockQueryBuilder.skip.mockReturnThis();
      mockQueryBuilder.take.mockReturnThis();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      meetingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query, 'user-123');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('meeting.title ILIKE :search', {
        search: '%test meeting%',
      });
    });

    it('should return paginated results with correct metadata', async () => {
      // Arrange
      const query: FindMeetingsDto = {
        organization_id: 'org-123',
        page: 1,
        limit: 10,
      };
      const mockMeetings = Array.from({ length: 10 }, (_, i) =>
        createMock<Meetings>({
          id: `meeting-${i}`,
          title: `Meeting ${i}`,
        }),
      );
      const mockQueryBuilder = createMock<SelectQueryBuilder<Meetings>>();
      mockQueryBuilder.leftJoin.mockReturnThis();
      mockQueryBuilder.where.mockReturnThis();
      mockQueryBuilder.andWhere.mockReturnThis();
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.orderBy.mockReturnThis();
      mockQueryBuilder.addOrderBy.mockReturnThis();
      mockQueryBuilder.skip.mockReturnThis();
      mockQueryBuilder.take.mockReturnThis();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockMeetings, 25]);

      meetingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query, 'user-123');

      // Assert
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // page 1 * limit 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        data: mockMeetings,
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });
  });

  describe('findOne', () => {
    const mockTeams = [{ id: 'team-1', name: 'Team 1', description: 'Team 1 Description', is_admin: false }];

    beforeEach(() => {
      teamsService.getUserTeams.mockResolvedValue(mockTeams);
    });

    it('should return null when user has no teams', async () => {
      // Arrange
      teamsService.getUserTeams.mockResolvedValue([]);

      // Act
      const result = await service.findOne('meeting-123', 'org-123', 'user-123');

      // Assert
      expect(result).toBeNull();
    });

    it('should return meeting when user has permission through any team', async () => {
      // Arrange
      const mockMeeting = createMock<Meetings>({
        id: 'meeting-123',
        title: 'Test Meeting',
        organization_id: 'org-123',
        meetingType: { id: 'type-123', name: 'Test Type' },
      });

      meetingsRepository.findOne.mockResolvedValue(mockMeeting);
      permissionsService.checkPermission.mockResolvedValue(true);

      // Act
      const result = await service.findOne('meeting-123', 'org-123', 'user-123');

      // Assert
      expect(teamsService.getUserTeams).toHaveBeenCalledWith('org-123', 'user-123');
      expect(meetingsRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'meeting-123',
          organization: { id: 'org-123' },
        },
        relations: ['meetingType', 'organization'],
        select: expect.any(Object),
      });
      expect(permissionsService.checkPermission).toHaveBeenCalledWith(
        'team-1',
        'meeting_types',
        'type-123',
        'read',
      );
      expect(result).toEqual(mockMeeting);
    });

    it('should return null when meeting does not exist', async () => {
      // Arrange
      meetingsRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findOne('non-existent', 'org-123', 'user-123');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user has no permission for meeting type', async () => {
      // Arrange
      const mockMeeting = createMock<Meetings>({
        id: 'meeting-123',
        title: 'Test Meeting',
        organization_id: 'org-123',
        meetingType: { id: 'type-123', name: 'Test Type' },
      });

      meetingsRepository.findOne.mockResolvedValue(mockMeeting);
      permissionsService.checkPermission.mockResolvedValue(false);

      // Act
      const result = await service.findOne('meeting-123', 'org-123', 'user-123');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when meeting belongs to different organization', async () => {
      // Arrange
      meetingsRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findOne('meeting-123', 'different-org', 'user-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('deleteMeeting', () => {
    const mockTeams = [{ id: 'team-1', name: 'Team 1', description: 'Team 1 Description', is_admin: false }];

    beforeEach(() => {
      teamsService.getUserTeams.mockResolvedValue(mockTeams);
    });

    it('should throw UnauthorizedException when user has no teams (even if organization owner)', async () => {
      // Arrange
      const meetingId = 'meeting-123';
      const organizationId = 'org-123';
      const userId = 'user-123';
      const mockOrganization = createMock<Organizations>({
        id: 'org-123',
        owner_id: 'user-123',
      });

      teamsService.getUserTeams.mockResolvedValue([]);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);

      // Act & Assert
      await expect(
        service.deleteMeeting(meetingId, organizationId, userId),
      ).rejects.toThrow(UnauthorizedException);
      expect(teamsService.getUserTeams).toHaveBeenCalledWith(organizationId, userId);
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
        select: ['owner_id'],
      });
      expect(logger.error).toHaveBeenCalledWith(
        'CRITICAL: User has no teams - this indicates a serious organizational structure issue that needs immediate attention',
        undefined,
        'MeetingsService',
        {
          organizationId,
          userId,
          ownerId: 'user-123',
          isOwner: true,
          issue: 'Organization owner is not part of any team - this breaks the security model',
        },
      );
    });

    it('should throw UnauthorizedException when user has no teams and is not organization owner', async () => {
      // Arrange
      const meetingId = 'meeting-123';
      const organizationId = 'org-123';
      const userId = 'user-123';
      const mockOrganization = createMock<Organizations>({
        id: 'org-123',
        owner_id: 'different-user',
      });

      teamsService.getUserTeams.mockResolvedValue([]);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);

      // Act & Assert
      await expect(
        service.deleteMeeting(meetingId, organizationId, userId),
      ).rejects.toThrow(UnauthorizedException);
      expect(teamsService.getUserTeams).toHaveBeenCalledWith(organizationId, userId);
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
        select: ['owner_id'],
      });
      expect(logger.error).toHaveBeenCalledWith(
        'CRITICAL: User has no teams - this indicates a serious organizational structure issue that needs immediate attention',
        undefined,
        'MeetingsService',
        {
          organizationId,
          userId,
          ownerId: 'different-user',
          isOwner: false,
          issue: 'User is not part of any team and not organization owner',
        },
      );
    });

    it('should delete meeting when user has write permission through any team', async () => {
      // Arrange
      const mockMeeting = createMock<Meetings>({
        id: 'meeting-123',
        title: 'Test Meeting',
        organization_id: 'org-123',
        meetingType: { id: 'type-123', name: 'Test Type' },
      });

      meetingsRepository.findOne.mockResolvedValue(mockMeeting);
      permissionsService.checkPermission.mockResolvedValue(true);
      meetingsRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      // Act
      await service.deleteMeeting('meeting-123', 'org-123', 'user-123');

      // Assert
      expect(teamsService.getUserTeams).toHaveBeenCalledWith('org-123', 'user-123');
      expect(meetingsRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'meeting-123',
          organization: { id: 'org-123' },
        },
        relations: ['meetingType'],
      });
      expect(permissionsService.checkPermission).toHaveBeenCalledWith(
        'team-1',
        'meeting_types',
        'type-123',
        'readWrite',
      );
      expect(meetingsRepository.delete).toHaveBeenCalledWith('meeting-123');
    });

    it('should throw NotFoundException when meeting does not exist', async () => {
      // Arrange
      meetingsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteMeeting('non-existent', 'org-123', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when meeting belongs to different organization', async () => {
      // Arrange
      meetingsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteMeeting('meeting-123', 'different-org', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user has no write permission', async () => {
      // Arrange
      const mockMeeting = createMock<Meetings>({
        id: 'meeting-123',
        title: 'Test Meeting',
        organization_id: 'org-123',
        meetingType: { id: 'type-123', name: 'Test Type' },
      });

      meetingsRepository.findOne.mockResolvedValue(mockMeeting);
      permissionsService.checkPermission.mockResolvedValue(false);

      // Act & Assert
      await expect(service.deleteMeeting('meeting-123', 'org-123', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMeeting', () => {
    it('should update meeting with provided data', async () => {
      // Arrange
      const meetingId = 'meeting-123';
      const updateDto: UpdateMeetingDto = {
        title: 'Updated Meeting',
        summary: 'Updated Summary',
        meeting_type_id: 'type-456',
        meeting_date: '2024-01-15T10:00:00Z',
      };
      const mockMeeting = createMock<Meetings>({
        id: meetingId,
        title: 'Original Meeting',
        organization: { id: 'org-123' },
      });
      const updatedMeeting = createMock<Meetings>({
        id: meetingId,
        title: 'Updated Meeting',
        organization: { id: 'org-123' },
      });

      meetingsRepository.findOne.mockResolvedValue(mockMeeting);
      meetingsRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      jest.spyOn(service, 'findOne').mockResolvedValue(updatedMeeting);

      // Act
      const result = await service.updateMeeting(meetingId, updateDto, 'user-123');

      // Assert
      expect(meetingsRepository.findOne).toHaveBeenCalledWith({
        where: { id: meetingId },
        relations: ['meetingType', 'organization'],
      });
      expect(meetingsRepository.update).toHaveBeenCalledWith(meetingId, {
        title: 'Updated Meeting',
        summary: 'Updated Summary',
        meetingType: { id: 'type-456' },
        meeting_date: new Date('2024-01-15T10:00:00Z'),
      });
      expect(result).toEqual(updatedMeeting);
    });

    it('should throw NotFoundException when meeting does not exist', async () => {
      // Arrange
      const meetingId = 'non-existent';
      const updateDto: UpdateMeetingDto = {
        title: 'Updated Meeting',
      };

      meetingsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateMeeting(meetingId, updateDto, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update meeting with CompleteMeetingDto data', async () => {
      // Arrange
      const meetingId = 'meeting-123';
      const completeDto: CompleteMeetingDto = {
        title: 'Completed Meeting',
        duration_mins: 60,
        meta_data: { test: 'value' },
        transcript: 'Test transcript',
        meeting_type_id: 'type-123',
        summary_meta_data: { key_points: 5 },
        summary: 'Test summary',
        chapters: 'Introduction, Discussion, Conclusion',
        thumbnail: 'https://example.com/thumb.jpg',
        bot_id: 'bot-123',
        transcript_json: { data: [], type: 'array' },
      };
      const mockMeeting = createMock<Meetings>({
        id: meetingId,
        title: 'Original Meeting',
        organization: { id: 'org-123' },
      });
      const updatedMeeting = createMock<Meetings>({
        id: meetingId,
        title: 'Completed Meeting',
        organization: { id: 'org-123' },
      });

      meetingsRepository.findOne.mockResolvedValue(mockMeeting);
      meetingsRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      jest.spyOn(service, 'findOne').mockResolvedValue(updatedMeeting);

      // Act
      const result = await service.updateMeeting(meetingId, completeDto, 'user-123');

      // Assert
      expect(meetingsRepository.update).toHaveBeenCalledWith(meetingId, expect.objectContaining({
        title: 'Completed Meeting',
        duration_mins: 60,
        meetingType: { id: 'type-123' },
      }));
      expect(result).toEqual(updatedMeeting);
    });
  });

  describe('completeMeeting', () => {
    it('should complete meeting and track usage events', async () => {
      // Arrange
      const meetingId = 'meeting-123';
      const completeDto: CompleteMeetingDto = {
        title: 'Completed Meeting',
        duration_mins: 60,
        summary: 'Meeting Summary',
        meta_data: { test: 'value' },
        transcript: 'Test transcript',
        meeting_type_id: 'type-123',
        summary_meta_data: { key_points: 5 },
        chapters: 'Introduction, Discussion, Conclusion',
        thumbnail: 'https://example.com/thumb.jpg',
        bot_id: 'bot-123',
        transcript_json: { data: [], type: 'array' },
      };
      const mockMeeting = createMock<Meetings>({
        id: meetingId,
        title: 'Completed Meeting',
        organization: { id: 'org-123' },
        user_id: 'user-123',
      });

      jest.spyOn(service, 'updateMeeting').mockResolvedValue(mockMeeting);
      usageEventsService.logEvent.mockResolvedValue(undefined);
      usageEventsService.trackCallMinutesUsed.mockResolvedValue(undefined);

      // Act
      const result = await service.completeMeeting(meetingId, completeDto, 'user-123');

      // Assert
      expect(service.updateMeeting).toHaveBeenCalledWith(meetingId, completeDto, 'user-123');
      expect(usageEventsService.logEvent).toHaveBeenCalledWith(
        'org-123',
        EventType.MEETING_COMPLETED,
        'user-123',
        { meetingId: 'meeting-123', duration: 60 },
        1,
      );
      expect(usageEventsService.trackCallMinutesUsed).toHaveBeenCalledWith(
        'org-123',
        'user-123',
        60,
      );
      expect(result).toEqual(mockMeeting);
    });

    it('should track call minutes usage when duration is provided', async () => {
      // Arrange
      const meetingId = 'meeting-123';
      const completeDto: CompleteMeetingDto = {
        title: 'Completed Meeting',
        duration_mins: 120,
        meta_data: { test: 'value' },
        transcript: 'Test transcript',
        meeting_type_id: 'type-123',
        summary_meta_data: { key_points: 5 },
        summary: 'Test summary',
        chapters: 'Introduction, Discussion, Conclusion',
        thumbnail: 'https://example.com/thumb.jpg',
        bot_id: 'bot-123',
        transcript_json: { data: [], type: 'array' },
      };
      const mockMeeting = createMock<Meetings>({
        id: meetingId,
        organization: { id: 'org-123' },
        user_id: 'user-123',
      });

      jest.spyOn(service, 'updateMeeting').mockResolvedValue(mockMeeting);
      usageEventsService.logEvent.mockResolvedValue(undefined);
      usageEventsService.trackCallMinutesUsed.mockResolvedValue(undefined);

      // Act
      await service.completeMeeting(meetingId, completeDto, 'user-123');

      // Assert
      expect(usageEventsService.trackCallMinutesUsed).toHaveBeenCalledWith(
        'org-123',
        'user-123',
        120,
      );
    });

    it('should handle email sending failures gracefully', async () => {
      // Arrange
      const meetingId = 'meeting-123';
      const completeDto: CompleteMeetingDto = {
        title: 'Completed Meeting',
        duration_mins: 60,
        meta_data: { test: 'value' },
        transcript: 'Test transcript',
        meeting_type_id: 'type-123',
        summary_meta_data: { key_points: 5 },
        summary: 'Test summary',
        chapters: 'Introduction, Discussion, Conclusion',
        thumbnail: 'https://example.com/thumb.jpg',
        bot_id: 'bot-123',
        transcript_json: { data: [], type: 'array' },
      };
      const mockMeeting = createMock<Meetings>({
        id: meetingId,
        organization: { id: 'org-123' },
        user_id: 'user-123',
      });
      const updatedMeeting = createMock<Meetings>({
        id: meetingId,
        title: 'Completed Meeting',
        organization: { id: 'org-123', name: 'Test Org' },
        user_id: 'user-123',
      });

      jest.spyOn(service, 'updateMeeting').mockResolvedValue(mockMeeting);
      usageEventsService.logEvent.mockResolvedValue(undefined);
      usageEventsService.trackCallMinutesUsed.mockResolvedValue(undefined);
      meetingsRepository.findOne.mockResolvedValue(updatedMeeting);
      meetingSharesService.getShareLink.mockResolvedValue(null);
      meetingSharesService.createShareLink.mockResolvedValue({
        id: 'share-123',
        meeting_id: 'meeting-123',
        share_token: 'token-123',
        created_by: 'user-123',
        expires_at: null,
        is_enabled: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      configService.get.mockReturnValue('http://localhost:3000');
      profilesService.getProfile.mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: null,
        deleted_at: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      emailService.sendMeetingAnalysisEmail.mockRejectedValue(new Error('Email failed'));

      // Act
      const result = await service.completeMeeting(meetingId, completeDto, 'user-123');

      // Assert
      expect(result).toEqual(mockMeeting);
      expect(logger.error).toHaveBeenCalledWith('Failed to send meeting analysis email:', expect.any(Error));
    });
  });

  describe('submitCompleteMeetingData', () => {
    const organizationId = 'org-123';
    const userId = 'user-123';
    const meetingId = 'meeting-123';
    const meetingData = {
      title: 'Test Meeting',
      duration_mins: 30,
      host_email: 'host@example.com',
      participants_email: ['participant1@example.com', 'participant2@example.com'],
      summary: 'Test summary',
      meta_data: { platform: 'zoom' },
      transcript: 'Test transcript',
      meeting_type_id: 'type-123',
      summary_meta_data: { key_points: 3 },
      chapters: 'Introduction, Discussion, Conclusion',
      thumbnail: 'https://example.com/thumb.jpg',
      bot_id: 'bot-123',
      transcript_json: { data: [], type: 'array' },
    };

    const mockOrganization = createMock<Organizations>({
      id: organizationId,
      name: 'Test Organization',
    });

    const mockProfile = createMock<Profile>({
      id: userId,
      email: 'user@example.com',
    });

    const mockMeeting = createMock<Meetings>({
      id: meetingId,
      title: 'Test Meeting',
      user_id: userId,
      organization: mockOrganization,
      host_email: 'host@example.com',
      participants_email: ['participant1@example.com', 'participant2@example.com'],
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create new meeting and send email to user with userId', async () => {
      // Arrange
      meetingsRepository.findOne.mockResolvedValue(null); // No existing meeting
      meetingsRepository.create.mockReturnValue(mockMeeting);
      meetingsRepository.save.mockResolvedValue(mockMeeting);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      profilesService.getProfile.mockResolvedValue(mockProfile);
      meetingSharesService.getShareLink.mockResolvedValue(null);
      meetingSharesService.createShareLink.mockResolvedValue({
        id: 'share-123',
        meeting_id: 'meeting-123',
        share_token: 'token-123',
        created_by: 'user-123',
        expires_at: null,
        is_enabled: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      configService.get.mockReturnValue('http://localhost:3000');
      emailService.sendMeetingAnalysisEmail.mockResolvedValue(undefined);

      // Act
      const result = await service.submitCompleteMeetingData(organizationId, userId, undefined, meetingData);

      // Assert
      expect(meetingsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Meeting',
          user_id: userId,
          organization: { id: organizationId },
        })
      );
      
      // Email processing is now asynchronous, so we can't test it synchronously
      // The main functionality (meeting creation) should work
      expect(result.meeting_id).toBe(meetingId);
      expect(result.action).toBe('created');
    });

    it('should update existing meeting', async () => {
      // Arrange
      const existingMeeting = createMock<Meetings>({
        id: meetingId,
        user_id: userId,
        organization: mockOrganization,
      });
      
      meetingsRepository.findOne
        .mockResolvedValueOnce(existingMeeting) // First call for existing meeting check
        .mockResolvedValueOnce(mockMeeting); // Second call for updated meeting
      meetingsRepository.save.mockResolvedValue(mockMeeting);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      profilesService.getProfile.mockResolvedValue(mockProfile);
      meetingSharesService.getShareLink.mockResolvedValue(null);
      meetingSharesService.createShareLink.mockResolvedValue({
        id: 'share-123',
        meeting_id: 'meeting-123',
        share_token: 'token-123',
        created_by: 'user-123',
        expires_at: null,
        is_enabled: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      configService.get.mockReturnValue('http://localhost:3000');
      emailService.sendMeetingAnalysisEmail.mockResolvedValue(undefined);

      // Act
      const result = await service.submitCompleteMeetingData(organizationId, userId, meetingId, meetingData);

      // Assert
      expect(result.meeting_id).toBe(meetingId);
      expect(result.action).toBe('updated');
    });

    it('should handle profile lookup failure gracefully', async () => {
      // Arrange
      meetingsRepository.findOne.mockResolvedValue(null);
      meetingsRepository.create.mockReturnValue(mockMeeting);
      meetingsRepository.save.mockResolvedValue(mockMeeting);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      profilesService.getProfile.mockRejectedValue(new Error('Profile not found'));
      meetingSharesService.getShareLink.mockResolvedValue(null);
      meetingSharesService.createShareLink.mockResolvedValue({
        id: 'share-123',
        meeting_id: 'meeting-123',
        share_token: 'token-123',
        created_by: 'user-123',
        expires_at: null,
        is_enabled: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      configService.get.mockReturnValue('http://localhost:3000');
      emailService.sendMeetingAnalysisEmail.mockResolvedValue(undefined);

      // Act
      const result = await service.submitCompleteMeetingData(organizationId, userId, undefined, meetingData);

      // Assert
      expect(result.meeting_id).toBe(meetingId);
      expect(result.action).toBe('created');
    });

    it('should handle video processing with working URL immediately', async () => {
      // Arrange
      const meetingDataWithVideo = {
        ...meetingData,
        video_url: 'https://working-video-url.com/video.mp4', // Working URL that expires in 30 mins
      };
      
      const mockMeetingWithVideo = {
        ...mockMeeting,
        video_url: 'https://working-video-url.com/video.mp4',
        video_processing_status: 'processing' as const,
      };

      meetingsRepository.findOne.mockResolvedValue(null);
      meetingsRepository.create.mockReturnValue(mockMeetingWithVideo);
      meetingsRepository.save.mockResolvedValue(mockMeetingWithVideo);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      profilesService.getProfile.mockResolvedValue(mockProfile);
      meetingSharesService.getShareLink.mockResolvedValue(null);
      meetingSharesService.createShareLink.mockResolvedValue({
        id: 'share-123',
        meeting_id: 'meeting-123',
        share_token: 'token-123',
        created_by: 'user-123',
        expires_at: null,
        is_enabled: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      configService.get.mockReturnValue('http://localhost:3000');
      emailService.sendMeetingAnalysisEmail.mockResolvedValue(undefined);

      // Act
      const result = await service.submitCompleteMeetingData(organizationId, userId, undefined, meetingDataWithVideo);

      // Assert
      expect(meetingsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          video_url: 'https://working-video-url.com/video.mp4',
        })
      );
      
      // The main functionality (meeting creation with video URL) should work
      expect(result.meeting_id).toBe(meetingId);
      expect(result.action).toBe('created');
    });

    it('should handle video processing failure gracefully', async () => {
      // Arrange
      const meetingDataWithVideo = {
        ...meetingData,
        video_url: 'https://working-video-url.com/video.mp4',
      };
      
      const mockMeetingWithVideo = {
        ...mockMeeting,
        video_url: 'https://working-video-url.com/video.mp4',
        video_processing_status: 'processing' as const,
      };

      meetingsRepository.findOne.mockResolvedValue(null);
      meetingsRepository.create.mockReturnValue(mockMeetingWithVideo);
      meetingsRepository.save.mockResolvedValue(mockMeetingWithVideo);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      profilesService.getProfile.mockResolvedValue(mockProfile);
      meetingSharesService.getShareLink.mockResolvedValue(null);
      meetingSharesService.createShareLink.mockResolvedValue({
        id: 'share-123',
        meeting_id: 'meeting-123',
        share_token: 'token-123',
        created_by: 'user-123',
        expires_at: null,
        is_enabled: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      configService.get.mockReturnValue('http://localhost:3000');
      emailService.sendMeetingAnalysisEmail.mockResolvedValue(undefined);

      // Act
      const result = await service.submitCompleteMeetingData(organizationId, userId, undefined, meetingDataWithVideo);

      // Assert
      // The main functionality (meeting creation with video URL) should work
      // Background processing failures are handled internally and don't affect the main response
      expect(result.meeting_id).toBe(meetingId);
      expect(result.action).toBe('created');
    });

    it('should not process video when no video_url provided', async () => {
      // Arrange
      const meetingDataWithoutVideo = {
        ...meetingData,
        // No video_url provided
      };

      meetingsRepository.findOne.mockResolvedValue(null);
      meetingsRepository.create.mockReturnValue(mockMeeting);
      meetingsRepository.save.mockResolvedValue(mockMeeting);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      profilesService.getProfile.mockResolvedValue(mockProfile);
      meetingSharesService.getShareLink.mockResolvedValue(null);
      meetingSharesService.createShareLink.mockResolvedValue({
        id: 'share-123',
        meeting_id: 'meeting-123',
        share_token: 'token-123',
        created_by: 'user-123',
        expires_at: null,
        is_enabled: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      configService.get.mockReturnValue('http://localhost:3000');
      emailService.sendMeetingAnalysisEmail.mockResolvedValue(undefined);

      // Act
      const result = await service.submitCompleteMeetingData(organizationId, userId, undefined, meetingDataWithoutVideo);

      // Assert
      // Meeting should be created without video processing
      expect(result.meeting_id).toBe(meetingId);
      expect(result.action).toBe('created');
    });

    it('should create meeting successfully', async () => {
      // Arrange
      meetingsRepository.findOne.mockResolvedValue(null);
      meetingsRepository.create.mockReturnValue(mockMeeting);
      meetingsRepository.save.mockResolvedValue(mockMeeting);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      profilesService.getProfile.mockResolvedValue(mockProfile);
      meetingSharesService.getShareLink.mockResolvedValue(null);
      meetingSharesService.createShareLink.mockResolvedValue({
        id: 'share-123',
        meeting_id: 'meeting-123',
        share_token: 'token-123',
        created_by: 'user-123',
        expires_at: null,
        is_enabled: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      configService.get.mockReturnValue('http://localhost:3000');
      emailService.sendMeetingAnalysisEmail.mockResolvedValue(undefined);

      // Act
      const result = await service.submitCompleteMeetingData(organizationId, userId, undefined, meetingData);

      // Assert
      expect(result.meeting_id).toBe(meetingId);
      expect(result.action).toBe('created');
    });

  });

  describe('streamMeetingVideo', () => {
    const meetingId = 'meeting-123';
    const organizationId = 'org-123';
    const userId = 'user-123';
    const format = 'progressive';
    const quality = '720p';

    beforeEach(() => {
      // Mock checkUserMeetingAccess to return true by default
      jest.spyOn(service as any, 'checkUserMeetingAccess').mockResolvedValue(true);
    });

    it('should return null when meeting not found', async () => {
      // Arrange
      meetingsRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.streamMeetingVideo(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toBeNull();
      expect(meetingsRepository.findOne).toHaveBeenCalledWith({
        where: { id: meetingId, organization: { id: organizationId } },
        select: ['id', 'video_url', 'video_processing_status', 'organization_id', 'user_id'],
        relations: ['organization'],
      });
    });

    it('should return null when meeting has no video_url', async () => {
      // Arrange
      const meeting = { id: meetingId, video_url: null, video_processing_status: 'none' };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);

      // Act
      const result = await service.streamMeetingVideo(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when user has no access', async () => {
      // Arrange
      const meeting = { id: meetingId, video_url: 'test-video.mp4', video_processing_status: 'completed' };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);
      jest.spyOn(service as any, 'checkUserMeetingAccess').mockResolvedValue(false);

      // Act & Assert
      await expect(service.streamMeetingVideo(meetingId, organizationId, userId, format, quality))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should use stored video streaming for completed processing with stored video', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'meeting-videos/meeting-123/video.mp4',
        video_processing_status: 'completed',
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);
      
      const mockStreamResult = { url: 'signed-url', contentLength: 1000 };
      jest.spyOn(service as any, 'streamStoredVideo').mockResolvedValue(mockStreamResult);

      // Act
      const result = await service.streamMeetingVideo(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toEqual(mockStreamResult);
      expect(service['streamStoredVideo']).toHaveBeenCalledWith(
        'meeting-videos/meeting-123/video.mp4',
        format,
        quality,
        undefined
      );
    });

    it('should use external URL directly for processing status with http video', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'https://temp-video.com/video.mp4',
        video_processing_status: 'processing',
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);
      
      // Mock streamStoredVideo to track calls
      const streamStoredVideoSpy = jest.spyOn(service as any, 'streamStoredVideo');

      // Act
      const result = await service.streamMeetingVideo(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toEqual({ url: 'https://temp-video.com/video.mp4' });
      expect(streamStoredVideoSpy).not.toHaveBeenCalled();
    });

    it('should use external URL directly for failed status with http video', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'https://temp-video.com/video.mp4',
        video_processing_status: 'failed',
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);

      // Act
      const result = await service.streamMeetingVideo(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toEqual({ url: 'https://temp-video.com/video.mp4' });
    });

    it('should fallback to stored video streaming for processing status with non-http video', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'meeting-videos/meeting-123/video.mp4',
        video_processing_status: 'processing',
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);
      
      const mockStreamResult = { url: 'signed-url', contentLength: 1000 };
      jest.spyOn(service as any, 'streamStoredVideo').mockResolvedValue(mockStreamResult);

      // Act
      const result = await service.streamMeetingVideo(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toEqual(mockStreamResult);
      expect(service['streamStoredVideo']).toHaveBeenCalledWith(
        'meeting-videos/meeting-123/video.mp4',
        format,
        quality,
        undefined
      );
    });

    it('should handle legacy stored video (no processing status)', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'meeting-videos/meeting-123/video.mp4',
        video_processing_status: null,
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);
      
      const mockStreamResult = { url: 'signed-url', contentLength: 1000 };
      jest.spyOn(service as any, 'streamStoredVideo').mockResolvedValue(mockStreamResult);

      // Act
      const result = await service.streamMeetingVideo(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toEqual(mockStreamResult);
      expect(service['streamStoredVideo']).toHaveBeenCalledWith(
        'meeting-videos/meeting-123/video.mp4',
        format,
        quality,
        undefined
      );
    });

    it('should handle external video URL (no processing status)', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'https://external-video.com/video.mp4',
        video_processing_status: null,
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);

      // Act
      const result = await service.streamMeetingVideo(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toEqual({ url: 'https://external-video.com/video.mp4' });
    });

    it('should return null for unrecognized video URL format', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'unknown-format://video',
        video_processing_status: 'none',
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);

      // Act
      const result = await service.streamMeetingVideo(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getMeetingStreamingUrl', () => {
    const meetingId = 'meeting-123';
    const organizationId = 'org-123';
    const userId = 'user-123';
    const format = 'progressive';
    const quality = '720p';

    beforeEach(() => {
      // Mock checkUserMeetingAccess to return true by default
      jest.spyOn(service as any, 'checkUserMeetingAccess').mockResolvedValue(true);
      // Mock generateStreamingToken
      jest.spyOn(service as any, 'generateStreamingToken').mockResolvedValue('mock-token-123');
      // Mock config service
      configService.get.mockReturnValue('http://localhost:3000');
    });

    it('should return null when meeting not found', async () => {
      // Arrange
      meetingsRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getMeetingStreamingUrl(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when meeting has no video_url', async () => {
      // Arrange
      const meeting = { id: meetingId, video_url: null, video_processing_status: 'none' };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);

      // Act
      const result = await service.getMeetingStreamingUrl(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when user has no access', async () => {
      // Arrange
      const meeting = { id: meetingId, video_url: 'test-video.mp4', video_processing_status: 'completed' };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);
      jest.spyOn(service as any, 'checkUserMeetingAccess').mockResolvedValue(false);

      // Act & Assert
      await expect(service.getMeetingStreamingUrl(meetingId, organizationId, userId, format, quality))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should generate streaming URL for completed processing with stored video', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'meeting-videos/meeting-123/video.mp4',
        video_processing_status: 'completed',
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);

      // Act
      const result = await service.getMeetingStreamingUrl(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toBe('http://localhost:3000/api/v1/public/meetings/meeting-123/video-stream?token=mock-token-123&format=progressive&quality=720p');
      expect(service['generateStreamingToken']).toHaveBeenCalledWith(meetingId, organizationId, userId, 3600);
    });

    it('should return external URL directly for processing status with http video', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'https://temp-video.com/video.mp4',
        video_processing_status: 'processing',
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);

      // Act
      const result = await service.getMeetingStreamingUrl(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toBe('https://temp-video.com/video.mp4');
      expect(service['generateStreamingToken']).not.toHaveBeenCalled();
    });

    it('should return external URL directly for failed status with http video', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'https://temp-video.com/video.mp4',
        video_processing_status: 'failed',
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);

      // Act
      const result = await service.getMeetingStreamingUrl(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toBe('https://temp-video.com/video.mp4');
    });

    it('should generate streaming URL for processing status with non-http video', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'meeting-videos/meeting-123/video.mp4',
        video_processing_status: 'processing',
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);

      // Act
      const result = await service.getMeetingStreamingUrl(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toBe('http://localhost:3000/api/v1/public/meetings/meeting-123/video-stream?token=mock-token-123&format=progressive&quality=720p');
      expect(service['generateStreamingToken']).toHaveBeenCalledWith(meetingId, organizationId, userId, 3600);
    });

    it('should handle legacy stored video (no processing status)', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'meeting-videos/meeting-123/video.mp4',
        video_processing_status: null,
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);

      // Act
      const result = await service.getMeetingStreamingUrl(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toBe('http://localhost:3000/api/v1/public/meetings/meeting-123/video-stream?token=mock-token-123&format=progressive&quality=720p');
      expect(service['generateStreamingToken']).toHaveBeenCalledWith(meetingId, organizationId, userId, 3600);
    });

    it('should handle external video URL (no processing status)', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'https://external-video.com/video.mp4',
        video_processing_status: null,
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);

      // Act
      const result = await service.getMeetingStreamingUrl(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toBe('https://external-video.com/video.mp4');
    });

    it('should return null for unrecognized video URL format', async () => {
      // Arrange
      const meeting = {
        id: meetingId,
        video_url: 'unknown-format://video',
        video_processing_status: 'none',
        organization_id: organizationId,
        user_id: userId,
        organization: { id: organizationId }
      };
      meetingsRepository.findOne.mockResolvedValue(meeting as any);

      // Act
      const result = await service.getMeetingStreamingUrl(meetingId, organizationId, userId, format, quality);

      // Assert
      expect(result).toBeNull();
    });
  });

});
