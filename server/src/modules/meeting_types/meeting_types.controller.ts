import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { JwtOrApiKeyAuthGuard } from "../auth/guards/jwt-or-api-key-auth.guard";
import { OrganizationMembershipGuard } from "../organizations/guards/organization-membership.guard";
import { RequirePermission } from "../permissions/decorators/require-permission.decorator";
import { PermissionGuard } from "../permissions/guards/permission.guard";

import { AiService } from "../ai/ai.service";
import { CreateMeetingTypeDto } from "./dto/create-meeting-type.dto";
import { GenerateAnalysisTopicsDto } from "./dto/generate-analysis-topics.dto";
import { GenerateMeetingTypeDto } from "./dto/generate-meeting-type.dto";
import { GetMeetingTypesDto } from "./dto/get-meeting-types.dto";
import { UpdateMeetingTypeDto } from "./dto/update-meeting-type.dto";
import { MeetingTypeResponse } from "./entities/meeting_types.entity";
import { MeetingTypesService } from "./meeting_types.service";

@ApiTags("MeetingTypes")
@ApiBearerAuth("access-token")
@Controller("api/v1/meeting-types")
@UseGuards(JwtOrApiKeyAuthGuard, PermissionGuard, OrganizationMembershipGuard)
export class MeetingTypesController {
  constructor(
    private readonly meetingTypesService: MeetingTypesService,
    private readonly aiService: AiService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Get all meeting types for the specified organization.",
  })
  @ApiResponse({
    status: 200,
    description: "Return all meeting types for the organization.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @RequirePermission("meeting_types", "read")
  findAll(@Query() query: GetMeetingTypesDto): Promise<MeetingTypeResponse[]> {
    return this.meetingTypesService.findAll(query);
  }

  @Post()
  @ApiOperation({
    summary: "Create a new meeting type",
    description:
      "Creates a new meeting type and grants access to the user's team. The meeting type will be used to categorize and analyze meetings.",
  })
  @ApiBody({
    type: CreateMeetingTypeDto,
    description: "Meeting type creation data",
    examples: {
      example1: {
        summary: "Create a Sales Meeting Type",
        value: {
          name: "Sales Call",
          description:
            "Standard sales call meeting type for customer interactions",
          analysis_metadata_structure: {
            customer_name: "string",
            deal_size: "number",
            next_steps: "string",
            pain_points: "array",
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Meeting type created successfully",
    type: MeetingTypeResponse,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request. Invalid input data or missing required fields.",
  })
  @ApiResponse({
    status: 401,
    description:
      "Unauthorized. User does not have permission to create meeting types.",
  })
  @RequirePermission("meeting_types", "readWrite")
  async create(
    @Query("organization_id") organization_id: string,
    @Body() createMeetingTypeDto: CreateMeetingTypeDto,
    @Request() req,
  ): Promise<MeetingTypeResponse> {
    return this.meetingTypesService.create(
      createMeetingTypeDto,
      organization_id,
      req.user.id,
    );
  }

  @Put(":id")
  @ApiOperation({
    summary: "Update an existing meeting type",
    description:
      "Updates the details of an existing meeting type. Only fields that are provided will be updated.",
  })
  @ApiParam({
    name: "id",
    description: "The ID of the meeting type to update",
    type: "string",
    format: "uuid",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiBody({
    type: UpdateMeetingTypeDto,
    description: "Meeting type update data",
    examples: {
      example1: {
        summary: "Update Meeting Type Name and Description",
        value: {
          name: "Updated Sales Call",
          description: "Updated description for sales call meetings",
        },
      },
      example2: {
        summary: "Update Analysis Metadata Structure",
        value: {
          analysis_metadata_structure: {
            "Termination Reason":
              "Details of why the employee's contract is being terminated.",
            "HR Representative":
              "Name of the HR representative present at the meeting.",
            "Manager Present":
              "Name of the manager conducting the termination.",
            "Employee Details":
              "Full name and position of the employee being terminated.",
            "Discussion Points":
              "Major topics covered in the meeting including performance, policy violations, etc.",
            "Final Day": "The last working day of the employee.",
            "Severance Package":
              "Details of any severance pay or benefits to be provided.",
            "Documentation Provided":
              "List of all documents provided to the employee during the meeting.",
            "Return of Company Property":
              "Details of any company property to be returned by the employee.",
            "Exit Interview":
              "Notes on whether an exit interview was conducted or scheduled.",
            "Legal Considerations":
              "Any legal aspects that were discussed or need to be addressed.",
            "Emotional Considerations":
              "Any emotional support offered or discussed with the employee.",
            "Next Steps":
              "Immediate actions to be taken post-meeting by involved parties.",
            "Meeting Location": "Location where the meeting took place.",
            "Meeting Date": "Date when the meeting was conducted.",
            "Employee Feedback":
              "Any feedback provided by the employee during the meeting.",
            Witnesses:
              "List of any additional witnesses present at the meeting.",
            "Record Keeping":
              "Details about how the meeting and its outcomes are documented and stored.",
            "Confidentiality Agreements":
              "Any confidentiality obligations discussed or signed during the meeting.",
            "Follow-up Actions":
              "List of actions to be followed up with the employee or internally after the meeting.",
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "The meeting type has been successfully updated.",
    type: MeetingTypeResponse,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request. Invalid input data.",
  })
  @ApiResponse({
    status: 401,
    description:
      "Unauthorized. User does not have permission to update meeting types.",
  })
  @ApiResponse({
    status: 404,
    description: "Meeting type not found. The specified ID does not exist.",
  })
  @RequirePermission("meeting_types", "readWrite", (req) => req.params.id)
  update(
    @Param("id") id: string,
    @Body() updateMeetingTypeDto: UpdateMeetingTypeDto,
    @Query("organization_id") organization_id: string,
  ): Promise<MeetingTypeResponse> {
    return this.meetingTypesService.update(
      id,
      updateMeetingTypeDto,
      organization_id,
    );
  }

  @Post("generate")
  @ApiOperation({
    summary: "Generate a new meeting type using AI based on an objective.",
    description: "Uses AI to generate a complete meeting type with metadata structure based on the provided objective.",
  })
  @ApiBody({
    type: GenerateMeetingTypeDto,
    description: "The objective and context for generating the meeting type",
  })
  @ApiResponse({
    status: 201,
    description: "The meeting type has been successfully generated.",
    schema: {
      type: "object",
      properties: {
        meeting_type: {
          type: "string",
          description: "The generated meeting type name",
          example: "Firing",
        },
        meeting_type_description: {
          type: "string",
          description: "The generated meeting type description",
          example: "This meeting type is used internally to address the termination of an employee...",
        },
        analysis_metadata_structure: {
          type: "object",
          description: "The generated analysis metadata structure",
          additionalProperties: {
            type: "string",
          },
          example: {
            "Target Employee": "The name or ID of the individual subject to termination",
            "Reason for Termination": "Key justification or performance-based evidence leading to the decision",
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request. Invalid input data.",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized. User does not have permission to generate meeting types.",
  })
  @RequirePermission("meeting_types", "readWrite")
  async generateMeetingType(
    @Body() generateMeetingTypeDto: GenerateMeetingTypeDto,
    @Request() req: any,
  ) {
    const { objective, organisation, organisation_about, meeting_types } = generateMeetingTypeDto;
    
    const result = await this.aiService.generateMeetingType(
      objective,
      organisation,
      organisation_about,
      meeting_types,
      req.user.organizationId,
      req.user.id,
    );

    return result;
  }

  @Post("generate-analysis-topics")
  @ApiOperation({
    summary: "Generate analysis topics for a meeting type using AI based on its description.",
    description: "Uses AI to generate analysis topics based on the meeting type name and description.",
  })
  @ApiBody({
    type: GenerateAnalysisTopicsDto,
    description: "The meeting type name and description for generating analysis topics",
  })
  @ApiResponse({
    status: 201,
    description: "The analysis topics have been successfully generated.",
    schema: {
      type: "object",
      properties: {
        analysis_metadata_structure: {
          type: "object",
          description: "The generated analysis metadata structure",
          additionalProperties: {
            type: "string",
          },
          example: {
            "Key Points": "Important discussion points and decisions made",
            "Action Items": "Tasks and follow-up actions identified",
            "Next Steps": "Planned future actions and timeline",
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request. Invalid input data.",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized. User does not have permission to generate analysis topics.",
  })
  @RequirePermission("meeting_types", "readWrite")
  async generateAnalysisTopics(
    @Query("organization_id") organization_id: string,
    @Body() generateAnalysisTopicsDto: GenerateAnalysisTopicsDto,
    @Request() req: any,
  ) {
    const { meeting_type, meeting_type_description, organisation, organisation_about } = generateAnalysisTopicsDto;
    
    const result = await this.aiService.generateAnalysisTopics(
      meeting_type,
      meeting_type_description,
      organisation,
      organisation_about,
      req.user?.organizationId || organization_id,
      req.user?.id,
    );

    return { analysis_metadata_structure: result };
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete a meeting type",
    description: "Deletes a meeting type by ID. This action cannot be undone.",
  })
  @ApiParam({
    name: "id",
    description: "The ID of the meeting type to delete",
    type: "string",
    format: "uuid",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 204,
    description: "The meeting type has been successfully deleted.",
  })
  @ApiResponse({
    status: 401,
    description:
      "Unauthorized. User does not have permission to delete meeting types.",
  })
  @ApiResponse({
    status: 404,
    description: "Meeting type not found.",
  })
  @RequirePermission("meeting_types", "readWrite", (req) => req.params.id)
  remove(
    @Param("id") id: string,
    @Query("organization_id") organization_id: string,
    @Request() req,
  ): Promise<void> {
    return this.meetingTypesService.remove(id, organization_id, req.user.id);
  }
}
