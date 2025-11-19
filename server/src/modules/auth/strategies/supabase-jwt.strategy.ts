import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { ExtractJwt, Strategy } from "passport-jwt";

interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(SupabaseJwtStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("SUPABASE_JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);

    if (!payload || !payload.sub || !payload.email) {
      this.logger.error(`Invalid token payload: ${JSON.stringify(payload)}`);
      throw new Error("Invalid token payload");
    }

    this.logger.debug(`JWT validation successful for user: ${payload.email}`);
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
