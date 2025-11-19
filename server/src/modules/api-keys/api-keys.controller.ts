import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";

import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationMembershipGuard } from "../organizations/guards/organization-membership.guard";
import { PermissionGuard } from "../permissions/guards/permission.guard";

import { ApiKeysService } from "./api-keys.service";
import { ApiKeyResponseDto, CreateApiKeyDto, UpdateApiKeyDto } from "./dto/api-key.dto";

@ApiTags("API Keys")
@ApiBearerAuth("access-token")
@Controller("api/v1/organizations/:organizationId/api-keys")
@UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: "Create API key" })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiResponse({ status: 201, description: "API key created successfully", type: ApiKeyResponseDto })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async create(
    @Param("organizationId") organizationId: string,
    @Body() createApiKeyDto: CreateApiKeyDto,
    @GetUser("sub") userId: string,
  ) {
    return this.apiKeysService.create(organizationId, createApiKeyDto);
  }

  @Get()
  @ApiOperation({ summary: "Get organization API keys" })
  @ApiResponse({ status: 200, description: "API keys retrieved successfully", type: [ApiKeyResponseDto] })
  async findAll(@Param("organizationId") organizationId: string) {
    return this.apiKeysService.findByOrganization(organizationId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get API key by ID" })
  @ApiResponse({ status: 200, description: "API key retrieved successfully", type: ApiKeyResponseDto })
  @ApiResponse({ status: 404, description: "API key not found" })
  async findOne(
    @Param("organizationId") organizationId: string,
    @Param("id") id: string,
  ) {
    return this.apiKeysService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update API key" })
  @ApiBody({ type: UpdateApiKeyDto })
  @ApiResponse({ status: 200, description: "API key updated successfully", type: ApiKeyResponseDto })
  @ApiResponse({ status: 404, description: "API key not found" })
  async update(
    @Param("organizationId") organizationId: string,
    @Param("id") id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
  ) {
    return this.apiKeysService.update(id, updateApiKeyDto);
  }

  @Patch(":id/toggle")
  @ApiOperation({ summary: "Toggle API key active status" })
  @ApiResponse({ status: 200, description: "API key status toggled successfully", type: ApiKeyResponseDto })
  @ApiResponse({ status: 404, description: "API key not found" })
  async toggleActive(
    @Param("organizationId") organizationId: string,
    @Param("id") id: string,
  ) {
    return this.apiKeysService.toggleActive(id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete API key" })
  @ApiResponse({ status: 200, description: "API key deleted successfully" })
  @ApiResponse({ status: 404, description: "API key not found" })
  async delete(
    @Param("organizationId") organizationId: string,
    @Param("id") id: string,
  ) {
    await this.apiKeysService.delete(id);
    return { message: "API key deleted successfully" };
  }
}
