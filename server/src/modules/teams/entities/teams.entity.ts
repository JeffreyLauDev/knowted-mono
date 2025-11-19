import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Organizations } from "../../organizations/entities/organizations.entity";

@Entity("teams")
@Index("IDX_org_admin", ["organization_id", "is_admin"], {
  unique: true,
  where: "is_admin = true",
})
export class Teams {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: "uuid" })
  organization_id: string;

  @ManyToOne(() => Organizations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organizations;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn({ nullable: true })
  updated_at: Date;

  @Column({ type: "boolean", default: false })
  is_admin: boolean;
}
