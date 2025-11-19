import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { OrganizationSubscription } from "./entities/organization-subscription.entity";

@Injectable()
export class OrganizationSubscriptionsService {
  constructor(
    @InjectRepository(OrganizationSubscription)
    private readonly orgSubRepo: Repository<OrganizationSubscription>,
  ) {}

  async upsertFromStripeWebhook(
    orgId: string,
    data: Partial<OrganizationSubscription>,
  ): Promise<OrganizationSubscription> {
    let sub = await this.orgSubRepo.findOne({
      where: { organization_id: orgId },
    });
    if (!sub) {
      sub = this.orgSubRepo.create({ organization_id: orgId, ...data });
    } else {
      Object.assign(sub, data);
    }
    return this.orgSubRepo.save(sub);
  }
}
