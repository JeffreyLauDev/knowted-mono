import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { CreateAiConversationHistoriesDto } from "./dto/create-ai_conversation_histories.dto";
import { UpdateAiConversationHistoriesDto } from "./dto/update-ai_conversation_histories.dto";
import { AiConversationHistories } from "./entities/ai_conversation_histories.entity";

type QueryParams = {
  session_id?: string;
};

@Injectable()
export class AiConversationHistoriesService {
  constructor(
    @InjectRepository(AiConversationHistories)
    private aiConversationHistoriesRepository: Repository<AiConversationHistories>,
  ) {}

  async create(
    createDto: CreateAiConversationHistoriesDto,
    userId: string,
    organizationId: string,
  ) {
    // Verify the user owns the session before creating history
    const session = await this.aiConversationHistoriesRepository.manager
      .createQueryBuilder("ai_conversation_sessions", "session")
      .where("session.id = :sessionId::uuid", {
        sessionId: createDto.session_id,
      })
      .andWhere("session.profile_id = :userId", { userId })
      .andWhere("session.organization_id = :organizationId", { organizationId })
      .getOne();

    if (!session) {
      throw new Error(
        "Access denied: Session not found or user does not own this session",
      );
    }

    const history = this.aiConversationHistoriesRepository.create(createDto);
    return await this.aiConversationHistoriesRepository.save(history);
  }

  async findAll(query: QueryParams = {}) {
    return await this.aiConversationHistoriesRepository.find({
      where: query,
    });
  }

  async findBySessionId(
    sessionId: string,
    userId: string,
    organizationId: string,
  ) {
    // First verify the user owns this session by joining with sessions table
    const histories = await this.aiConversationHistoriesRepository
      .createQueryBuilder("history")
      .innerJoin(
        "ai_conversation_sessions",
        "session",
        "session.id = history.session_id::uuid",
      )
      .where("history.session_id = :sessionId", { sessionId })
      .andWhere("session.profile_id = :userId", { userId })
      .andWhere("session.organization_id = :organizationId", { organizationId })
      .select("history.*")
      .getRawMany();

    return histories;
  }

  async findOne(id: number) {
    const history = await this.aiConversationHistoriesRepository.findOne({
      where: { id },
    });
    return history;
  }

  async update(id: number, updateDto: UpdateAiConversationHistoriesDto) {
    const history = await this.findOne(id);
    if (!history) {
      return null;
    }
    Object.assign(history, updateDto);
    return await this.aiConversationHistoriesRepository.save(history);
  }

  async remove(id: number) {
    await this.aiConversationHistoriesRepository.delete(id);
    return { deleted: true };
  }
}
