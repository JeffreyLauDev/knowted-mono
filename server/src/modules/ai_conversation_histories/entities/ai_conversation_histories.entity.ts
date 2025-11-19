import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { MessageContentDto } from "../dto/message-content.dto";

@Entity("ai_conversation_histories")
export class AiConversationHistories {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "jsonb" })
  message: MessageContentDto;

  @Column()
  session_id: string;
}
