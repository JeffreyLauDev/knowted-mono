import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { createClient } from "@supabase/supabase-js";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy) {
  private supabase;

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: async (request, token, done) => {
        try {
          // Initialize Supabase client
          this.supabase = createClient(
            this.configService.get<string>("SUPABASE_URL"),
            this.configService.get<string>("SUPABASE_SERVICE_KEY"),
          );

          // Get the JWT secret from Supabase
          const {
            data: { jwt_secret },
            error,
          } = await this.supabase
            .from("jwt_secrets")
            .select("jwt_secret")
            .single();

          if (error) throw error;
          return done(null, jwt_secret);
        } catch (error) {
          return done(error, null);
        }
      },
    });
  }

  async validate(payload: Record<string, unknown>): Promise<string> {
    return payload.sub as string;
  }
}
