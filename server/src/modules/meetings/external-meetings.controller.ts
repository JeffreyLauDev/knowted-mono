import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
    ApiBody,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiSecurity,
    ApiTags
} from "@nestjs/swagger";

import { N8nService } from "../ai/n8n.service";
import { ApiKeyAuthGuard } from "../api-keys/guards/api-key-auth.guard";
import { MeetingTypeResponse } from "../meeting_types/entities/meeting_types.entity";
import { MeetingTypesService } from "../meeting_types/meeting_types.service";
import { Meetings } from "./entities/meetings.entity";
import { MeetingsService } from "./meetings.service";

@ApiSecurity("api-key")
@Controller("api/external/v1")
@UseGuards(ApiKeyAuthGuard)
export class ExternalMeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly meetingTypesService: MeetingTypesService,
    private readonly n8nService: N8nService,
  ) {}

  @Get("meeting-types")
  @ApiTags("Meeting Types")
  @ApiOperation({
    summary: "Get all meeting types accessible to your organization",
    description:
      "Returns all meeting types that your organization has created. No additional filters needed.",
  })
  @ApiResponse({
    status: 200,
    description: "List of meeting types",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", example: "uuid" },
          name: { type: "string", example: "Sales Call" },
          description: { type: "string", example: "Customer sales meetings" },
          analysis_metadata_structure: {
            type: "object",
            example: { "Customer Name": "string", "Deal Size": "number" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or inactive API key",
  })
  async getMeetingTypes(
    @Req() request: any,
  ): Promise<MeetingTypeResponse[]> {
    const organization = request.organization;
    return this.meetingTypesService.findAll({
      organization_id: organization.id,
    });
  }

  @Get("meetings")
  @ApiTags("Meetings")
  @ApiOperation({
    summary: "Query meetings with optional filters",
    description:
      "Get meetings from your organization. All filters are optional - you can combine multiple filters.",
  })
  @ApiQuery({
    name: "meeting_id",
    required: false,
    description: "Get a specific meeting by ID",
  })
  @ApiQuery({
    name: "meeting_type_id",
    required: false,
    description: "Filter by meeting type",
  })
  @ApiQuery({
    name: "user_id",
    required: false,
    description: "Filter by user who created the meeting",
  })
  @ApiQuery({
    name: "participant_email",
    required: false,
    description: "Filter meetings where this participant was present",
  })
  @ApiQuery({
    name: "from_date",
    required: false,
    description: "Filter meetings from this date (ISO string format, e.g., '2024-01-01T00:00:00Z')",
  })
  @ApiQuery({
    name: "to_date",
    required: false,
    description: "Filter meetings until this date (ISO string format, e.g., '2024-12-31T23:59:59Z')",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of meetings to return per page (default: 5, max: 100)",
    type: Number,
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (0-based, default: 0)",
    type: Number,
  })
  @ApiQuery({
    name: "order_by",
    required: false,
    description: "Field to order by (default: 'meeting_date')",
    enum: ["meeting_date", "created_at", "duration_mins"],
  })
  @ApiQuery({
    name: "order_direction",
    required: false,
    description: "Sort direction (default: 'DESC')",
    enum: ["ASC", "DESC"],
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of matching meetings",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              meeting_date: { type: "string" },
              participants_email: { type: "array", items: { type: "string" } },
              summary: { type: "string" },
              duration_mins: { type: "number" },
            },
          },
        },
        total: { type: "number", description: "Total number of meetings matching the filters" },
        page: { type: "number", description: "Current page number (0-based)" },
        limit: { type: "number", description: "Number of meetings per page" },
        totalPages: { type: "number", description: "Total number of pages" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMeetings(
    @Req() request: any,
    @Query("meeting_id") meeting_id?: string,
    @Query("meeting_type_id") meeting_type_id?: string,
    @Query("user_id") user_id?: string,
    @Query("participant_email") participant_email?: string,
    @Query("from_date") from_date?: string,
    @Query("to_date") to_date?: string,
    @Query("limit") limit?: number,
    @Query("page") page?: number,
    @Query("order_by") order_by?: string,
    @Query("order_direction") order_direction?: string,
  ): Promise<{
    data: Meetings[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const organization = request.organization;

    return this.meetingsService.findAllExternal(organization.id, {
      meeting_id,
      meeting_type_id,
      user_id,
      participant_email,
      from_date,
      to_date,
      limit: limit || 5,
      page: page || 0,
      order_by: order_by || "meeting_date",
      order_direction: (order_direction || "DESC").toUpperCase() as "ASC" | "DESC",
    });
  }

  @Post("agent/query")
  @ApiTags("AI Agent")
  @ApiOperation({
    summary: "Query the AI agent about your meetings",
    description:
      "Send a natural language query about your organization's meetings. The AI will analyze your meetings and provide insights.",
  })
  @ApiBody({
    description: "Query text to send to the AI agent",
    schema: {
      type: "object",
      required: ["text"],
      properties: {
        text: {
          type: "string",
          description: "Your question or query for the AI agent",
          example: "What were the key decisions made in our sales calls last week?",
        },
        session_id: {
          type: "string",
          description: "Optional session ID to continue a conversation. If not provided, a new session will be created.",
          example: "api_1234567890_org-id",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "AI agent response",
    schema: {
      type: "object",
      properties: {
        response: {
          type: "string",
          example: "Based on your recent sales meetings, I found...",
        },
        session_id: {
          type: "string",
          description: "Session ID for this conversation (use this for subsequent queries)",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async queryAgent(
    @Req() request: any,
    @Body() body: { text: string; session_id?: string },
  ): Promise<{ response: string; session_id: string }> {
    const organization = request.organization;
    const user = request.user;

    // Use provided session_id or generate a new one
    const sessionId = body.session_id || `api_${Date.now()}_${organization.id}`;

    const responses = await this.n8nService.sendMessageToN8n({
      message: body.text,
      sessionId,
      conversationId: sessionId,
      organizationId: organization.id,
      userId: (user as any)?.sub || organization.owner_id,
    });

    // Extract the output from the response
    // n8n returns: [{ "output": "response text" }]
    if (!responses || responses.length === 0) {
      throw new HttpException(
        "No response received from AI agent",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const responseText = responses.map((r) => r.output).join(" ");

    return {
      response: responseText,
      session_id: sessionId,
    };
  }
}

