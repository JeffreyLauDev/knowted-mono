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
import { ReportTypes } from "../../report_types/entities/report_types.entity";

@Entity("reports")
export class Reports {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text" })
  report_title: string;

  @Column({ type: "date" })
  report_date: string;

  @Column({ type: "jsonb" })
  report_detail: Record<string, unknown>;

  @Column({ type: "jsonb" })
  report_prompt: Record<string, unknown>;

  @Column({ type: "enum", enum: ["pending", "completed", "failed"] })
  report_status: "pending" | "completed" | "failed";

  @ManyToOne(() => MeetingType, { onDelete: "CASCADE" })
  @JoinColumn({ name: "meeting_type_id" })
  meetingType: MeetingType;

  @ManyToOne(() => ReportTypes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "report_type_id" })
  reportType: ReportTypes;

  @ManyToOne(() => Organizations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organizations;

  @Column({ type: "uuid" })
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
