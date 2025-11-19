import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { FindOptionsWhere, Repository } from "typeorm";

import { EventType } from "../usage-events/entities/usage-event.entity";
import { UsageEventsService } from "../usage-events/usage-events.service";

import { CreateReportsDto } from "./dto/create-reports.dto";
import { UpdateReportsDto } from "./dto/update-reports.dto";
import { Reports } from "./entities/reports.entity";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Reports)
    private reportsRepository: Repository<Reports>,
    private usageEventsService: UsageEventsService,
  ) {}

  async create(createReportsDto: CreateReportsDto, userId: string) {
    const report = this.reportsRepository.create({
      ...createReportsDto,
      user_id: userId,
    });

    const savedReport = await this.reportsRepository.save(report);

    // Track report creation
    await this.usageEventsService.logEvent(
      createReportsDto.organization_id,
      EventType.REPORT_GENERATED,
      userId,
      {
        reportId: savedReport.id,
        reportType: createReportsDto.report_type_id,
      },
      1,
    );

    return savedReport;
  }

  async findAll(query: FindOptionsWhere<Reports> = {}) {
    return await this.reportsRepository.find({
      where: query,
      order: {
        created_at: "DESC",
      },
    });
  }

  async findOne(id: string) {
    const report = await this.reportsRepository.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }
    return report;
  }

  async update(id: string, updateReportsDto: UpdateReportsDto) {
    const report = await this.findOne(id);
    Object.assign(report, updateReportsDto);
    return await this.reportsRepository.save(report);
  }

  async remove(id: string) {
    const report = await this.findOne(id);
    await this.reportsRepository.remove(report);
    return { deleted: true };
  }
}
