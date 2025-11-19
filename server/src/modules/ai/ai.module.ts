import { forwardRef, Module } from "@nestjs/common";

import { AiConversationHistoriesModule } from "../ai_conversation_histories/ai_conversation_histories.module";
import { AiConversationSessionsModule } from "../ai_conversation_sessions/ai_conversation_sessions.module";
import { MeetingTypesModule } from "../meeting_types/meeting_types.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { ProfilesModule } from "../profiles/profiles.module";
import { TeamsModule } from "../teams/teams.module";
import { UsageEventsModule } from "../usage-events/usage-events.module";

import { AiService } from "./ai.service";
import { LangGraphProxyController } from "./langgraph-proxy.controller";
import { LangGraphProxyService } from "./langgraph-proxy.service";
import { LangSmithService } from "./services/langsmith.service";
import { N8nController } from "./n8n.controller";
import { N8nGateway } from "./n8n.gateway";
import { N8nService } from "./n8n.service";

@Module({
  imports: [
    UsageEventsModule,
    AiConversationHistoriesModule,
    AiConversationSessionsModule,
    ProfilesModule,
    forwardRef(() => TeamsModule),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => MeetingTypesModule),
  ],
  controllers: [N8nController, LangGraphProxyController],
  providers: [AiService, N8nService, N8nGateway, LangGraphProxyService, LangSmithService],
  exports: [AiService, N8nService, LangGraphProxyService, LangSmithService],
})
export class AiModule {}
