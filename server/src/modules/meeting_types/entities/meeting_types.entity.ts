import { ApiProperty } from "@nestjs/swagger";

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
import { MeetingTypeInterface } from "../interfaces/meeting_type.interface";

export type AnalysisMetadataStructure = Record<string, string> | null;

@Entity("meeting_types")
export class MeetingType implements MeetingTypeInterface {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: "jsonb", nullable: true })
  analysis_metadata_structure: AnalysisMetadataStructure;

  @Column()
  organization_id: string;

  @ManyToOne(() => Organizations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organizations;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export class MeetingTypeResponse {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  id: string;

  @ApiProperty({ example: "Sales Call" })
  name: string;

  @ApiProperty({ example: "Standard sales call meeting type", required: false })
  description?: string;

  @ApiProperty({
    example: {
      customer_name: "string",
      deal_size: "number",
      next_steps: "string",
      pain_points: "array",
    },
    required: false,
  })
  analysis_metadata_structure?: AnalysisMetadataStructure;
}
