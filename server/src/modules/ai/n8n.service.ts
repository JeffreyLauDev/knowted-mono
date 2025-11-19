import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { AiConversationHistoriesService } from "../ai_conversation_histories/ai_conversation_histories.service";
import { MessageContentDtoRole } from "../ai_conversation_histories/dto/message-content.dto";
import { MeetingTypesService } from "../meeting_types/meeting_types.service";
import { OrganizationsService } from "../organizations/organizations.service";
import { ProfilesService } from "../profiles/profiles.service";
import { TeamsService } from "../teams/teams.service";

export interface N8nWebhookRequest {
  message: string;
  sessionId: string;
  conversationId: string;
  organizationId: string;
  userId: string;
  systemPrompt?: string;
  selectedMeetings?: any[];
  userProfile?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  userTeams?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  organization?: {
    id: string;
    name?: string;
    website?: string;
    company_analysis?: string;
    company_type?: string;
    team_size?: string;
    business_description?: string;
    business_offering?: string;
    industry?: string;
    target_audience?: string;
    channels?: string;
  };
  accessibleMeetingTypes?: Array<{
    id: string;
    name: string;
    description?: string;
    analysis_metadata_structure?: Record<string, string>;
  }>;
}

export interface N8nWebhookResponse {
  responses: Array<{ output: string }>;
  isComplete: boolean;
  sessionId: string;
  conversationId: string;
}

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private readonly n8nWebhookUrl: string;
  private streamingResponses = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly aiConversationHistoriesService: AiConversationHistoriesService,
    private readonly profilesService: ProfilesService,
    private readonly teamsService: TeamsService,
    private readonly organizationsService: OrganizationsService,
    private readonly meetingTypesService: MeetingTypesService,
  ) {
    this.n8nWebhookUrl =
      this.configService.get<string>("N8N_WEBHOOK_URL") ||
      "https://n8n-app-platform-01-957yy.ondigitalocean.app/webhook/knowted-n8n-webhook";
  }

  async sendMessageToN8n(request: N8nWebhookRequest): Promise<Array<{ output: string }> | null> {
    try {
      this.logger.log(
        `Sending message to n8n webhook: ${request.message.substring(0, 50)}...`,
      );

      // Fetch additional context data
      const enrichedRequest = await this.enrichRequestWithContext(request);

      // Log the enriched request for debugging
      this.logger.log(`Enriched request includes:
        - User Profile: ${enrichedRequest.userProfile ? "Yes" : "No"}
        - User Teams: ${enrichedRequest.userTeams?.length || 0} teams
        - Organization: ${enrichedRequest.organization ? "Yes" : "No"}
        - Accessible Meeting Types: ${enrichedRequest.accessibleMeetingTypes?.length || 0} types
      `);

      // Initialize streaming response for this session
      this.streamingResponses.set(request.sessionId, "");
      // Send the enriched request to n8n webhook
      const response = await fetch(this.n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(enrichedRequest),
      });

      if (!response.ok) {
        throw new Error(
          `N8n webhook responded with status: ${response.status}`,
        );
      }

      // Check if response is streaming (text/event-stream) or regular JSON
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("text/event-stream")) {
        // Handle streaming response
        return await this.handleStreamingResponse(
          response,
          request.sessionId,
          request.conversationId,
          request.userId,
          request.organizationId,
        );
      } else {
        // Handle regular JSON response
        const responseData = await response.json();
        const responses = await this.handleJsonResponse(
          responseData,
          request.sessionId,
          request.conversationId,
          request.userId,
          request.organizationId,
        );
        return responses;
      }
    } catch (error) {
      this.logger.error(`Error sending message to n8n: ${error.message}`);
      throw error;
    }
  }

  private async handleStreamingResponse(
    response: Response,
    sessionId: string,
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Promise<Array<{ output: string }> | null> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader available");
    }

    let buffer = "";
    let finalResponses: Array<{ output: string }> | null = null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Convert the chunk to text
      const chunk = new TextDecoder().decode(value);
      buffer += chunk;

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            const responses = await this.processResponseData(
              data,
              sessionId,
              conversationId,
              userId,
              organizationId,
            );
            if (responses && data.isComplete) {
              finalResponses = responses;
            }
          } catch (error) {
            this.logger.warn(`Failed to parse streaming response: ${line}`);
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer);
        const responses = await this.processResponseData(
          data,
          sessionId,
          conversationId,
          userId,
          organizationId,
        );
        if (responses && data.isComplete) {
          finalResponses = responses;
        }
      } catch (error) {
        this.logger.warn(`Failed to parse final streaming response: ${buffer}`);
      }
    }

    // Return final responses if available, otherwise return accumulated content
    if (finalResponses) {
      return finalResponses;
    }
    
    const accumulatedContent = this.streamingResponses.get(sessionId);
    return accumulatedContent ? [{ output: accumulatedContent }] : null;
  }

  private async handleJsonResponse(
    data: any,
    sessionId: string,
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Promise<Array<{ output: string }> | null> {
    return await this.processResponseData(
      data,
      sessionId,
      conversationId,
      userId,
      organizationId,
    );
  }

  private async processResponseData(
    data: any,
    sessionId: string,
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Promise<Array<{ output: string }> | null> {
    try {
      this.logger.log(`Processing n8n response data: ${JSON.stringify(data)}`);

      // Handle the response format: array of objects with output fields
      let responses: Array<{ output: string }> = [];

      if (Array.isArray(data)) {
        // Direct array format: [{ "output": "message" }]
        responses = data;
        this.logger.log(`Parsed array response with ${responses.length} items`);
      } else if (data.responses && Array.isArray(data.responses)) {
        // New format with responses field
        responses = data.responses;
        this.logger.log(
          `Parsed responses field with ${responses.length} items`,
        );
      } else if (data.output) {
        // Single response format: { "output": "message" }
        responses = [{ output: data.output }];
        this.logger.log(`Parsed single output response`);
      } else if (typeof data === "string") {
        // String response format: "message"
        responses = [{ output: data }];
        this.logger.log(`Parsed string response`);
      } else {
        // Invalid format, skip processing
        this.logger.warn(
          `Invalid response format received: ${JSON.stringify(data)}`,
        );
        return null;
      }

      const isComplete = data.isComplete || data.done || true; // Default to complete for non-streaming

      this.logger.log(
        `Response isComplete: ${isComplete}, responses count: ${responses.length}`,
      );

      // Accumulate streaming content
      const currentContent = this.streamingResponses.get(sessionId) || "";
      const newContent =
        currentContent + responses.map((r) => r.output).join(" ");
      this.streamingResponses.set(sessionId, newContent);

      const response: N8nWebhookResponse = {
        responses: responses,
        isComplete,
        sessionId,
        conversationId,
      };

      // Emit event for real-time updates
      this.eventEmitter.emit("n8n.response", response);

      this.logger.log(
        `Emitted n8n response event for session ${sessionId}: ${responses
          .map((r) => r.output)
          .join(" ")
          .substring(0, 50)}...`,
      );

      // If response is complete, save to database
      if (isComplete) {
        await this.saveAiResponseToDatabase(
          sessionId,
          conversationId,
          newContent,
          userId,
          organizationId,
        );
        this.streamingResponses.delete(sessionId);
        this.logger.log(
          `Saved complete response to database for session: ${sessionId}`,
        );
        return responses;
      }

      // Return responses even if not complete (for streaming)
      return responses;
    } catch (error) {
      this.logger.error(`Error processing response data: ${error.message}`);
      return null;
    }
  }

  private async saveAiResponseToDatabase(
    sessionId: string,
    conversationId: string,
    content: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const messagePayload = {
        role: MessageContentDtoRole.AI,
        content: content,
        additional_kwargs: {},
        response_metadata: {},
      };

      await this.aiConversationHistoriesService.create(
        {
          session_id: sessionId,
          message: messagePayload,
        },
        userId,
        organizationId,
      );

      this.logger.log(
        `Saved AI response to database for session: ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error saving AI response to database: ${error.message}`,
      );
    }
  }

  private async enrichRequestWithContext(
    request: N8nWebhookRequest,
  ): Promise<N8nWebhookRequest> {
    try {
      // Fetch user profile
      const userProfile = await this.profilesService.getProfile(request.userId);

      // Fetch user teams in the organization
      const userTeams = await this.teamsService.getUserTeams(
        request.organizationId,
        request.userId,
      );

      // Fetch organization details
      const organization =
        await this.organizationsService.findOneWithUserAccess(
          request.organizationId,
          request.userId,
        );

      // Fetch accessible meeting types for the user
      const accessibleMeetingTypes = await this.getAccessibleMeetingTypes(
        request.organizationId,
        request.userId,
      );

      return {
        ...request,
        userProfile: {
          id: userProfile.id,
          email: userProfile.email,
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          avatar_url: userProfile.avatar_url,
        },
        userTeams: userTeams.map((team) => ({
          id: team.id,
          name: team.name,
          description: team.description,
        })),
        organization: organization
          ? {
              id: organization.id,
              name: organization.name,
              website: organization.website,
              company_analysis: organization.company_analysis,
              company_type: organization.company_type,
              team_size: organization.team_size,
              business_description: organization.business_description,
              business_offering: organization.business_offering,
              industry: organization.industry,
              target_audience: organization.target_audience,
              channels: organization.channels,
            }
          : undefined,
        accessibleMeetingTypes: accessibleMeetingTypes.map((meetingType) => ({
          id: meetingType.id,
          name: meetingType.name,
          description: meetingType.description,
          analysis_metadata_structure: meetingType.analysis_metadata_structure,
        })),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to enrich request with context: ${error.message}`,
      );
      // Return original request if enrichment fails
      return request;
    }
  }

  private async getAccessibleMeetingTypes(
    organizationId: string,
    userId: string,
  ): Promise<any[]> {
    try {
      // Get user teams
      const userTeams = await this.teamsService.getUserTeams(
        organizationId,
        userId,
      );

      if (userTeams.length === 0) {
        return [];
      }

      // Get all meeting types for the organization
      const allMeetingTypes = await this.meetingTypesService.findAll({
        organization_id: organizationId,
      });

      // Filter meeting types based on user's team permissions
      const accessibleMeetingTypes = await Promise.all(
        allMeetingTypes.map(async (meetingType) => {
          try {
            // Check if any of user's teams have access to this meeting type
            const hasAccess = await Promise.any(
              userTeams.map(async (team) => {
                try {
                  return await this.meetingTypesService[
                    "permissionsService"
                  ].checkPermission(
                    team.id,
                    "meeting_types",
                    meetingType.id,
                    "read",
                  );
                } catch {
                  return false;
                }
              }),
            );

            return hasAccess ? meetingType : null;
          } catch {
            return null;
          }
        }),
      );

      return accessibleMeetingTypes.filter(Boolean);
    } catch (error) {
      this.logger.warn(
        `Failed to get accessible meeting types: ${error.message}`,
      );
      return [];
    }
  }
}
