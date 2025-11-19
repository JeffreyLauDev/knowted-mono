import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as crypto from "crypto";
import { Repository } from "typeorm";

import { CreateWebhookDto, UpdateWebhookDto } from "./dto/webhook.dto";
import { Webhook } from "./entities/webhook.entity";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Webhook)
    private webhooksRepository: Repository<Webhook>,
  ) {}

  async create(organizationId: string, createWebhookDto: CreateWebhookDto): Promise<Webhook> {
    this.logger.log(`Creating webhook for organization ${organizationId}`);
    
    const secret = this.generateWebhookSecret();
    const webhook = this.webhooksRepository.create({
      ...createWebhookDto,
      organization_id: organizationId,
      secret,
    });
    
    const savedWebhook = await this.webhooksRepository.save(webhook);
    this.logger.log(`Webhook created with ID: ${savedWebhook.id}`);
    
    return savedWebhook;
  }

  async findByOrganization(organizationId: string): Promise<Webhook | null> {
    this.logger.log(`Finding webhook for organization ${organizationId}`);
    
    return this.webhooksRepository.findOne({
      where: { organization_id: organizationId },
    });
  }

  async update(id: string, updateData: UpdateWebhookDto): Promise<Webhook> {
    this.logger.log(`Updating webhook ${id}`);
    
    const webhook = await this.webhooksRepository.findOne({ where: { id } });
    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    await this.webhooksRepository.update(id, updateData);
    const updatedWebhook = await this.webhooksRepository.findOne({ where: { id } });
    
    this.logger.log(`Webhook ${id} updated successfully`);
    return updatedWebhook;
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting webhook ${id}`);
    
    const webhook = await this.webhooksRepository.findOne({ where: { id } });
    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    await this.webhooksRepository.delete(id);
    this.logger.log(`Webhook ${id} deleted successfully`);
  }

  async toggleActive(id: string): Promise<Webhook> {
    this.logger.log(`Toggling active status for webhook ${id}`);
    
    const webhook = await this.webhooksRepository.findOne({ where: { id } });
    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    webhook.is_active = !webhook.is_active;
    const updatedWebhook = await this.webhooksRepository.save(webhook);
    
    this.logger.log(`Webhook ${id} active status toggled to: ${updatedWebhook.is_active}`);
    return updatedWebhook;
  }

  private generateWebhookSecret(): string {
    return 'whsec_' + crypto.randomBytes(32).toString('hex');
  }
}
