import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Organizations } from "../../organizations/entities/organizations.entity";
import { Profile } from "../../profiles/entities/profile.entity";

@Entity("ai_conversation_sessions")
export class AiConversationSessions {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  title: string;

  @Column()
  organization_id: string;

  @Column()
  profile_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Organizations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organizations;

  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profile_id" })
  profile: Profile;
}
