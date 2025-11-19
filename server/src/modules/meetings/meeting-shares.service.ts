import { randomBytes } from "crypto";

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { PinoLoggerService } from "../../common/logger/pino-logger.service";

import { CreateMeetingShareDto } from "./dto/create-meeting-share.dto";
import { MeetingShareResponseDto } from "./dto/meeting-share-response.dto";
import { UpdateMeetingShareDto } from "./dto/update-meeting-share.dto";
import { MeetingShares } from "./entities/meeting-shares.entity";

@Injectable()
export class MeetingSharesService {
  constructor(
    @InjectRepository(MeetingShares)
    private meetingSharesRepository: Repository<MeetingShares>,
    private logger: PinoLoggerService,
  ) {}

  private generateShareToken(): string {
    return randomBytes(16).toString("hex");
  }

  async createShareLink(
    createDto: CreateMeetingShareDto,
    userId: string,
  ): Promise<MeetingShareResponseDto> {
    // Check if a share link already exists for this meeting
    const existingShare = await this.meetingSharesRepository.findOne({
      where: { meeting_id: createDto.meeting_id },
    });

    if (existingShare) {
      throw new ConflictException(
        "A share link already exists for this meeting",
      );
    }

    // Generate a unique share token
    let shareToken: string;
    let isUnique = false;

    while (!isUnique) {
      shareToken = this.generateShareToken();
      const tokenExists = await this.meetingSharesRepository.findOne({
        where: { share_token: shareToken },
      });
      if (!tokenExists) {
        isUnique = true;
      }
    }

    const meetingShare = this.meetingSharesRepository.create({
      meeting_id: createDto.meeting_id,
      share_token: shareToken,
      created_by: userId,
      expires_at: createDto.expires_at ? new Date(createDto.expires_at) : null,
      is_enabled: true,
    });

    const savedShare = await this.meetingSharesRepository.save(meetingShare);

    return {
      id: savedShare.id,
      meeting_id: savedShare.meeting_id,
      share_token: savedShare.share_token,
      created_by: savedShare.created_by,
      expires_at: savedShare.expires_at,
      is_enabled: savedShare.is_enabled,
      created_at: savedShare.created_at,
      updated_at: savedShare.updated_at,
    };
  }

  async getShareLink(
    meetingId: string,
  ): Promise<MeetingShareResponseDto | null> {
    const shareLink = await this.meetingSharesRepository.findOne({
      where: { meeting_id: meetingId },
    });

    if (!shareLink) {
      return null;
    }

    return {
      id: shareLink.id,
      meeting_id: shareLink.meeting_id,
      share_token: shareLink.share_token,
      created_by: shareLink.created_by,
      expires_at: shareLink.expires_at,
      is_enabled: shareLink.is_enabled,
      created_at: shareLink.created_at,
      updated_at: shareLink.updated_at,
    };
  }

  async updateShareLink(
    meetingId: string,
    updateDto: UpdateMeetingShareDto,
  ): Promise<MeetingShareResponseDto> {
    const shareLink = await this.meetingSharesRepository.findOne({
      where: { meeting_id: meetingId },
    });

    if (!shareLink) {
      throw new NotFoundException("Share link not found for this meeting");
    }

    if (updateDto.is_enabled !== undefined) {
      shareLink.is_enabled = updateDto.is_enabled;
    }

    if (updateDto.expires_at !== undefined) {
      shareLink.expires_at = updateDto.expires_at
        ? new Date(updateDto.expires_at)
        : null;
    }

    const updatedShare = await this.meetingSharesRepository.save(shareLink);

    return {
      id: updatedShare.id,
      meeting_id: updatedShare.meeting_id,
      share_token: updatedShare.share_token,
      created_by: updatedShare.created_by,
      expires_at: updatedShare.expires_at,
      is_enabled: updatedShare.is_enabled,
      created_at: updatedShare.created_at,
      updated_at: updatedShare.updated_at,
    };
  }

  async deleteShareLink(meetingId: string): Promise<void> {
    const result = await this.meetingSharesRepository.delete({
      meeting_id: meetingId,
    });

    if (result.affected === 0) {
      throw new NotFoundException("Share link not found for this meeting");
    }
  }

  async validateShareToken(
    meetingId: string,
    shareToken: string,
  ): Promise<boolean> {
    this.logger.log(
      `🔍 validateShareToken called with:`,
      "MeetingSharesService",
      {
        meetingId,
        shareToken: shareToken.substring(0, 20) + "...",
        shareTokenLength: shareToken.length,
      },
    );

    // First, let's check if the meeting exists
    const meetingExists = await this.meetingSharesRepository.query(
      "SELECT COUNT(*) as count FROM meetings WHERE id = $1",
      [meetingId],
    );
    this.logger.log(`🔍 Meeting exists check:`, "MeetingSharesService", {
      meetingId,
      count: meetingExists[0]?.count,
    });

    // Check if there are any meeting shares for this meeting
    const shareCount = await this.meetingSharesRepository.query(
      "SELECT COUNT(*) as count FROM meeting_shares WHERE meeting_id = $1",
      [meetingId],
    );
    this.logger.log(`🔍 Meeting shares count:`, "MeetingSharesService", {
      meetingId,
      count: shareCount[0]?.count,
    });

    // Check if there are any meeting shares with the specific share token
    const tokenCount = await this.meetingSharesRepository.query(
      "SELECT COUNT(*) as count FROM meeting_shares WHERE share_token = $1",
      [shareToken],
    );
    this.logger.log(`🔍 Share token count:`, "MeetingSharesService", {
      shareToken: shareToken.substring(0, 20) + "...",
      count: tokenCount[0]?.count,
    });

    // Now do the actual validation
    const shareLink = await this.meetingSharesRepository.findOne({
      where: {
        meeting_id: meetingId,
        share_token: shareToken,
        is_enabled: true,
      },
    });

    this.logger.log(`🔍 Database query result:`, "MeetingSharesService", {
      hasShareLink: !!shareLink,
      meetingId,
      shareToken: shareToken.substring(0, 20) + "...",
      shareLinkDetails: shareLink
        ? {
            id: shareLink.id,
            meeting_id: shareLink.meeting_id,
            share_token: shareLink.share_token
              ? shareLink.share_token.substring(0, 20) + "..."
              : null,
            is_enabled: shareLink.is_enabled,
            expires_at: shareLink.expires_at,
            currentTime: new Date(),
          }
        : null,
    });

    if (!shareLink) {
      this.logger.log(
        `❌ No share link found for meeting ${meetingId} with token ${shareToken.substring(0, 20)}...`,
      );
      return false;
    }

    // Check if the link has expired
    if (shareLink.expires_at && new Date() > shareLink.expires_at) {
      this.logger.log(`❌ Share link has expired:`, "MeetingSharesService", {
        meetingId,
        expires_at: shareLink.expires_at,
        currentTime: new Date(),
        isExpired: new Date() > shareLink.expires_at,
      });
      return false;
    }

    this.logger.log(
      `✅ Share token validation successful for meeting ${meetingId}`,
    );
    return true;
  }
}
