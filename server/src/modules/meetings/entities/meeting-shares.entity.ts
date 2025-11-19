import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Profile } from "../../profiles/entities/profile.entity";

import { Meetings } from "./meetings.entity";

@Entity("meeting_shares")
export class MeetingShares {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", nullable: false })
  meeting_id: string;

  @Column({ type: "varchar", nullable: false, unique: true })
  share_token: string;

  @Column({ type: "uuid", nullable: false })
  created_by: string;

  @Column({ type: "timestamp with time zone", nullable: true })
  expires_at: Date;

  @Column({ type: "boolean", default: true })
  is_enabled: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Meetings, { onDelete: "CASCADE" })
  @JoinColumn({ name: "meeting_id" })
  meeting: Meetings;

  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "created_by" })
  creator: Profile;
}
