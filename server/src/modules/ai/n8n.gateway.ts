import { OnEvent } from "@nestjs/event-emitter";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";

import { Server, Socket } from "socket.io";

import { PinoLoggerService } from "../../common/logger/pino-logger.service";
import { AiConversationHistoriesService } from "../ai_conversation_histories/ai_conversation_histories.service";
import { MessageContentDtoRole } from "../ai_conversation_histories/dto/message-content.dto";
import { AiConversationSessionsService } from "../ai_conversation_sessions/ai_conversation_sessions.service";

import { N8nService, N8nWebhookResponse } from "./n8n.service";

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
})
export class N8nGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, Socket>();

  constructor(
    private readonly logger: PinoLoggerService,
    private readonly n8nService: N8nService,
    private readonly aiConversationHistoriesService: AiConversationHistoriesService,
    private readonly aiConversationSessionsService: AiConversationSessionsService,
  ) {}

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage("join-session")
  handleJoinSession(client: Socket, sessionId: string) {
    client.join(`session-${sessionId}`);
    return { success: true };
  }

  @SubscribeMessage("leave-session")
  handleLeaveSession(client: Socket, sessionId: string) {
    client.leave(`session-${sessionId}`);
    return { success: true };
  }

  @SubscribeMessage("send-message")
  async handleSendMessage(
    client: Socket,
    data: {
      message: string;
      sessionId: string;
      systemPrompt?: string;
      selectedMeetings?: any[];
      userId: string;
      organizationId: string;
    },
  ) {
    try {
      this.logger.log(
        `Received message via WebSocket: ${data.message.substring(0, 50)}...`,
      );

      let conversationSessionId = data.sessionId;
      let isNewSession = false;

      // Check if this is a new session (sessionId starts with 'new-')
      if (data.sessionId.startsWith("new-")) {
        // Create a new conversation session
        const session = await this.aiConversationSessionsService.create({
          input: data.message,
          organization_id: data.organizationId,
          auth_user_id: data.userId,
        });
        conversationSessionId = session.id;
        isNewSession = true;

        // Notify client about the new session
        client.emit("session-created", {
          oldSessionId: data.sessionId,
          newSessionId: conversationSessionId,
          session: session,
        });
      } else {
        // Verify the session exists before proceeding
        try {
          await this.aiConversationSessionsService.findOne(
            conversationSessionId,
            {
              organization_id: data.organizationId,
              user_id: data.userId,
            },
          );
        } catch (error) {
          // Session doesn't exist, create a new one
          const session = await this.aiConversationSessionsService.create({
            input: data.message,
            organization_id: data.organizationId,
            auth_user_id: data.userId,
          });
          conversationSessionId = session.id;
          isNewSession = true;

          client.emit("session-created", {
            oldSessionId: data.sessionId,
            newSessionId: conversationSessionId,
            session: session,
          });
        }

        // Save user message to existing conversation
        const userMessagePayload = {
          role: MessageContentDtoRole.HUMAN,
          content: data.message,
          additional_kwargs: {},
          response_metadata: {},
        };

        await this.aiConversationHistoriesService.create(
          {
            session_id: conversationSessionId,
            message: userMessagePayload,
          },
          data.userId,
          data.organizationId,
        );
      }

      // Send to n8n webhook
      const request = {
        message: data.message,
        sessionId: conversationSessionId,
        conversationId: conversationSessionId,
        organizationId: data.organizationId,
        userId: data.userId,
        systemPrompt: data.systemPrompt,
        selectedMeetings: data.selectedMeetings,
      };

      await this.n8nService.sendMessageToN8n(request);

      // Acknowledge message received
      client.emit("message-received", {
        success: true,
        message: "Message sent to AI",
        sessionId: conversationSessionId,
        isNewSession,
      });
    } catch (error) {
      this.logger.error(
        "Error handling WebSocket message:",
        undefined,
        "N8nGateway",
        error,
      );
      client.emit("message-error", {
        success: false,
        error: "Failed to process message",
        sessionId: data.sessionId,
      });
    }
  }

  @OnEvent("n8n.response")
  async handleN8nResponse(response: N8nWebhookResponse) {
    // Emit the response to all clients in the session
    this.server.to(`session-${response.sessionId}`).emit("ai-response", {
      responses: response.responses,
      isComplete: response.isComplete,
      sessionId: response.sessionId,
      conversationId: response.conversationId,
    });

    this.logger.log(
      `Emitted n8n response to session ${response.sessionId}: ${response.responses
        .map((r) => r.output)
        .join(" ")
        .substring(0, 50)}...`,
    );
  }
}
