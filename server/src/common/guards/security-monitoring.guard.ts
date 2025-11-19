import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from "@nestjs/common";

import { EmailService } from "../../modules/email/email.service";

@Injectable()
export class SecurityMonitoringGuard implements CanActivate {
  private readonly logger = new Logger(SecurityMonitoringGuard.name);

  constructor(private emailService: EmailService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      this.checkUnusualActivity(user.id, request.url, request.ip, user.email);
    }

    return true;
  }

  private async checkUnusualActivity(
    userId: string,
    endpoint: string,
    ip: string,
    userEmail?: string,
  ) {
    try {
      const hour = new Date().getHours();

      // Check for unusual access times (outside 6 AM - 10 PM)
      if (hour < 6 || hour > 22) {
        this.logger.warn(
          `Unusual access pattern detected: User ${userId} accessing ${endpoint} at ${hour}:00 from ${ip}`,
        );

        await this.emailService.sendSecurityIncidentAlert({
          type: "unusual_access_pattern",
          severity: "low",
          details: `User ${userId} accessing ${endpoint} at unusual time (${hour}:00) from ${ip}`,
          ip: ip,
          userEmail: userEmail,
        });
      }

      // Check for suspicious endpoints
      const suspiciousEndpoints = [
        "/api/v1/payment",
        "/api/v1/organizations",
        "/api/v1/security",
      ];
      if (suspiciousEndpoints.some((ep) => endpoint.includes(ep))) {
        this.logger.log(
          `Sensitive endpoint accessed: User ${userId} accessing ${endpoint} from ${ip}`,
        );
      }
    } catch (error) {
      this.logger.error("Error in security monitoring:", error);
      // Don't throw error to avoid breaking the request
    }
  }
}
