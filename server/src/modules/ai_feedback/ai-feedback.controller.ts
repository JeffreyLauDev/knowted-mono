import {
  Body,
  Controller,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { AiFeedbackResponseDto } from "./dto/ai-feedback-response.dto";
import { CreateAiFeedbackDto } from "./dto/create-ai-feedback.dto";
import { AiFeedbackService } from "./ai-feedback.service";

@ApiTags("AI Feedback")
@ApiBearerAuth("access-token")
@Controller("api/v1/ai-feedback")
@UseGuards(JwtAuthGuard)
export class AiFeedbackController {
  constructor(private readonly feedbackService: AiFeedbackService) {}

  @Post()
  @ApiOperation({ summary: "Submit feedback for an AI message to LangSmith" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID to verify access",
  })
  @ApiResponse({
    status: 200,
    description: "Feedback submission result (check success field in response).",
    type: AiFeedbackResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid feedback data",
  })
  async create(
    @Body() createDto: CreateAiFeedbackDto,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ): Promise<AiFeedbackResponseDto> {
    return await this.feedbackService.create(createDto, userId, organizationId);
  }
}
