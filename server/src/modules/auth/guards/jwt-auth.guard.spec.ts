import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard - Feature: JWT Authentication and Authorization', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  // Test data builders for different request scenarios
  const createPublicRequest = (url: string = '/api/public') => ({
    url,
    method: 'GET',
    headers: { authorization: 'Bearer token' },
  });

  const createProtectedRequest = (url: string = '/api/protected', authHeader?: string) => ({
    url,
    method: 'POST',
    headers: { authorization: authHeader || 'Bearer valid-token-12345' },
  });

  const createMockContext = (request: any) => {
    const mockContext = createMock<ExecutionContext>();
    mockContext.switchToHttp.mockReturnValue({
      getRequest: () => request,
    } as any);
    return mockContext;
  };

  const createMockUser = (id: string = 'user-123', email: string = 'test@example.com') => ({
    sub: id,
    email,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: createMock<Reflector>(),
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);
  });

  describe('Feature: Public Endpoint Access', () => {
    it('should allow access to public endpoints without authentication', () => {
      // Given: A public endpoint that doesn't require authentication
      const mockContext = createMockContext(createPublicRequest());
      reflector.getAllAndOverride.mockReturnValue(true);

      // When: Checking access to the public endpoint
      const result = guard.canActivate(mockContext);

      // Then: Access should be granted without JWT validation
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('should log debug information when skipping authentication for public endpoints', () => {
      // Given: A public endpoint with debug logging enabled
      const mockContext = createMockContext(createPublicRequest('/api/auth/login'));
      reflector.getAllAndOverride.mockReturnValue(true);
      const loggerSpy = jest.spyOn(guard['logger'], 'debug');

      // When: Checking access to the public endpoint
      guard.canActivate(mockContext);

      // Then: Should log that authentication is being skipped
      expect(loggerSpy).toHaveBeenCalledWith(
        'Skipping authentication for public endpoint: /api/auth/login',
      );
    });
  });

  describe('Feature: Protected Endpoint Authentication', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should authenticate users with valid JWT tokens for protected endpoints', () => {
      // Given: A protected endpoint with a valid JWT token
      const mockContext = createMockContext(createProtectedRequest());
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockReturnValue(true);

      // When: Checking access to the protected endpoint
      const result = guard.canActivate(mockContext);

      // Then: Should delegate to parent authentication logic
      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockContext);
    });

    it('should log authentication attempts for protected endpoints', () => {
      // Given: A protected endpoint with authentication logging
      const mockContext = createMockContext(createProtectedRequest('/api/users/profile', 'Bearer token-abc123'));
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockReturnValue(true);
      const loggerSpy = jest.spyOn(guard['logger'], 'debug');

      // When: Checking access to the protected endpoint
      guard.canActivate(mockContext);

      // Then: Should log authentication attempt details
      expect(loggerSpy).toHaveBeenCalledWith(
        'Attempting to authenticate request to: POST /api/users/profile',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'Auth header: Bearer token-abc123...',
      );
    });

    it('should deny access when JWT authentication fails', () => {
      // Given: A protected endpoint with invalid authentication
      const mockContext = createMockContext(createProtectedRequest());
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockReturnValue(false);

      // When: Checking access to the protected endpoint
      const result = guard.canActivate(mockContext);

      // Then: Access should be denied
      expect(result).toBe(false);
    });
  });

  describe('Feature: User Authentication Result Handling', () => {
    const createMockContextForUser = (request: any) => {
      const mockContext = createMock<ExecutionContext>();
      mockContext.switchToHttp.mockReturnValue({
        getRequest: () => request,
      } as any);
      return mockContext;
    };

    it('should return authenticated user when JWT validation succeeds', () => {
      // Given: A successful JWT authentication with user data
      const mockUser = createMockUser('user-456', 'john@example.com');
      const mockContext = createMockContextForUser({ url: '/api/protected' });
      const loggerSpy = jest.spyOn(guard['logger'], 'debug');

      // When: Processing the authentication result
      const result = guard.handleRequest(null, mockUser, null, mockContext);

      // Then: Should return the authenticated user
      expect(result).toEqual(mockUser);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Authentication successful for user: [object Object]',
      );
    });

    it('should support different user types (string, object, etc.)', () => {
      // Given: A string-based user ID from JWT
      const stringUserId = 'user-string-123';
      const mockContext = createMockContextForUser({ url: '/api/protected' });

      // When: Processing the authentication result
      const result = guard.handleRequest<string>(null, stringUserId, null, mockContext);

      // Then: Should return the user with correct type
      expect(result).toBe(stringUserId);
      expect(typeof result).toBe('string');
    });
  });

  describe('Feature: Authentication Error Handling', () => {
    const createMockContextForError = (request: any) => {
      const mockContext = createMock<ExecutionContext>();
      mockContext.switchToHttp.mockReturnValue({
        getRequest: () => request,
      } as any);
      return mockContext;
    };

    it('should reject access when no user is found in JWT', () => {
      // Given: JWT validation succeeds but no user data is returned
      const mockContext = createMockContextForError({ url: '/api/protected' });
      const loggerSpy = jest.spyOn(guard['logger'], 'error');

      // When: Processing authentication result with no user
      // Then: Should throw UnauthorizedException
      expect(() => {
        guard.handleRequest(null, null, null, mockContext);
      }).toThrow(UnauthorizedException);

      expect(() => {
        guard.handleRequest(null, null, null, mockContext);
      }).toThrow('Invalid or missing authentication token');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Authentication failed: No user found',
      );
    });

    it('should reject access when JWT validation fails with specific error', () => {
      // Given: JWT validation fails with a specific error (e.g., token expired)
      const mockContext = createMockContextForError({ url: '/api/protected' });
      const tokenError = new Error('Token expired');
      const loggerSpy = jest.spyOn(guard['logger'], 'error');

      // When: Processing authentication result with error
      // Then: Should throw UnauthorizedException with generic message
      expect(() => {
        guard.handleRequest(tokenError, null, null, mockContext);
      }).toThrow(UnauthorizedException);

      expect(() => {
        guard.handleRequest(tokenError, null, null, mockContext);
      }).toThrow('Invalid or missing authentication token');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Authentication failed: Token expired',
      );
    });

    it('should handle authentication errors without specific error messages', () => {
      // Given: JWT validation fails with an error that has no message
      const mockContext = createMockContextForError({ url: '/api/protected' });
      const errorWithoutMessage = { message: undefined };
      const loggerSpy = jest.spyOn(guard['logger'], 'error');

      // When: Processing authentication result with error
      // Then: Should throw UnauthorizedException and log generic error
      expect(() => {
        guard.handleRequest(errorWithoutMessage, null, null, mockContext);
      }).toThrow(UnauthorizedException);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Authentication failed: No user found',
      );
    });
  });

  describe('Feature: Complete Authentication Flows', () => {
    it('should handle end-to-end authentication flow for public endpoints', () => {
      // Given: A complete request to a public endpoint
      const mockContext = createMockContext(createPublicRequest('/api/health'));
      reflector.getAllAndOverride.mockReturnValue(true);

      // When: Processing the complete authentication flow
      const result = guard.canActivate(mockContext);

      // Then: Should allow access without any JWT validation
      expect(result).toBe(true);
    });

    it('should handle end-to-end authentication flow for protected endpoints with valid token', () => {
      // Given: A complete request to a protected endpoint with valid JWT
      const mockContext = createMockContext(createProtectedRequest('/api/dashboard'));
      reflector.getAllAndOverride.mockReturnValue(false);
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockReturnValue(true);

      // When: Processing the complete authentication flow
      const result = guard.canActivate(mockContext);

      // Then: Should authenticate and allow access
      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockContext);
    });

    it('should handle end-to-end authentication flow for protected endpoints with invalid token', () => {
      // Given: A complete request to a protected endpoint with invalid JWT
      const mockContext = createMockContext(createProtectedRequest('/api/dashboard', 'Bearer invalid-token'));
      reflector.getAllAndOverride.mockReturnValue(false);
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockReturnValue(false);

      // When: Processing the complete authentication flow
      const result = guard.canActivate(mockContext);

      // Then: Should deny access due to invalid authentication
      expect(result).toBe(false);
    });
  });
});
