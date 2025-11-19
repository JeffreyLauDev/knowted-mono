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
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationMembershipGuard } from "../organizations/guards/organization-membership.guard";
import { PermissionGuard } from "../permissions/guards/permission.guard";

import { CreateReportsDto } from "./dto/create-reports.dto";
import { UpdateReportsDto } from "./dto/update-reports.dto";
import { Reports } from "./entities/reports.entity";
import { ReportsService } from "./reports.service";

@ApiTags("Reports")
@ApiBearerAuth("access-token")
@Controller("api/v1/reports")
@UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new reports" })
  @ApiResponse({
    status: 201,
    description: "The reports has been successfully created.",
  })
  @ApiResponse({ status: 400, description: "Bad request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  create(
    @Body() createReportsDto: CreateReportsDto,
    @GetUser("id") userId: string,
  ) {
    return this.reportsService.create(createReportsDto, userId);
  }

  @Get()
  @ApiOperation({ summary: "Get all reportss" })
  @ApiResponse({ status: 200, description: "Return all reportss." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  findAll(@Query() query: Partial<Reports>) {
    return this.reportsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a reports by id" })
  @ApiResponse({ status: 200, description: "Return the reports." })
  @ApiResponse({ status: 404, description: "Reports not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  findOne(@Param("id") id: string) {
    return this.reportsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a reports" })
  @ApiResponse({
    status: 200,
    description: "The reports has been successfully updated.",
  })
  @ApiResponse({ status: 404, description: "Reports not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  update(@Param("id") id: string, @Body() updateReportsDto: UpdateReportsDto) {
    return this.reportsService.update(id, updateReportsDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a reports" })
  @ApiResponse({
    status: 200,
    description: "The reports has been successfully deleted.",
  })
  @ApiResponse({ status: 404, description: "Reports not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  remove(@Param("id") id: string) {
    return this.reportsService.remove(id);
  }
}
