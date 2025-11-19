import { PartialType } from "@nestjs/swagger";

import { CreateAiConversationHistoriesDto } from "./create-ai_conversation_histories.dto";

export class UpdateAiConversationHistoriesDto extends PartialType(
  CreateAiConversationHistoriesDto,
) {}
