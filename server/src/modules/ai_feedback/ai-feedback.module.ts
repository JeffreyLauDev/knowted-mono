import { Module } from "@nestjs/common";

import { AiModule } from "../ai/ai.module";
import { AiFeedbackController } from "./ai-feedback.controller";
import { AiFeedbackService } from "./ai-feedback.service";

@Module({
  imports: [AiModule],
  controllers: [AiFeedbackController],
  providers: [AiFeedbackService],
  exports: [AiFeedbackService],
})
export class AiFeedbackModule {}
