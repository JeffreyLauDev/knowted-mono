import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Teams } from "../../teams/entities/teams.entity";

import { OrganizationsType } from "./organization.types";

@Entity("organization_invites")
export class OrganizationInvite {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  organization_id: string;

  @ManyToOne("Organizations", "invites", { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: OrganizationsType;

  @Column({ type: "uuid" })
  team_id: string;

  @ManyToOne(() => Teams)
  @JoinColumn({ name: "team_id" })
  team: Teams;

  @Column({ type: "text" })
  email: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: "timestamp with time zone" })
  expires_at: Date;

  @Column({ type: "boolean", default: false })
  is_accepted: boolean;

  @Column({ type: "uuid", nullable: true })
  accepted_by_user_id: string | null;
}
