import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AiConversationHistoriesController } from "./ai_conversation_histories.controller";
import { AiConversationHistoriesService } from "./ai_conversation_histories.service";
import { AiConversationHistories } from "./entities/ai_conversation_histories.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AiConversationHistories])],
  controllers: [AiConversationHistoriesController],
  providers: [AiConversationHistoriesService],
  exports: [AiConversationHistoriesService],
})
export class AiConversationHistoriesModule {}
