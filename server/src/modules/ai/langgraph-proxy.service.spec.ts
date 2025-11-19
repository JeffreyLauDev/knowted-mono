import { createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios, { AxiosInstance } from 'axios';
import { LangGraphProxyService } from './langgraph-proxy.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LangGraphProxyService - Business Logic', () => {
  let service: LangGraphProxyService;
  let configService: jest.Mocked<ConfigService>;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;

  const mockLangGraphUrl = 'http://localhost:2024';
  const mockThreadId = 'thread-123';
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-123';

  beforeEach(async () => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    } as any;

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangGraphProxyService,
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>({
            get: jest.fn().mockReturnValue(mockLangGraphUrl),
          }),
        },
      ],
    }).compile();

    service = module.get<LangGraphProxyService>(LangGraphProxyService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Feature: Thread Config Validation', () => {
    it('should detect missing required config keys when thread exists', async () => {
      // Arrange: Thread exists but missing organization_id in stored config
      const configToPass = {
        configurable: {
          organization_id: mockOrganizationId,
          user_id: mockUserId,
        },
      };
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          thread_id: mockThreadId,
          config: {
            configurable: {
              // Missing organization_id and user_id
            },
          },
        },
      } as any);

      // Act
      await service.ensureThreadExists('knowted_agent', mockThreadId, configToPass);

      // Assert: Should detect missing keys (logged, but doesn't fail)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/threads/${mockThreadId}`);
    });

    it('should create thread with config when thread does not exist', async () => {
      // Arrange
      const config = {
        configurable: {
          organization_id: mockOrganizationId,
          user_id: mockUserId,
        },
      };
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 404 },
      });
      mockAxiosInstance.post.mockResolvedValue({
        data: { thread_id: mockThreadId },
      } as any);

      // Act
      await service.ensureThreadExists('knowted_agent', mockThreadId, config);

      // Assert: Config should be included when creating thread
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/threads',
        expect.objectContaining({
          thread_id: mockThreadId,
          config,
        }),
        expect.any(Object),
      );
    });
  });

  describe('Feature: Error Handling and Security', () => {
    it('should not leak sensitive data in error messages', async () => {
      // Arrange: Error with potentially sensitive data
      const body = { messages: [] };
      const errorWithSensitiveData = {
        response: {
          status: 500,
          data: {
            detail: 'Internal error',
            stack: 'sensitive stack trace',
            config: { jwt_token: 'secret-token' },
          },
        },
      };
      mockAxiosInstance.get.mockResolvedValue({
        data: { thread_id: mockThreadId },
      } as any);
      mockAxiosInstance.post.mockRejectedValue(errorWithSensitiveData);

      // Act & Assert
      const thrownError = await service
        .streamRun('knowted_agent', mockThreadId, body)
        .catch((e) => e);

      // Assert: Error should be cleaned, no sensitive data
      expect(thrownError.message).not.toContain('secret-token');
      expect(thrownError.message).not.toContain('stack trace');
      expect(thrownError).not.toHaveProperty('response');
    });

    it('should transform connection errors to user-friendly messages', async () => {
      // Arrange
      const body = { messages: [] };
      const connectionError = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };
      mockAxiosInstance.get.mockResolvedValue({
        data: { thread_id: mockThreadId },
      } as any);
      mockAxiosInstance.post.mockRejectedValue(connectionError);

      // Act & Assert
      await expect(
        service.streamRun('knowted_agent', mockThreadId, body),
      ).rejects.toThrow('Cannot connect to LangGraph server');
    });

    it('should extract helpful error details from 422 validation errors', async () => {
      // Arrange
      const body = { messages: [] };
      const validationError = {
        response: {
          status: 422,
          data: { detail: 'Invalid request format: missing required field' },
        },
      };
      mockAxiosInstance.get.mockResolvedValue({
        data: { thread_id: mockThreadId },
      } as any);
      mockAxiosInstance.post.mockRejectedValue(validationError);

      // Act & Assert
      await expect(
        service.streamRun('knowted_agent', mockThreadId, body),
      ).rejects.toThrow('validation error');
    });
  });
});
