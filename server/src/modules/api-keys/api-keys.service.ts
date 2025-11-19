import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as crypto from "crypto";
import { Repository } from "typeorm";

import { CreateApiKeyDto, UpdateApiKeyDto } from "./dto/api-key.dto";
import { ApiKey } from "./entities/api-key.entity";

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    @InjectRepository(ApiKey)
    private apiKeysRepository: Repository<ApiKey>,
  ) {}

  async create(organizationId: string, createApiKeyDto: CreateApiKeyDto): Promise<ApiKey> {
    this.logger.log(`Creating API key for organization ${organizationId}`);
    
    const key = this.generateApiKey();
    const apiKey = this.apiKeysRepository.create({
      ...createApiKeyDto,
      organization_id: organizationId,
      key,
    });
    
    const savedApiKey = await this.apiKeysRepository.save(apiKey);
    this.logger.log(`API key created with ID: ${savedApiKey.id}`);
    
    return savedApiKey;
  }

  async findByOrganization(organizationId: string): Promise<ApiKey[]> {
    this.logger.log(`Finding API keys for organization ${organizationId}`);
    
    return this.apiKeysRepository.find({
      where: { organization_id: organizationId },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ApiKey> {
    this.logger.log(`Finding API key ${id}`);
    
    const apiKey = await this.apiKeysRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }
    
    return apiKey;
  }

  async update(id: string, updateData: UpdateApiKeyDto): Promise<ApiKey> {
    this.logger.log(`Updating API key ${id}`);
    
    const apiKey = await this.apiKeysRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    await this.apiKeysRepository.update(id, updateData);
    const updatedApiKey = await this.apiKeysRepository.findOne({ where: { id } });
    
    this.logger.log(`API key ${id} updated successfully`);
    return updatedApiKey;
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting API key ${id}`);
    
    const apiKey = await this.apiKeysRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    await this.apiKeysRepository.delete(id);
    this.logger.log(`API key ${id} deleted successfully`);
  }

  async toggleActive(id: string): Promise<ApiKey> {
    this.logger.log(`Toggling active status for API key ${id}`);
    
    const apiKey = await this.apiKeysRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    apiKey.is_active = !apiKey.is_active;
    const updatedApiKey = await this.apiKeysRepository.save(apiKey);
    
    this.logger.log(`API key ${id} active status toggled to: ${updatedApiKey.is_active}`);
    return updatedApiKey;
  }

  async validateApiKey(key: string): Promise<ApiKey | null> {
    this.logger.log(`Validating API key: ${key.substring(0, 8)}...`);
    
    const apiKey = await this.apiKeysRepository.findOne({
      where: { key, is_active: true },
      relations: ['organization'],
    });
    
    if (apiKey) {
      this.logger.log(`API key validated for organization: ${apiKey.organization_id}`);
    } else {
      this.logger.warn(`Invalid API key: ${key.substring(0, 8)}...`);
    }
    
    return apiKey;
  }

  private generateApiKey(): string {
    return 'kn_live_' + crypto.randomBytes(32).toString('hex');
  }
}
