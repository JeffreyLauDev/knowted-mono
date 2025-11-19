import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AiService } from "../ai/ai.service";
import { AiConversationHistories } from "../ai_conversation_histories/entities/ai_conversation_histories.entity";
import { UsageEventsModule } from "../usage-events/usage-events.module";

import { AiConversationSessionsController } from "./ai_conversation_sessions.controller";
import { AiConversationSessionsService } from "./ai_conversation_sessions.service";
import { AiConversationSessions } from "./entities/ai_conversation_sessions.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([AiConversationSessions, AiConversationHistories]),
    UsageEventsModule,
  ],
  controllers: [AiConversationSessionsController],
  providers: [AiConversationSessionsService, AiService],
  exports: [AiConversationSessionsService],
})
export class AiConversationSessionsModule {}
