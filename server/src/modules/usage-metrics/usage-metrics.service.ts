import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { MetricType, UsageMetrics } from "./entities/usage-metrics.entity";

@Injectable()
export class UsageMetricsService {
  constructor(
    @InjectRepository(UsageMetrics)
    private readonly usageRepo: Repository<UsageMetrics>,
  ) {}

  async increment(
    orgId: string,
    metric: MetricType,
    amount = 1,
  ): Promise<UsageMetrics> {
    let usage = await this.usageRepo.findOne({
      where: { organization_id: orgId, metric_type: metric },
    });
    if (!usage) {
      usage = this.usageRepo.create({
        organization_id: orgId,
        metric_type: metric,
        current_usage: 0,
        period_start: new Date(),
        period_end: new Date(),
      });
    }
    usage.current_usage += amount;
    return this.usageRepo.save(usage);
  }

  async getUsage(
    orgId: string,
    metric: MetricType,
  ): Promise<UsageMetrics | null> {
    return this.usageRepo.findOne({
      where: { organization_id: orgId, metric_type: metric },
    });
  }

  async resetUsage(orgId: string, metric: MetricType): Promise<UsageMetrics> {
    let usage = await this.usageRepo.findOne({
      where: { organization_id: orgId, metric_type: metric },
    });
    if (!usage) {
      usage = this.usageRepo.create({
        organization_id: orgId,
        metric_type: metric,
        current_usage: 0,
        period_start: new Date(),
        period_end: new Date(),
      });
    } else {
      usage.current_usage = 0;
    }
    return this.usageRepo.save(usage);
  }

  async checkLimit(
    orgId: string,
    metric: MetricType,
    limit: number,
  ): Promise<boolean> {
    const usage = await this.getUsage(orgId, metric);
    return (usage?.current_usage ?? 0) < limit;
  }
}
