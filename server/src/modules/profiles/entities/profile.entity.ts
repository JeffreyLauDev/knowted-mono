import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("profiles")
export class Profile {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true })
  first_name: string | null;

  @Column({ nullable: true })
  last_name: string | null;

  @Column({ nullable: true })
  avatar_url: string | null;

  @Column({ nullable: true })
  email: string | null;

  // Account deletion fields
  @Column({ type: "timestamp", nullable: true })
  deleted_at: Date | null;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
