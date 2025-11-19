import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { MeetingType } from "../../meeting_types/entities/meeting_types.entity";
import { Organizations } from "../../organizations/entities/organizations.entity";
import { Profile } from "../../profiles/entities/profile.entity";
import { Teams } from "../../teams/entities/teams.entity";
import { TranscriptJsonDto } from "../dto/transcript-segment.dto";

@Entity("meetings")
export class Meetings {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "boolean", nullable: true, default: false })
  analysed: boolean;

  @Column({ type: "varchar", nullable: true })
  bot_id: string;

  @Column({ type: "varchar", nullable: true })
  chapters: string;

  @Column({ type: "double precision", nullable: true })
  duration_mins: number;

  @Column({ type: "varchar", nullable: true })
  host_email: string;

  @Column({ type: "timestamp with time zone", nullable: true })
  meeting_date: Date;

  @Column({ type: "varchar", nullable: true })
  meeting_url: string;

  @Column({ type: "jsonb", nullable: true })
  meta_data: Record<string, unknown>;

  @Column({ type: "text", array: true, nullable: true })
  participants_email: string[];

  @Column({ type: "varchar", nullable: true })
  summary: string;

  @Column({ type: "varchar", nullable: true })
  email_summary: string;

  @Column({ type: "jsonb", nullable: true })
  summary_meta_data: Record<string, unknown>;

  @Column({ type: "varchar", nullable: true })
  thumbnail: string;

  @Column({ type: "varchar", nullable: true })
  title: string;

  @Column({ type: "text", nullable: true })
  transcript: string;

  @Column({ type: "jsonb", nullable: true })
  transcript_json: TranscriptJsonDto;

  @Column({ type: "varchar", nullable: true })
  transcript_url: string;

  @Column({ type: "varchar", nullable: true })
  video_url: string;

  @Column({ 
    type: "varchar", 
    nullable: true,
    default: "none"
  })
  video_processing_status: "none" | "processing" | "completed" | "failed";

  @Column({ type: "varchar", nullable: true })
  user_id: string;

  @Column({ type: "uuid", nullable: true })
  organization_id: string;

  @Column({ type: "uuid", nullable: true })
  team_id: string;

  @Column({ type: "varchar", nullable: true })
  calendar_id: string;

  @Column({ type: "text", nullable: true })
  log: string;

  @ManyToOne(() => Organizations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organizations;

  @ManyToOne(() => Profile, { onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  profile: Profile;

  @ManyToOne(() => Teams, { onDelete: "SET NULL" })
  @JoinColumn({ name: "team_id" })
  team: Teams;

  @ManyToOne(() => MeetingType, { onDelete: "CASCADE" })
  @JoinColumn({ name: "meeting_type_id" })
  meetingType: MeetingType;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
