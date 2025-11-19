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
import { ReportTypes } from "../../report_types/entities/report_types.entity";
import { Teams } from "../../teams/entities/teams.entity";
import {
  ACCESS_LEVELS,
  AccessLevel,
  RESOURCE_TYPES,
  ResourceType,
} from "../types/permissions.types";

@Entity("permissions")
export class Permissions {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: RESOURCE_TYPES,
  })
  resource_type: ResourceType;

  @Column({ type: "uuid", nullable: true })
  resource_id: string;

  @Column({ type: "enum", enum: ACCESS_LEVELS, default: "read" })
  access_level: AccessLevel;

  @Column({ type: "uuid" })
  team_id: string;

  @ManyToOne(() => Teams, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team: Teams;

  meetingType?: MeetingType;
  reportType?: ReportTypes;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
