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
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationMembershipGuard } from "../organizations/guards/organization-membership.guard";
import { RequirePermission } from "../permissions/decorators/require-permission.decorator";
import { PermissionGuard } from "../permissions/guards/permission.guard";

import { CreateReportTypesDto } from "./dto/create-report_types.dto";
import { GetReportTypesDto } from "./dto/get-report-types.dto";
import { ReportTypeResponseDto } from "./dto/report-type-response.dto";
import { UpdateReportTypesDto } from "./dto/update-report_types.dto";
import { ReportTypesService } from "./report_types.service";

@ApiTags("ReportTypes")
@ApiBearerAuth("access-token")
@Controller("api/v1/report-types")
@UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
export class ReportTypesController {
  constructor(private readonly report_typesService: ReportTypesService) {}

  @Post()
  @ApiOperation({
    summary: "Create a new report type",
    description:
      "Creates a new report type with specified schedule and configuration. The report can be scheduled to run weekly, monthly, or quarterly.",
  })
  @ApiResponse({
    status: 201,
    description: "The report type has been successfully created.",
    type: ReportTypeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request. Invalid report schedule format or frequency.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @RequirePermission("report_types", "readWrite")
  create(
    @Body() createReportTypesDto: CreateReportTypesDto,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ) {
    return this.report_typesService.create({
      ...createReportTypesDto,
      user_id: userId,
      organization_id: organizationId,
    });
  }

  @Get()
  @ApiOperation({ summary: "Get all report types with permissions" })
  @ApiResponse({
    status: 200,
    description: "Return all accessible report types.",
    type: [ReportTypeResponseDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @RequirePermission("report_types", "read")
  findAll(
    @Query() query: GetReportTypesDto,
    @GetUser("sub") userId: string,
  ): Promise<ReportTypeResponseDto[]> {
    return this.report_typesService.getReportTypesWithPermissions(
      query,
      userId,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a report type by id" })
  @ApiResponse({ status: 200, description: "Return the report type." })
  @ApiResponse({ status: 404, description: "Report type not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @RequirePermission("report_types", "read")
  findOne(
    @Param("id") id: string,
    @Query("organization_id") organizationId: string,
  ) {
    return this.report_typesService.findOne(id, organizationId);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update a report type",
    description:
      "Updates an existing report type. Only fields that are provided will be updated. The report schedule can be modified to change when the report runs.",
  })
  @ApiParam({
    name: "id",
    description: "The ID of the report type to update",
    type: "string",
    format: "uuid",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiBody({
    type: UpdateReportTypesDto,
    description: "Report type update data",
    examples: {
      example1: {
        summary: "Update Report with Meeting Types",
        value: {
          report_title: "Updated Weekly Sales Report",
          report_prompt:
            "Generate an updated weekly sales report with detailed revenue analysis by region",
          report_schedule: {
            day: "1",
            time: "09:00",
            frequency: "weekly",
          },
          meeting_types: ["253efc6c-cc24-4173-90c9-714bb8c593ab"],
          active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "The report type has been successfully updated.",
    type: ReportTypeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request. Invalid report schedule format or frequency.",
  })
  @ApiResponse({
    status: 401,
    description:
      "Unauthorized. User does not have permission to update report types.",
  })
  @ApiResponse({
    status: 404,
    description: "Report type not found. The specified ID does not exist.",
  })
  @RequirePermission("report_types", "readWrite", (req) => req.params.id)
  update(
    @Param("id") id: string,
    @Query("organization_id") organizationId: string,
    @Body() updateReportTypesDto: UpdateReportTypesDto,
    @GetUser("sub") userId: string,
  ) {
    return this.report_typesService.update(id, organizationId, {
      ...updateReportTypesDto,
      user_id: userId,
    });
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a report type" })
  @ApiResponse({
    status: 200,
    description: "The report type has been successfully deleted.",
  })
  @ApiResponse({ status: 404, description: "Report type not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @RequirePermission("report_types", "readWrite")
  remove(
    @Param("id") id: string,
    @Query("organization_id") organizationId: string,
  ) {
    return this.report_typesService.remove(id, organizationId);
  }
}
