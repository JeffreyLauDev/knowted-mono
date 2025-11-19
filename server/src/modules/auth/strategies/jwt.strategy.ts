import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { ExtractJwt, Strategy } from "passport-jwt";

interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("jwt.secret"),
    });
    this.logger.debug(
      `JWT Strategy initialized with secret: ${configService.get("jwt.secret")?.substring(0, 5)}...`,
    );
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);

    if (!payload || !payload.sub || !payload.email) {
      this.logger.error(`Invalid token payload: ${JSON.stringify(payload)}`);
      throw new UnauthorizedException("Invalid token payload");
    }

    this.logger.debug(`JWT validation successful for user: ${payload.email}`);
    return payload;
  }
}
