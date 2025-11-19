import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { N8nService } from '../ai/n8n.service';
import { ApiKeyAuthGuard } from '../api-keys/guards/api-key-auth.guard';
import { MeetingTypeResponse } from '../meeting_types/entities/meeting_types.entity';
import { MeetingTypesService } from '../meeting_types/meeting_types.service';
import { Meetings } from './entities/meetings.entity';
import { ExternalMeetingsController } from './external-meetings.controller';
import { MeetingsService } from './meetings.service';

describe('ExternalMeetingsController', () => {
  let controller: ExternalMeetingsController;
  let meetingsService: jest.Mocked<MeetingsService>;
  let meetingTypesService: jest.Mocked<MeetingTypesService>;
  let n8nService: jest.Mocked<N8nService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExternalMeetingsController],
      providers: [
        {
          provide: MeetingsService,
          useValue: createMock<MeetingsService>(),
        },
        {
          provide: MeetingTypesService,
          useValue: createMock<MeetingTypesService>(),
        },
        {
          provide: N8nService,
          useValue: createMock<N8nService>(),
        },
        {
          provide: ApiKeyAuthGuard,
          useValue: createMock<ApiKeyAuthGuard>(),
        },
      ],
    })
      .overrideGuard(ApiKeyAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ExternalMeetingsController>(ExternalMeetingsController);
    meetingsService = module.get(MeetingsService);
    meetingTypesService = module.get(MeetingTypesService);
    n8nService = module.get(N8nService);
  });

  describe('getMeetingTypes', () => {
    it('should return meeting types for organization', async () => {
      // Arrange
      const mockOrg = { id: 'org-123' };
      const mockRequest = { organization: mockOrg } as any;
      const mockMeetingTypes: MeetingTypeResponse[] = [
        { id: 'type-1', name: 'Sales Call', description: 'Sales meetings' },
        { id: 'type-2', name: 'Support', description: 'Support meetings' },
      ];

      meetingTypesService.findAll = jest.fn().mockResolvedValue(mockMeetingTypes);

      // Act
      const result = await controller.getMeetingTypes(mockRequest);

      // Assert
      expect(result).toEqual(mockMeetingTypes);
      expect(meetingTypesService.findAll).toHaveBeenCalledWith({
        organization_id: 'org-123',
      });
    });
  });

  describe('getMeetings', () => {
    it('should return paginated meetings with default values', async () => {
      // Arrange
      const mockOrg = { id: 'org-123' };
      const mockRequest = { organization: mockOrg } as any;
      const mockMeetings: Meetings[] = [
        {
          id: 'meeting-1',
          title: 'Meeting 1',
          organization_id: 'org-123',
          analysed: true,
        } as Meetings,
      ];

      meetingsService.findAllExternal = jest.fn().mockResolvedValue({
        data: mockMeetings,
        total: 1,
        page: 0,
        limit: 5,
        totalPages: 1,
      });

      // Act
      const result = await controller.getMeetings(
        mockRequest,
        undefined, // meeting_id
        undefined, // meeting_type_id
        undefined, // user_id
        undefined, // participant_email
        undefined, // from_date
        undefined, // to_date
        undefined, // limit
        undefined, // page
        undefined, // order_by
        undefined, // order_direction
      );

      // Assert
      expect(result).toEqual({
        data: mockMeetings,
        total: 1,
        page: 0,
        limit: 5,
        totalPages: 1,
      });
      expect(meetingsService.findAllExternal).toHaveBeenCalledWith('org-123', {
        meeting_id: undefined,
        meeting_type_id: undefined,
        user_id: undefined,
        participant_email: undefined,
        from_date: undefined,
        to_date: undefined,
        limit: 5,
        page: 0,
        order_by: 'meeting_date',
        order_direction: 'DESC',
      });
    });

    it('should apply custom filters and pagination', async () => {
      // Arrange
      const mockOrg = { id: 'org-123' };
      const mockRequest = { organization: mockOrg } as any;
      const mockMeetings: Meetings[] = [] as Meetings[];

      meetingsService.findAllExternal = jest.fn().mockResolvedValue({
        data: mockMeetings,
        total: 50,
        page: 2,
        limit: 10,
        totalPages: 5,
      });

      // Act
      await controller.getMeetings(
        mockRequest,
        'meeting-123', // meeting_id
        'type-456', // meeting_type_id
        'user-789', // user_id
        'participant@example.com', // participant_email
        '2024-01-01', // from_date
        '2024-12-31', // to_date
        10, // limit
        2, // page
        'duration_mins', // order_by
        'ASC', // order_direction
      );

      // Assert
      expect(meetingsService.findAllExternal).toHaveBeenCalledWith('org-123', {
        meeting_id: 'meeting-123',
        meeting_type_id: 'type-456',
        user_id: 'user-789',
        participant_email: 'participant@example.com',
        from_date: '2024-01-01',
        to_date: '2024-12-31',
        limit: 10,
        page: 2,
        order_by: 'duration_mins',
        order_direction: 'ASC',
      });
    });
  });

  describe('queryAgent', () => {
    it('should generate a new session ID when not provided', async () => {
      // Arrange
      const mockOrg = { id: 'org-123', owner_id: 'owner-123' };
      const mockUser = { sub: 'user-123' };
      const mockRequest = { organization: mockOrg, user: mockUser } as any;

      n8nService.sendMessageToN8n = jest.fn().mockResolvedValue([
        { output: 'This is a test AI response' },
      ]);

      // Act
      const result = await controller.queryAgent(mockRequest, {
        text: 'What are the key decisions?',
      });

      // Assert
      expect(result).toHaveProperty('response');
      expect(result.response).toBe('This is a test AI response');
      expect(result).toHaveProperty('session_id');
      expect(result.session_id).toMatch(/^api_\d+_org-123$/);
      expect(n8nService.sendMessageToN8n).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'What are the key decisions?',
          organizationId: 'org-123',
          userId: 'user-123',
        }),
      );
    });

    it('should use provided session_id', async () => {
      // Arrange
      const mockOrg = { id: 'org-123', owner_id: 'owner-123' };
      const mockUser = { sub: 'user-123' };
      const mockRequest = { organization: mockOrg, user: mockUser } as any;
      const sessionId = 'api_custom_session';

      n8nService.sendMessageToN8n = jest.fn().mockResolvedValue([
        { output: 'Follow up response' },
      ]);

      // Act
      const result = await controller.queryAgent(mockRequest, {
        text: 'Follow up question',
        session_id: sessionId,
      });

      // Assert
      expect(result.session_id).toBe(sessionId);
      expect(result.response).toBe('Follow up response');
      expect(n8nService.sendMessageToN8n).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: sessionId,
          conversationId: sessionId,
        }),
      );
    });

    it('should use owner_id as fallback when user.sub is missing', async () => {
      // Arrange
      const mockOrg = { id: 'org-123', owner_id: 'owner-456' };
      const mockUser = {}; // No sub property
      const mockRequest = { organization: mockOrg, user: mockUser } as any;

      n8nService.sendMessageToN8n = jest.fn().mockResolvedValue([
        { output: 'Test response using owner ID' },
      ]);

      // Act
      const result = await controller.queryAgent(mockRequest, {
        text: 'Test question',
      });

      // Assert
      expect(result.response).toBe('Test response using owner ID');
      expect(n8nService.sendMessageToN8n).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'owner-456',
        }),
      );
    });
  });
});

