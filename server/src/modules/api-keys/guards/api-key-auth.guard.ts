import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { OrganizationsService } from "../../organizations/organizations.service";
import { ApiKey } from "../entities/api-key.entity";

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(
    @InjectRepository(ApiKey)
    private apiKeysRepository: Repository<ApiKey>,
    private configService: ConfigService,
    private organizationsService: OrganizationsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Try to get API key from different headers
    const apiKey = request.headers['x-api-key'] || 
                   request.headers['authorization']?.replace('Bearer ', '') ||
                   request.headers['api-key'];

    if (!apiKey) {
      this.logger.debug('No API key provided in request headers');
      return false;
    }

    // Check for internal service secret (for AI agent internal communication)
    const internalServiceSecret = this.configService.get<string>('INTERNAL_SERVICE_SECRET');
    if (internalServiceSecret && apiKey === internalServiceSecret) {
      this.logger.log('Internal service secret validated');
      
      // For internal service calls, require organization_id and user_id headers
      // This ensures proper data isolation and access control
      const organizationId = request.headers['x-organization-id'] || 
                            request.query.organization_id ||
                            request.query.organizationId;
      const userId = request.headers['x-user-id'] || 
                    request.query.user_id ||
                    request.query.userId;
      
      // CRITICAL: Require both organization_id and user_id
      if (!organizationId || !userId) {
        this.logger.error('Internal service call missing organization_id or user_id');
        throw new UnauthorizedException(
          'Internal service calls require organization_id and user_id headers',
        );
      }
      
      // CRITICAL: Validate user belongs to organization (defense in depth)
      try {
        const userOrg = await this.organizationsService.getUserOrganizationWithTeam(
          userId,
          organizationId,
        );
        if (!userOrg) {
          this.logger.error(
            `User ${userId} does not belong to organization ${organizationId}`,
          );
          throw new ForbiddenException(
            'User does not belong to the specified organization',
          );
        }
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        this.logger.error(`Error validating user-organization: ${error.message}`);
        throw new ForbiddenException('Failed to validate user-organization membership');
      }
      
      // Set organization and user context for access control
      request.isInternalService = true;
      request.user = { sub: userId };
      
      // Store organization_id for guards to use
      if (organizationId) {
        request.query = request.query || {};
        request.query.organization_id = organizationId;
        // Don't set organizationId (camelCase) - it causes validation errors with forbidNonWhitelisted
      }
      
      this.logger.log(`Internal service call validated - org: ${organizationId}, user: ${userId}`);
      return true;
    }

    try {
      const key = await this.apiKeysRepository.findOne({
        where: { key: apiKey, is_active: true },
        relations: ['organization'],
      });

      if (!key) {
        this.logger.warn(`Invalid API key: ${apiKey.substring(0, 8)}...`);
        return false;
      }

      // Add organization context to request
      request.organization = key.organization;
      request.apiKey = key;
      request.user = { sub: key.organization.owner_id }; // Set user context for compatibility
      
      this.logger.log(`API key validated for organization: ${key.organization_id}`);
      return true;
    } catch (error) {
      this.logger.error(`Error validating API key: ${error.message}`);
      return false;
    }
  }
}
