import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AiConversationHistoriesService } from "../ai_conversation_histories/ai_conversation_histories.service";
import { MessageContentDtoRole } from "../ai_conversation_histories/dto/message-content.dto";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { N8nService, N8nWebhookRequest } from "./n8n.service";

@ApiTags("N8n Integration")
@ApiBearerAuth("access-token")
@Controller("api/v1/n8n")
@UseGuards(JwtAuthGuard)
export class N8nController {
  constructor(
    private readonly n8nService: N8nService,
    private readonly aiConversationHistoriesService: AiConversationHistoriesService,
  ) {}

  @Post("send-message")
  @ApiOperation({ summary: "Send message to n8n webhook for AI processing" })
  @ApiResponse({
    status: 200,
    description: "Message sent to n8n webhook successfully",
  })
  async sendMessage(
    @Body()
    body: {
      message: string;
      sessionId: string;
      systemPrompt?: string;
      selectedMeetings?: any[];
    },
    @GetUser() user: any,
  ) {
    // First, save the user message to the database
    const userMessagePayload = {
      role: MessageContentDtoRole.HUMAN,
      content: body.message,
      additional_kwargs: {},
      response_metadata: {},
    };

    await this.aiConversationHistoriesService.create(
      {
        session_id: body.sessionId,
        message: userMessagePayload,
      },
      user.id,
      user.organization_id,
    );

    // Then send to n8n webhook
    const request: N8nWebhookRequest = {
      message: body.message,
      sessionId: body.sessionId,
      conversationId: body.sessionId, // Using sessionId as conversationId
      organizationId: user.organization_id,
      userId: user.id,
      systemPrompt: body.systemPrompt,
      selectedMeetings: body.selectedMeetings,
    };

    // Send message to n8n webhook
    await this.n8nService.sendMessageToN8n(request);

    return { success: true, message: "Message sent to n8n webhook" };
  }
}
