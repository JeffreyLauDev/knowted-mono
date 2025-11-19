import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Patch,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtOrApiKeyAuthGuard } from "../auth/guards/jwt-or-api-key-auth.guard";

import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ProfilesService } from "./profiles.service";

@ApiTags("Profiles")
@Controller("api/v1/profiles")
@UseGuards(JwtOrApiKeyAuthGuard)
@ApiBearerAuth()
export class ProfilesController {
  private readonly logger = new Logger(ProfilesController.name);

  constructor(private readonly profilesService: ProfilesService) {}

  @Get("me")
  @ApiOperation({
    summary: "Get current user profile",
    description: "Retrieve the current user's profile information",
  })
  @ApiResponse({
    status: 200,
    description: "Profile retrieved successfully",
    schema: {
      properties: {
        id: { type: "string", example: "123e4567-e89b-12d3-a456-426614174000" },
        first_name: { type: "string", example: "John" },
        last_name: { type: "string", example: "Doe" },
        email: { type: "string", example: "john.doe@example.com" },
        avatar_url: { type: "string", nullable: true },
        created_at: { type: "string", format: "date-time" },
        updated_at: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT token",
  })
  @ApiResponse({
    status: 404,
    description: "Profile not found",
  })
  async getProfile(@GetUser("sub") userId: string) {
    this.logger.debug(`Getting profile for user: ${userId}`);
    return this.profilesService.getProfile(userId);
  }

  @Patch("me")
  @ApiOperation({
    summary: "Update user profile",
    description: "Update the current user's first name and last name",
  })
  @ApiResponse({
    status: 200,
    description: "Profile updated successfully",
    schema: {
      properties: {
        id: { type: "string", example: "123e4567-e89b-12d3-a456-426614174000" },
        first_name: { type: "string", example: "John" },
        last_name: { type: "string", example: "Doe" },
        email: { type: "string", example: "john.doe@example.com" },
        avatar_url: { type: "string", nullable: true },
        created_at: { type: "string", format: "date-time" },
        updated_at: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT token",
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request - Invalid input data",
  })
  async updateProfile(
    @GetUser("sub") userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    this.logger.debug(`Updating profile for user: ${userId}`);
    return this.profilesService.updateProfile(userId, updateProfileDto);
  }

  @Delete("me")
  @ApiOperation({
    summary: "Delete user account",
    description:
      "Permanently delete the current user's account and all associated data",
  })
  @ApiResponse({
    status: 204,
    description: "Account deleted successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT token",
  })
  async deleteAccount(@GetUser("sub") userId: string) {
    this.logger.debug(`Deleting account for user: ${userId}`);
    return this.profilesService.deleteAccount(userId);
  }

  @Get("export")
  @ApiOperation({
    summary: "Export user data",
    description: "Export all user data in JSON format for GDPR compliance",
  })
  @ApiResponse({
    status: 200,
    description: "Data export completed successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT token",
  })
  async exportData(@GetUser("sub") userId: string) {
    this.logger.debug(`Exporting data for user: ${userId}`);
    return this.profilesService.exportUserData(userId);
  }
}
