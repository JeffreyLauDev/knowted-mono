import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { AiConversationSessions } from '../ai_conversation_sessions/entities/ai_conversation_sessions.entity';
import { AiConversationHistoriesService } from './ai_conversation_histories.service';
import { CreateAiConversationHistoriesDto } from './dto/create-ai_conversation_histories.dto';
import { MessageContentDtoRole } from './dto/message-content.dto';
import { AiConversationHistories } from './entities/ai_conversation_histories.entity';

describe('AiConversationHistoriesService', () => {
  let service: AiConversationHistoriesService;
  let aiConversationHistoriesRepository: jest.Mocked<Repository<AiConversationHistories>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiConversationHistoriesService,
        {
          provide: getRepositoryToken(AiConversationHistories),
          useValue: createMock<Repository<AiConversationHistories>>({
            manager: {
              createQueryBuilder: jest.fn(),
            },
            createQueryBuilder: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<AiConversationHistoriesService>(AiConversationHistoriesService);
    aiConversationHistoriesRepository = module.get(getRepositoryToken(AiConversationHistories));
  });

  describe('create', () => {
    it('should create history when user owns the session', async () => {
      // Arrange
      const createDto: CreateAiConversationHistoriesDto = {
        session_id: 'session-123',
        message: {
          role: MessageContentDtoRole.HUMAN,
          content: 'Hello',
          additional_kwargs: {},
          response_metadata: {},
        },
      };
      const userId = 'user-123';
      const organizationId = 'org-123';
      const mockSession = createMock<AiConversationSessions>({
        id: 'session-123',
        profile_id: userId,
        organization_id: organizationId,
      });
      const mockHistory = createMock<AiConversationHistories>({
        id: 1,
        ...createDto,
      });

      // Mock the session query (used in create method)
      const mockSessionQueryBuilder = createMock<SelectQueryBuilder<AiConversationSessions>>();
      mockSessionQueryBuilder.where.mockReturnThis();
      mockSessionQueryBuilder.andWhere.mockReturnThis();
      mockSessionQueryBuilder.getOne.mockResolvedValue(mockSession);
      
      (aiConversationHistoriesRepository.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockSessionQueryBuilder);
      
      aiConversationHistoriesRepository.create.mockReturnValue(mockHistory);
      aiConversationHistoriesRepository.save.mockResolvedValue(mockHistory);

      // Act
      const result = await service.create(createDto, userId, organizationId);

      // Assert
      expect(mockSessionQueryBuilder.where).toHaveBeenCalledWith('session.id = :sessionId::uuid', {
        sessionId: createDto.session_id,
      });
      expect(mockSessionQueryBuilder.andWhere).toHaveBeenCalledWith('session.profile_id = :userId', { userId });
      expect(mockSessionQueryBuilder.andWhere).toHaveBeenCalledWith('session.organization_id = :organizationId', { organizationId });
      expect(aiConversationHistoriesRepository.create).toHaveBeenCalledWith(createDto);
      expect(aiConversationHistoriesRepository.save).toHaveBeenCalledWith(mockHistory);
      expect(result).toEqual(mockHistory);
    });

    it('should throw error when user does not own the session', async () => {
      // Arrange
      const createDto: CreateAiConversationHistoriesDto = {
        session_id: 'session-123',
        message: {
          role: MessageContentDtoRole.HUMAN,
          content: 'Hello',
          additional_kwargs: {},
          response_metadata: {},
        },
      };
      const userId = 'user-123';
      const organizationId = 'org-123';

      // Mock the session query to return null (no session found)
      const mockSessionQueryBuilder = createMock<SelectQueryBuilder<AiConversationSessions>>();
      mockSessionQueryBuilder.where.mockReturnThis();
      mockSessionQueryBuilder.andWhere.mockReturnThis();
      mockSessionQueryBuilder.getOne.mockResolvedValue(null);
      
      (aiConversationHistoriesRepository.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockSessionQueryBuilder);

      // Act & Assert
      await expect(service.create(createDto, userId, organizationId)).rejects.toThrow(
        'Access denied: Session not found or user does not own this session',
      );
    });

    it('should throw error when session does not exist', async () => {
      // Arrange
      const createDto: CreateAiConversationHistoriesDto = {
        session_id: 'non-existent-session',
        message: {
          role: MessageContentDtoRole.HUMAN,
          content: 'Hello',
          additional_kwargs: {},
          response_metadata: {},
        },
      };
      const userId = 'user-123';
      const organizationId = 'org-123';

      // Mock the session query to return null (no session found)
      const mockSessionQueryBuilder = createMock<SelectQueryBuilder<AiConversationSessions>>();
      mockSessionQueryBuilder.where.mockReturnThis();
      mockSessionQueryBuilder.andWhere.mockReturnThis();
      mockSessionQueryBuilder.getOne.mockResolvedValue(null);
      
      (aiConversationHistoriesRepository.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockSessionQueryBuilder);

      // Act & Assert
      await expect(service.create(createDto, userId, organizationId)).rejects.toThrow(
        'Access denied: Session not found or user does not own this session',
      );
    });

    it('should throw error when user tries to access session from different organization', async () => {
      // Arrange
      const createDto: CreateAiConversationHistoriesDto = {
        session_id: 'session-123',
        message: {
          role: MessageContentDtoRole.HUMAN,
          content: 'Hello',
          additional_kwargs: {},
          response_metadata: {},
        },
      };
      const userId = 'user-123';
      const organizationId = 'org-123';
      const wrongOrganizationId = 'org-456';

      // Mock the session query to return null (no session found for wrong org)
      const mockSessionQueryBuilder = createMock<SelectQueryBuilder<AiConversationSessions>>();
      mockSessionQueryBuilder.where.mockReturnThis();
      mockSessionQueryBuilder.andWhere.mockReturnThis();
      mockSessionQueryBuilder.getOne.mockResolvedValue(null);
      
      (aiConversationHistoriesRepository.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockSessionQueryBuilder);

      // Act & Assert
      await expect(service.create(createDto, userId, wrongOrganizationId)).rejects.toThrow(
        'Access denied: Session not found or user does not own this session',
      );
    });

    it('should throw error when user tries to access another user session from same organization', async () => {
      // Arrange
      const createDto: CreateAiConversationHistoriesDto = {
        session_id: 'session-123',
        message: {
          role: MessageContentDtoRole.HUMAN,
          content: 'Hello',
          additional_kwargs: {},
          response_metadata: {},
        },
      };
      const userId = 'user-123';
      const otherUserId = 'user-456'; // Different user
      const organizationId = 'org-123';

      // Mock the session query to return null (no session found for different user)
      const mockSessionQueryBuilder = createMock<SelectQueryBuilder<AiConversationSessions>>();
      mockSessionQueryBuilder.where.mockReturnThis();
      mockSessionQueryBuilder.andWhere.mockReturnThis();
      mockSessionQueryBuilder.getOne.mockResolvedValue(null);
      
      (aiConversationHistoriesRepository.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockSessionQueryBuilder);

      // Act & Assert
      await expect(service.create(createDto, otherUserId, organizationId)).rejects.toThrow(
        'Access denied: Session not found or user does not own this session',
      );
    });
  });

  describe('findBySessionId', () => {
    it('should return histories for valid session ownership', async () => {
      // Arrange
      const sessionId = 'session-123';
      const userId = 'user-123';
      const organizationId = 'org-123';
      const mockHistories = [
        createMock<AiConversationHistories>({
          id: 1,
          session_id: sessionId,
          message: { role: MessageContentDtoRole.HUMAN, content: 'Hello' },
        }),
        createMock<AiConversationHistories>({
          id: 2,
          session_id: sessionId,
          message: { role: MessageContentDtoRole.AI, content: 'Hi there' },
        }),
      ];

      // Mock the history query (used in findBySessionId method)
      const mockHistoryQueryBuilder = createMock<SelectQueryBuilder<AiConversationHistories>>();
      mockHistoryQueryBuilder.innerJoin.mockReturnThis();
      mockHistoryQueryBuilder.where.mockReturnThis();
      mockHistoryQueryBuilder.andWhere.mockReturnThis();
      mockHistoryQueryBuilder.select.mockReturnThis();
      mockHistoryQueryBuilder.getRawMany.mockResolvedValue(mockHistories);
      
      (aiConversationHistoriesRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockHistoryQueryBuilder);

      // Act
      const result = await service.findBySessionId(sessionId, userId, organizationId);

      // Assert
      expect(aiConversationHistoriesRepository.createQueryBuilder).toHaveBeenCalledWith('history');
      expect(mockHistoryQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'ai_conversation_sessions',
        'session',
        'session.id = history.session_id::uuid',
      );
      expect(mockHistoryQueryBuilder.where).toHaveBeenCalledWith('history.session_id = :sessionId', { sessionId });
      expect(mockHistoryQueryBuilder.andWhere).toHaveBeenCalledWith('session.profile_id = :userId', { userId });
      expect(mockHistoryQueryBuilder.andWhere).toHaveBeenCalledWith('session.organization_id = :organizationId', { organizationId });
      expect(mockHistoryQueryBuilder.select).toHaveBeenCalledWith('history.*');
      expect(result).toEqual(mockHistories);
    });

    it('should return empty array for invalid session ownership', async () => {
      // Arrange
      const sessionId = 'session-123';
      const userId = 'user-123';
      const organizationId = 'org-123';

      // Mock the history query to return empty array
      const mockHistoryQueryBuilder = createMock<SelectQueryBuilder<AiConversationHistories>>();
      mockHistoryQueryBuilder.innerJoin.mockReturnThis();
      mockHistoryQueryBuilder.where.mockReturnThis();
      mockHistoryQueryBuilder.andWhere.mockReturnThis();
      mockHistoryQueryBuilder.select.mockReturnThis();
      mockHistoryQueryBuilder.getRawMany.mockResolvedValue([]);
      
      (aiConversationHistoriesRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockHistoryQueryBuilder);

      // Act
      const result = await service.findBySessionId(sessionId, userId, organizationId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent session', async () => {
      // Arrange
      const sessionId = 'non-existent-session';
      const userId = 'user-123';
      const organizationId = 'org-123';

      // Mock the history query to return empty array
      const mockHistoryQueryBuilder = createMock<SelectQueryBuilder<AiConversationHistories>>();
      mockHistoryQueryBuilder.innerJoin.mockReturnThis();
      mockHistoryQueryBuilder.where.mockReturnThis();
      mockHistoryQueryBuilder.andWhere.mockReturnThis();
      mockHistoryQueryBuilder.select.mockReturnThis();
      mockHistoryQueryBuilder.getRawMany.mockResolvedValue([]);
      
      (aiConversationHistoriesRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockHistoryQueryBuilder);

      // Act
      const result = await service.findBySessionId(sessionId, userId, organizationId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when user tries to access another user session from same organization', async () => {
      // Arrange
      const sessionId = 'session-123';
      const userId = 'user-123';
      const otherUserId = 'user-456'; // Different user
      const organizationId = 'org-123';

      // Mock the history query to return empty array (no access for different user)
      const mockHistoryQueryBuilder = createMock<SelectQueryBuilder<AiConversationHistories>>();
      mockHistoryQueryBuilder.innerJoin.mockReturnThis();
      mockHistoryQueryBuilder.where.mockReturnThis();
      mockHistoryQueryBuilder.andWhere.mockReturnThis();
      mockHistoryQueryBuilder.select.mockReturnThis();
      mockHistoryQueryBuilder.getRawMany.mockResolvedValue([]);
      
      (aiConversationHistoriesRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockHistoryQueryBuilder);

      // Act
      const result = await service.findBySessionId(sessionId, otherUserId, organizationId);

      // Assert
      expect(result).toEqual([]);
    });
  });
});