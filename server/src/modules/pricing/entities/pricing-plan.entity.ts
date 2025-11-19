import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum PlanTier {
  FREE = "free",
  PERSONAL = "personal",
  BUSINESS = "business",
  COMPANY = "company",
  CUSTOM = "custom",
}

export enum BillingCycle {
  MONTHLY = "monthly",
  ANNUAL = "annual",
}

@Entity("pricing_plans")
export class PricingPlan {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "enum", enum: PlanTier })
  tier: PlanTier;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  monthlyPrice: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  annualPrice: number;

  @Column({ type: "varchar" })
  cta: string;

  @Column({ type: "int" })
  seatLimit: number;

  @Column({ type: "boolean", default: false })
  isPopular: boolean;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "int", nullable: true })
  inheritedFromPlanId: number;

  @Column({ type: "varchar", nullable: true })
  stripeProductId: string;

  @Column({ type: "varchar", nullable: true })
  stripeMonthlyPriceId: string;

  @Column({ type: "varchar", nullable: true })
  stripeAnnualPriceId: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
