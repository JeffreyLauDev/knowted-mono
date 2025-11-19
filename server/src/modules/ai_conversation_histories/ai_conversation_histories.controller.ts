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

import { AiConversationHistoriesService } from "./ai_conversation_histories.service";
import { AiConversationHistoriesResponseDto } from "./dto/ai-conversation-histories-response.dto";
import { CreateAiConversationHistoriesDto } from "./dto/create-ai_conversation_histories.dto";
import { UpdateAiConversationHistoriesDto } from "./dto/update-ai_conversation_histories.dto";
import { AiConversationHistories } from "./entities/ai_conversation_histories.entity";

type QueryParams = {
  session_id?: string;
};

@ApiTags("AI Conversation Histories")
@ApiBearerAuth("access-token")
@Controller("api/v1/ai-conversation-histories")
@UseGuards(JwtAuthGuard)
export class AiConversationHistoriesController {
  constructor(
    private readonly aiConversationHistoriesService: AiConversationHistoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new AI conversation history" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID to verify access",
  })
  @ApiResponse({
    status: 201,
    description: "The AI conversation history has been successfully created.",
  })
  @ApiResponse({
    status: 403,
    description: "Access denied: User does not own the session",
  })
  create(
    @Body() createDto: CreateAiConversationHistoriesDto,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ) {
    return this.aiConversationHistoriesService.create(
      createDto,
      userId,
      organizationId,
    );
  }

  @Get()
  @ApiOperation({ summary: "Get all AI conversation histories" })
  @ApiQuery({ name: "session_id", required: false })
  @ApiResponse({
    status: 200,
    description: "Return all AI conversation histories.",
  })
  findAll(@Query() query: QueryParams) {
    return this.aiConversationHistoriesService.findAll(query);
  }

  @Get("session/:sessionId")
  @ApiOperation({ summary: "Get conversation history by session ID" })
  @ApiParam({
    name: "sessionId",
    required: true,
    description: "The session ID to get history for",
    type: String,
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID to verify access",
  })
  @ApiResponse({
    status: 200,
    description: "Return the conversation history for the session",
    type: [AiConversationHistoriesResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: "Session not found",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  async findBySessionId(
    @Param("sessionId") sessionId: string,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ): Promise<AiConversationHistories[]> {
    const histories = await this.aiConversationHistoriesService.findBySessionId(
      sessionId,
      userId,
      organizationId,
    );
    return histories;
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an AI conversation history by ID" })
  @ApiResponse({
    status: 200,
    description: "Return the AI conversation history.",
  })
  findOne(@Param("id") id: string) {
    return this.aiConversationHistoriesService.findOne(+id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an AI conversation history" })
  @ApiResponse({
    status: 200,
    description: "The AI conversation history has been successfully updated.",
  })
  update(
    @Param("id") id: string,
    @Body() updateDto: UpdateAiConversationHistoriesDto,
  ) {
    return this.aiConversationHistoriesService.update(+id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an AI conversation history" })
  @ApiResponse({
    status: 200,
    description: "The AI conversation history has been successfully deleted.",
  })
  remove(@Param("id") id: string) {
    return this.aiConversationHistoriesService.remove(+id);
  }
}
