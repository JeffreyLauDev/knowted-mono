import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { AiService } from "../ai/ai.service";
import { MessageContentDtoRole } from "../ai_conversation_histories/dto/message-content.dto";
import { AiConversationHistories } from "../ai_conversation_histories/entities/ai_conversation_histories.entity";

import { UpdateAiConversationSessionsDto } from "./dto/update-ai_conversation_sessions.dto";
import { AiConversationSessions } from "./entities/ai_conversation_sessions.entity";

type AccessControl = {
  organization_id: string;
  user_id: string;
};

type CreateSessionParams = {
  input: string;
  organization_id: string;
  auth_user_id: string;
};

@Injectable()
export class AiConversationSessionsService {
  constructor(
    @InjectRepository(AiConversationSessions)
    private readonly aiConversationSessionsRepository: Repository<AiConversationSessions>,
    @InjectRepository(AiConversationHistories)
    private readonly aiConversationHistoriesRepository: Repository<AiConversationHistories>,
    private readonly aiService: AiService,
  ) {}

  async create(params: CreateSessionParams) {
    const title = await this.aiService.generateTitle(
      params.input,
      params.organization_id,
      params.auth_user_id,
    );

    const session = this.aiConversationSessionsRepository.create({
      title,
      organization_id: params.organization_id,
      profile_id: params.auth_user_id,
    });

    const savedSession =
      await this.aiConversationSessionsRepository.save(session);

    // Create the initial conversation history
    await this.aiConversationHistoriesRepository.save({
      message: {
        role: MessageContentDtoRole.HUMAN,
        content: params.input,
        additional_kwargs: {},
        response_metadata: {},
      },
      session_id: savedSession.id,
    });

    // Return only the specified fields
    return {
      title: savedSession.title,
      id: savedSession.id,
      created_at: savedSession.created_at,
    };
  }

  async findAll(organizationId: string, userId: string) {
    return await this.aiConversationSessionsRepository.find({
      select: {
        id: true,
        title: true,
        created_at: true,
      },
      where: {
        organization: { id: organizationId },
        profile: { id: userId }, // Ensure users only see their own sessions
      },
      order: {
        created_at: "DESC",
      },
    });
  }

  async findByProfileId(userId: string) {
    const sessions = await this.aiConversationSessionsRepository.find({
      where: {
        profile: { id: userId }, // Users can only see their own sessions
      },
      relations: ["organization", "profile"],
      order: {
        created_at: "DESC",
      },
    });

    if (!sessions.length) {
      throw new NotFoundException("No conversations found for this profile");
    }

    return sessions;
  }

  async getConversationHistory(
    id: string,
    userId: string,
    organizationId: string,
  ) {
    // First verify the user owns this session
    const session = await this.aiConversationSessionsRepository.findOne({
      where: {
        id,
        profile: { id: userId }, // Users can only access their own sessions
        organization: { id: organizationId },
      },
      relations: ["organization", "profile"],
    });

    if (!session) {
      throw new NotFoundException(
        "Conversation session not found or access denied",
      );
    }

    const histories = await this.aiConversationHistoriesRepository.find({
      where: { session_id: id },
    });

    return histories;
  }

  async findByOrganizationId(organizationId: string, userId: string) {
    const sessions = await this.aiConversationSessionsRepository.find({
      where: {
        organization: { id: organizationId },
        profile: { id: userId }, // Ensure users only see their own sessions
      },
      relations: ["organization", "profile"],
      order: {
        created_at: "DESC",
      },
    });

    if (!sessions.length) {
      throw new NotFoundException(
        "No conversations found for this organization",
      );
    }

    return sessions;
  }

  async findOne(id: string, access: AccessControl) {
    const session = await this.aiConversationSessionsRepository.findOne({
      select: {
        id: true,
        title: true,
        created_at: true,
      },
      where: {
        id,
        organization: { id: access.organization_id },
        profile: { id: access.user_id }, // Users can only access their own sessions
      },
    });

    if (!session) {
      throw new NotFoundException(
        "Conversation session not found or access denied",
      );
    }

    return session;
  }

  async update(
    id: string,
    updateDto: UpdateAiConversationSessionsDto,
    access: AccessControl,
  ) {
    const session = await this.findOne(id, access);

    // Update only the title
    session.title = updateDto.title;
    const updatedSession =
      await this.aiConversationSessionsRepository.save(session);

    // Return only the specified fields
    return {
      id: updatedSession.id,
      title: updatedSession.title,
      created_at: updatedSession.created_at,
    };
  }

  async remove(id: string, access: AccessControl) {
    const session = await this.findOne(id, access);
    await this.aiConversationSessionsRepository.remove(session);
    return { message: "Conversation session deleted successfully" };
  }

  // Security method to verify session ownership
  async verifySessionOwnership(
    sessionId: string,
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const session = await this.aiConversationSessionsRepository.findOne({
      where: {
        id: sessionId,
        profile: { id: userId },
        organization: { id: organizationId },
      },
    });
    return !!session;
  }
}
