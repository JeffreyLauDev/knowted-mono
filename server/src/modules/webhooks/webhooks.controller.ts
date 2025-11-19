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

import { CreateWebhookDto, UpdateWebhookDto, WebhookResponseDto } from "./dto/webhook.dto";
import { WebhooksService } from "./webhooks.service";

@ApiTags("Webhooks")
@ApiBearerAuth("access-token")
@Controller("api/v1/organizations/:organizationId/webhooks")
@UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: "Create webhook" })
  @ApiBody({ type: CreateWebhookDto })
  @ApiResponse({ status: 201, description: "Webhook created successfully", type: WebhookResponseDto })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async create(
    @Param("organizationId") organizationId: string,
    @Body() createWebhookDto: CreateWebhookDto,
    @GetUser("sub") userId: string,
  ) {
    return this.webhooksService.create(organizationId, createWebhookDto);
  }

  @Get()
  @ApiOperation({ summary: "Get organization webhook" })
  @ApiResponse({ status: 200, description: "Webhook retrieved successfully", type: WebhookResponseDto })
  @ApiResponse({ status: 404, description: "Webhook not found" })
  async findOne(@Param("organizationId") organizationId: string) {
    return this.webhooksService.findByOrganization(organizationId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update webhook" })
  @ApiBody({ type: UpdateWebhookDto })
  @ApiResponse({ status: 200, description: "Webhook updated successfully", type: WebhookResponseDto })
  @ApiResponse({ status: 404, description: "Webhook not found" })
  async update(
    @Param("organizationId") organizationId: string,
    @Param("id") id: string,
    @Body() updateWebhookDto: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(id, updateWebhookDto);
  }

  @Patch(":id/toggle")
  @ApiOperation({ summary: "Toggle webhook active status" })
  @ApiResponse({ status: 200, description: "Webhook status toggled successfully", type: WebhookResponseDto })
  @ApiResponse({ status: 404, description: "Webhook not found" })
  async toggleActive(
    @Param("organizationId") organizationId: string,
    @Param("id") id: string,
  ) {
    return this.webhooksService.toggleActive(id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete webhook" })
  @ApiResponse({ status: 200, description: "Webhook deleted successfully" })
  @ApiResponse({ status: 404, description: "Webhook not found" })
  async delete(
    @Param("organizationId") organizationId: string,
    @Param("id") id: string,
  ) {
    await this.webhooksService.delete(id);
    return { message: "Webhook deleted successfully" };
  }
}
