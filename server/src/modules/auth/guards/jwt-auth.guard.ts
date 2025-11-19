import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
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
    this.logger.debug(
      `Attempting to authenticate request to: ${request.method} ${request.url}`,
    );
    this.logger.debug(
      `Auth header: ${request.headers.authorization?.substring(0, 20)}...`,
    );

    return super.canActivate(context);
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
