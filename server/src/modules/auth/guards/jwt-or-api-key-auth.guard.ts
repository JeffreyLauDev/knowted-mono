import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ApiKeyAuthGuard } from "../../api-keys/guards/api-key-auth.guard";

/**
 * Combined guard that supports both JWT and API Key authentication.
 * Tries API Key first (for service-to-service calls), then falls back to JWT.
 */
@Injectable()
export class JwtOrApiKeyAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtOrApiKeyAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private apiKeyAuthGuard: ApiKeyAuthGuard,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug(
        `Skipping authentication for public endpoint: ${context.switchToHttp().getRequest().url}`,
      );
      return true;
    }

    const request = context.switchToHttp().getRequest();
    
    // Check if API key is present (for service-to-service calls)
    const apiKey = request.headers['x-api-key'] || 
                   request.headers['authorization']?.replace('Bearer ', '') ||
                   request.headers['api-key'];
    
    if (apiKey) {
      // Try API key authentication first
      this.logger.debug('API key detected, attempting API key authentication');
      const apiKeyResult = await this.apiKeyAuthGuard.canActivate(context);
      if (apiKeyResult) {
        this.logger.debug('API key authentication successful');
        return true;
      }
      // If API key auth fails, continue to JWT auth
      this.logger.debug('API key authentication failed, falling back to JWT');
    }

    // Fall back to JWT authentication
    this.logger.debug('Attempting JWT authentication');
    const jwtResult = super.canActivate(context);
    // Handle both Promise and Observable cases
    if (jwtResult instanceof Promise) {
      return jwtResult;
    }
    // If it's an Observable, convert to Promise (shouldn't happen with JWT but handle it)
    return Promise.resolve(true);
  }

  handleRequest<TUser = string>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    if (err || !user) {
      this.logger.error(
        `Authentication failed: ${err?.message || "No user found"}`,
      );
      throw new UnauthorizedException(
        "Invalid or missing authentication token",
      );
    }

    this.logger.debug(`Authentication successful for user: ${user}`);
    return user;
  }
}

