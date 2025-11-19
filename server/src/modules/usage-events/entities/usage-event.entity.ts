import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Organizations } from "../../organizations/entities/organizations.entity";

export enum EventType {
  MEETING_CREATED = "meeting_created",
  MEETING_COMPLETED = "meeting_completed",
  REPORT_GENERATED = "report_generated",
  QUERY_EXECUTED = "query_executed",
  STORAGE_UPLOADED = "storage_uploaded",
  AI_MEMORY_ACCESSED = "ai_memory_accessed",
  AI_TITLE_GENERATED = "ai_title_generated",
  SEAT_ADDED = "seat_added",
  SEAT_REMOVED = "seat_removed",
  MEETING_TYPE_CREATED = "meeting_type_created",
  MEETING_TYPE_DELETED = "meeting_type_deleted",
  CALL_MINUTES_USED = "call_minutes_used",
  AI_MEMORY_RETENTION_ACCESSED = "ai_memory_retention_accessed",
  MONTHLY_MINUTES_RESET = "monthly_minutes_reset",
}

@Entity("usage_events")
export class UsageEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  organization_id: string;

  @Column({ type: "uuid", nullable: true })
  user_id: string;

  @Column({ type: "enum", enum: EventType })
  event_type: EventType;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @Column({ type: "double precision", default: 1 })
  quantity: number;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => Organizations, (organization) => organization.id)
  @JoinColumn({ name: "organization_id" })
  organization: Organizations;
}
