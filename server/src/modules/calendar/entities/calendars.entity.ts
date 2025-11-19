import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";

import { Organizations } from "../../organizations/entities/organizations.entity";
import { Profile } from "../../profiles/entities/profile.entity";

export type CalendarProvider = "google" | "microsoft";

@Entity("calendars")
export class Calendars {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true })
  active: boolean | null;

  @Column()
  calender_id: string;

  @Column({ nullable: true })
  email: string | null;

  @Column({ nullable: true })
  name: string | null;

  @Column({ nullable: true })
  organization_id: string | null;

  @Column({ nullable: true })
  resource_id: string | null;

  @Column({
    type: "enum",
    enum: ["google", "microsoft"],
    nullable: false,
  })
  provider: CalendarProvider;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Organizations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organizations;

  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profile_id" })
  profile: Profile;
}
