import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { Database } from "../../../supabase/types";
import { EmailService } from "../email/email.service";
import { ProfilesService } from "../profiles/profiles.service";

import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  private supabase: SupabaseClient<Database>;
  private readonly logger = new Logger(AuthService.name);
  private failedAttempts = new Map<
    string,
    { count: number; lastAttempt: Date; ip?: string }
  >();

  constructor(
    private configService: ConfigService,
    private profilesService: ProfilesService,
    private emailService: EmailService,
  ) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseKey = this.configService.get<string>("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error("Missing Supabase configuration");
      throw new Error("Missing Supabase configuration");
    }

    this.logger.debug(`Initializing Supabase client with URL: ${supabaseUrl}`);

    try {
      // Configure Supabase client for local development
      this.supabase = createClient<Database>(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        db: {
          schema: "public",
        },
        global: {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      });
      this.logger.log("Supabase client initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize Supabase client:", error);
      throw new Error("Failed to initialize Supabase client");
    }
  }

  async signUp(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        this.logger.error("Signup error:", error);
        throw new UnauthorizedException(error.message);
      }

      return data;
    } catch (error) {
      this.logger.error("Signup error:", error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Signup failed");
    }
  }

  async login(loginDto: LoginDto, ip?: string) {
    try {
      this.logger.debug(`Attempting login for user: ${loginDto.email}`);

      // First, try to authenticate with Supabase
      const { data: authData, error: authError } =
        await this.supabase.auth.signInWithPassword({
          email: loginDto.email,
          password: loginDto.password,
        });

      if (authError) {
        this.logger.error("Authentication error:", authError);
        // Track failed login attempt
        await this.trackFailedLogin(loginDto.email, authError.message, ip);
        throw new UnauthorizedException(
          authError.message || "Invalid credentials",
        );
      }

      if (!authData.user) {
        this.logger.error("No user data returned from authentication");
        await this.trackFailedLogin(loginDto.email, "User not found", ip);
        throw new UnauthorizedException("User not found");
      }

      // Clear failed attempts on successful login
      this.failedAttempts.delete(loginDto.email);

      // Get or create user profile
      const profile = await this.profilesService.getOrCreateProfile(
        authData.user.id,
        authData.user.email || loginDto.email,
      );

      return {
        access_token: authData.session.access_token,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          profile,
        },
      };
    } catch (error) {
      this.logger.error("Login error:", error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Authentication failed");
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        this.logger.error("Signout error:", error);
        throw new UnauthorizedException(error.message);
      }
    } catch (error) {
      this.logger.error("Signout error:", error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Signout failed");
    }
  }

  private async trackFailedLogin(
    email: string,
    errorMessage: string,
    ip?: string,
  ) {
    const key = email;
    const now = new Date();

    if (!this.failedAttempts.has(key)) {
      this.failedAttempts.set(key, { count: 0, lastAttempt: now, ip });
    }

    const attempts = this.failedAttempts.get(key);
    attempts.count++;
    attempts.lastAttempt = now;
    if (ip) {
      attempts.ip = ip;
    }

    this.logger.warn(
      `Failed login attempt ${attempts.count} for ${email} from ${ip || "unknown IP"}: ${errorMessage}`,
    );

    // Send security alert after 5 failed attempts
    if (attempts.count >= 5) {
      try {
        await this.emailService.sendSecurityIncidentAlert({
          type: "suspicious_login_activity",
          severity: "medium",
          details: `Multiple failed login attempts for ${email}. Error: ${errorMessage}`,
          affectedUsers: [email],
          ip: ip,
          userEmail: email,
        });

        this.logger.warn(
          `Security alert sent for suspicious login activity: ${email}`,
        );
      } catch (emailError) {
        this.logger.error(
          `Failed to send security alert for ${email}:`,
          emailError,
        );
      }
    }
  }
}
