import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { AiConversationSessionsService } from "./ai_conversation_sessions.service";
import { AiConversationSessionResponseDto } from "./dto/ai-conversation-session-response.dto";
import { CreateAiConversationSessionsDto } from "./dto/create-ai_conversation_sessions.dto";
import { UpdateAiConversationSessionsDto } from "./dto/update-ai_conversation_sessions.dto";

@ApiTags("Conversation Sessions")
@ApiBearerAuth("access-token")
@Controller("api/v1/ai-conversation-sessions")
@UseGuards(JwtAuthGuard)
export class AiConversationSessionsController {
  constructor(
    private readonly aiConversationSessionsService: AiConversationSessionsService,
  ) {}

  @Post("new-session")
  @ApiOperation({
    summary: "Create a new AI conversation session",
    description:
      "Creates a new conversation session with the provided title in the specified organization",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID to create the session in",
  })
  @ApiResponse({
    status: 201,
    description: "The session has been successfully created.",
    type: CreateAiConversationSessionsDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid input data provided.",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized.",
  })
  async create(
    @Body() createDto: CreateAiConversationSessionsDto,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ) {
    return await this.aiConversationSessionsService.create({
      input: createDto.input,
      organization_id: organizationId,
      auth_user_id: userId,
    });
  }

  @Get()
  @ApiOperation({
    summary: "Get all AI conversation sessions",
    description:
      "Retrieves all conversation sessions in the specified organization for the authenticated user only",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID to filter sessions",
  })
  @ApiResponse({
    status: 200,
    description:
      "Return all sessions in the specified organization for the authenticated user only.",
    type: [AiConversationSessionResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized.",
  })
  async findAll(
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string, // Get authenticated user ID
  ): Promise<AiConversationSessionResponseDto[]> {
    const sessions = await this.aiConversationSessionsService.findAll(
      organizationId,
      userId,
    );
    // Map to DTO if needed (in this case, fields match)
    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      created_at: session.created_at,
    }));
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a session by ID",
    description: "Retrieves a specific conversation session by its ID",
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "The ID of the conversation session",
    type: String,
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID to verify access",
  })
  @ApiResponse({
    status: 200,
    description: "Return the session with the specified ID.",
    type: CreateAiConversationSessionsDto,
  })
  @ApiResponse({
    status: 404,
    description: "Session not found.",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized.",
  })
  findOne(
    @Param("id") id: string,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ) {
    return this.aiConversationSessionsService.findOne(id, {
      organization_id: organizationId,
      user_id: userId,
    });
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update a session",
    description: "Updates an existing conversation session with new data",
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "The ID of the conversation session to update",
    type: String,
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID to verify access",
  })
  @ApiResponse({
    status: 200,
    description: "The session has been successfully updated.",
    type: UpdateAiConversationSessionsDto,
  })
  @ApiResponse({
    status: 404,
    description: "Session not found.",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized.",
  })
  update(
    @Param("id") id: string,
    @Body() updateDto: UpdateAiConversationSessionsDto,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ) {
    return this.aiConversationSessionsService.update(id, updateDto, {
      organization_id: organizationId,
      user_id: userId,
    });
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete a session",
    description: "Deletes a conversation session and its associated history",
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "The ID of the conversation session to delete",
    type: String,
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID to verify access",
  })
  @ApiResponse({
    status: 200,
    description: "The session has been successfully deleted.",
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: "Session not found.",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized.",
  })
  remove(
    @Param("id") id: string,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ) {
    return this.aiConversationSessionsService.remove(id, {
      organization_id: organizationId,
      user_id: userId,
    });
  }
}
