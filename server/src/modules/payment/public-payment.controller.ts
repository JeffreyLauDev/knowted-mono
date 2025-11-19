import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { AvailablePlansResponseDto } from "./dto/subscription-details.dto";
import { PaymentService } from "./payment.service";

@ApiTags("Public Payment")
@Controller("api/v1/payment")
export class PublicPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get("plans")
  @ApiOperation({
    summary: "Get available payment plans",
    description:
      "Public endpoint to retrieve all available payment plans and pricing information",
  })
  @ApiResponse({
    status: 200,
    description: "Available plans retrieved successfully",
    type: AvailablePlansResponseDto,
  })
  async getAvailablePlans() {
    const plans = await this.paymentService.getAvailablePlans();
    return { plans };
  }
}
