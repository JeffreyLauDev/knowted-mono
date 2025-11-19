import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Profile } from "../../profiles/entities/profile.entity";
import { Teams } from "../../teams/entities/teams.entity";

import { OrganizationsType } from "./organization.types";

@Entity("user_organizations")
export class UserOrganization {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", nullable: true })
  user_id: string;

  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: Profile;

  @Column({ type: "uuid" })
  organization_id: string;

  @ManyToOne("Organizations", "userOrganizations", { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: OrganizationsType;

  @Column({ type: "uuid" })
  team_id: string;

  @ManyToOne(() => Teams)
  @JoinColumn({ name: "team_id" })
  team: Teams;

  @CreateDateColumn()
  created_at: Date;

  @Column({ name: "google_oauth_refresh_token", nullable: true })
  google_oauth_refresh_token: string;

  @Column({ name: "microsoft_oauth_refresh_token", nullable: true })
  microsoft_oauth_refresh_token: string;

  @Column({ name: "google_calendar_synced_at", nullable: true })
  google_calendar_synced_at: Date;

  @Column({ name: "microsoft_calendar_synced_at", nullable: true })
  microsoft_calendar_synced_at: Date;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
}
