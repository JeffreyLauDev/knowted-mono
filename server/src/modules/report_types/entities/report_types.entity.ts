import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { MeetingType } from "../../meeting_types/entities/meeting_types.entity";
import { Organizations } from "../../organizations/entities/organizations.entity";
import { Profile } from "../../profiles/entities/profile.entity";

@Entity("report_types")
export class ReportTypes {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  report_title: string;

  @Column({ type: "text" })
  report_prompt: string;

  @Column({
    type: "jsonb",
    default: { day: "1", time: "09:00", month: null, frequency: "weekly" },
  })
  report_schedule: {
    day: string;
    time: string;
    month: string | null;
    frequency: string;
  };

  @ManyToOne(() => Organizations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organizations;

  @Column({ type: "uuid" })
  organization_id: string;

  @ManyToOne(() => Profile, { onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user: Profile;

  @Column({ type: "uuid" })
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: "boolean", default: true, nullable: true })
  active: boolean;

  @Column({ type: "date", nullable: true })
  generation_date: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  run_at_utc: Date;

  @ManyToMany(() => MeetingType)
  @JoinTable({
    name: "report_type_meeting_types",
    joinColumn: {
      name: "report_type_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "meeting_type_id",
      referencedColumnName: "id",
    },
  })
  meeting_types: MeetingType[];
}
