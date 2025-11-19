import { CanActivate, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { MetricType } from "../../modules/usage-metrics/entities/usage-metrics.entity";
import { UsageMetricsService } from "../../modules/usage-metrics/usage-metrics.service";

export const QUOTA_KEY = "quota";
export const Quota =
  (metric: MetricType) =>
  (target: unknown, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(QUOTA_KEY, metric, descriptor?.value ?? target);
  };

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly usageMetrics: UsageMetricsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(): Promise<boolean> {
    // Since we're not storing subscription plans in the database,
    // we'll allow all quota checks for now
    // TODO: Implement quota checking based on Stripe subscription data if needed
    return true;
  }
}
