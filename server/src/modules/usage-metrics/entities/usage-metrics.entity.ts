import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Organizations } from "../../organizations/entities/organizations.entity";

export enum MetricType {
  MEETINGS = "meetings",
  REPORTS = "reports",
  QUERIES = "queries",
  CALL_MINUTES = "call_minutes",
  STORAGE_BYTES = "storage_bytes",
  AI_MEMORY_USAGE = "ai_memory_usage",
}

@Entity("usage_metrics")
export class UsageMetrics {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  organization_id: string;

  @Column({ type: "enum", enum: MetricType })
  metric_type: MetricType;

  @Column({ type: "int", default: 0 })
  current_usage: number;

  @Column({ type: "int", default: 0 })
  limit: number;

  @Column({ type: "date" })
  period_start: Date;

  @Column({ type: "date" })
  period_end: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Organizations, (organization) => organization.id)
  @JoinColumn({ name: "organization_id" })
  organization: Organizations;
}
