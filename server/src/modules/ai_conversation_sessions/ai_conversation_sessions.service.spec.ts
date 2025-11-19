import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AiService } from '../ai/ai.service';
import { MessageContentDtoRole } from '../ai_conversation_histories/dto/message-content.dto';
import { AiConversationHistories } from '../ai_conversation_histories/entities/ai_conversation_histories.entity';
import { AiConversationSessionsService } from './ai_conversation_sessions.service';
import { AiConversationSessions } from './entities/ai_conversation_sessions.entity';

describe('AiConversationSessionsService', () => {
  let service: AiConversationSessionsService;
  let aiConversationSessionsRepository: jest.Mocked<Repository<AiConversationSessions>>;
  let aiConversationHistoriesRepository: jest.Mocked<Repository<AiConversationHistories>>;
  let aiService: jest.Mocked<AiService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiConversationSessionsService,
        {
          provide: getRepositoryToken(AiConversationSessions),
          useValue: createMock<Repository<AiConversationSessions>>(),
        },
        {
          provide: getRepositoryToken(AiConversationHistories),
          useValue: createMock<Repository<AiConversationHistories>>(),
        },
        {
          provide: AiService,
          useValue: createMock<AiService>(),
        },
      ],
    }).compile();

    service = module.get<AiConversationSessionsService>(AiConversationSessionsService);
    aiConversationSessionsRepository = module.get(getRepositoryToken(AiConversationSessions));
    aiConversationHistoriesRepository = module.get(getRepositoryToken(AiConversationHistories));
    aiService = module.get(AiService);
  });

  describe('verifySessionOwnership', () => {
    it('should return true when user owns session in their organization', async () => {
      // Arrange
      const sessionId = 'session-123';
      const userId = 'user-123';
      const organizationId = 'org-123';
      const mockSession = { id: sessionId, profile_id: userId, organization_id: organizationId };
      
      aiConversationSessionsRepository.findOne.mockResolvedValue(mockSession as any);

      // Act
      const result = await service.verifySessionOwnership(sessionId, userId, organizationId);

      // Assert
      expect(result).toBe(true);
      expect(aiConversationSessionsRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: sessionId,
          profile: { id: userId },
          organization: { id: organizationId },
        },
      });
    });

    it('should return false when user does not own session', async () => {
      // Arrange
      const sessionId = 'session-123';
      const userId = 'user-123';
      const organizationId = 'org-123';
      
      aiConversationSessionsRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.verifySessionOwnership(sessionId, userId, organizationId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when session does not exist', async () => {
      // Arrange
      const sessionId = 'non-existent-session';
      const userId = 'user-123';
      const organizationId = 'org-123';
      
      aiConversationSessionsRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.verifySessionOwnership(sessionId, userId, organizationId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when user tries to access session from different organization', async () => {
      // Arrange
      const sessionId = 'session-123';
      const userId = 'user-123';
      const organizationId = 'org-123';
      const wrongOrganizationId = 'org-456';
      
      aiConversationSessionsRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.verifySessionOwnership(sessionId, userId, wrongOrganizationId);

      // Assert
      expect(result).toBe(false);
      expect(aiConversationSessionsRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: sessionId,
          profile: { id: userId },
          organization: { id: wrongOrganizationId },
        },
      });
    });
  });

  describe('create', () => {
    it('should create session with AI-generated title and initial conversation history', async () => {
      // Arrange
      const params = {
        input: 'Hello, how can you help me?',
        organization_id: 'org-123',
        auth_user_id: 'user-123',
      };
      const generatedTitle = 'AI Generated Title';
      const mockSession = {
        id: 'session-123',
        title: generatedTitle,
        organization_id: params.organization_id,
        profile_id: params.auth_user_id,
        created_at: new Date(),
      };
      const mockHistory = {
        id: 1,
        session_id: mockSession.id,
        message: {
          role: MessageContentDtoRole.HUMAN,
          content: params.input,
          additional_kwargs: {},
          response_metadata: {},
        },
      };

      aiService.generateTitle.mockResolvedValue(generatedTitle);
      aiConversationSessionsRepository.create.mockReturnValue(mockSession as any);
      aiConversationSessionsRepository.save.mockResolvedValue(mockSession as any);
      aiConversationHistoriesRepository.save.mockResolvedValue(mockHistory as any);

      // Act
      const result = await service.create(params);

      // Assert
      expect(aiService.generateTitle).toHaveBeenCalledWith(
        params.input,
        params.organization_id,
        params.auth_user_id,
      );
      expect(aiConversationSessionsRepository.create).toHaveBeenCalledWith({
        title: generatedTitle,
        organization_id: params.organization_id,
        profile_id: params.auth_user_id,
      });
      expect(aiConversationSessionsRepository.save).toHaveBeenCalledWith(mockSession);
      expect(aiConversationHistoriesRepository.save).toHaveBeenCalledWith({
        message: {
          role: MessageContentDtoRole.HUMAN,
          content: params.input,
          additional_kwargs: {},
          response_metadata: {},
        },
        session_id: mockSession.id,
      });
      expect(result).toEqual({
        title: generatedTitle,
        id: mockSession.id,
        created_at: mockSession.created_at,
      });
    });

    it('should handle AI service failures gracefully', async () => {
      // Arrange
      const params = {
        input: 'Hello, how can you help me?',
        organization_id: 'org-123',
        auth_user_id: 'user-123',
      };
      const aiError = new Error('AI service unavailable');
      
      aiService.generateTitle.mockRejectedValue(aiError);

      // Act & Assert
      await expect(service.create(params)).rejects.toThrow('AI service unavailable');
      expect(aiService.generateTitle).toHaveBeenCalledWith(
        params.input,
        params.organization_id,
        params.auth_user_id,
      );
      expect(aiConversationSessionsRepository.create).not.toHaveBeenCalled();
    });

    it('should handle database save failures', async () => {
      // Arrange
      const params = {
        input: 'Hello, how can you help me?',
        organization_id: 'org-123',
        auth_user_id: 'user-123',
      };
      const generatedTitle = 'AI Generated Title';
      const mockSession = {
        id: 'session-123',
        title: generatedTitle,
        organization_id: params.organization_id,
        profile_id: params.auth_user_id,
        created_at: new Date(),
      };
      const dbError = new Error('Database connection failed');
      
      aiService.generateTitle.mockResolvedValue(generatedTitle);
      aiConversationSessionsRepository.create.mockReturnValue(mockSession as any);
      aiConversationSessionsRepository.save.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.create(params)).rejects.toThrow('Database connection failed');
      expect(aiService.generateTitle).toHaveBeenCalled();
      expect(aiConversationSessionsRepository.create).toHaveBeenCalled();
      expect(aiConversationHistoriesRepository.save).not.toHaveBeenCalled();
    });
  });
});
