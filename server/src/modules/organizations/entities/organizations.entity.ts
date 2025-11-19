import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Profile } from "../../profiles/entities/profile.entity";

import { OrganizationInvite } from "./organization-invite.entity";
import { IUserOrganization, OrganizationsType } from "./organization.types";

// Main Entity
@Entity("organizations")
export class Organizations implements OrganizationsType {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: "text", nullable: true })
  name: string | null;

  @Column({ type: "text", nullable: true })
  api_token: string | null;

  // Onboarding fields
  @Column({ type: "text", nullable: true })
  website: string | null;

  @Column({ type: "text", nullable: true })
  company_analysis: string | null;

  @Column({ type: "text", nullable: true })
  company_type: string | null;

  @Column({ type: "text", nullable: true })
  team_size: string | null;

  @Column({ type: "text", nullable: true })
  business_description: string | null;

  @Column({ type: "text", nullable: true })
  business_offering: string | null;

  @Column({ type: "text", nullable: true })
  industry: string | null;

  @Column({ type: "text", nullable: true })
  target_audience: string | null;

  @Column({ type: "text", nullable: true })
  channels: string | null;

  @Column({ type: "varchar", nullable: true })
  stripe_customer_id: string | null;

  @Column({ type: "varchar", nullable: true })
  stripe_subscription_id: string | null;

  @ManyToOne(() => Profile)
  @JoinColumn({ name: "owner_id" })
  owner: Profile;

  @Column({ type: "uuid", nullable: false })
  owner_id: string;

  @OneToMany("UserOrganization", "organization")
  userOrganizations: IUserOrganization[];

  @OneToMany(() => OrganizationInvite, (invite) => invite.organization)
  invites: OrganizationInvite[];
}

// Relation Types
export type OrganizationWithUsers = Organizations & {
  userOrganizations: IUserOrganization[];
};

export type UserOrganizationWithOrg = IUserOrganization;
