import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { Meetings } from "../meetings/entities/meetings.entity";
import { Organizations } from "../organizations/entities/organizations.entity";
import { UserOrganization } from "../organizations/entities/user-organization.entity";

import { Profile } from "./entities/profile.entity";

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Meetings)
    private readonly meetingsRepository: Repository<Meetings>,
    @InjectRepository(Organizations)
    private readonly organizationsRepository: Repository<Organizations>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
  ) {}

  async getProfile(userId: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { id: userId },
    });

    if (!profile) {
      throw new NotFoundException(`Profile not found for user ${userId}`);
    }

    return profile;
  }

  async getProfileByEmail(email: string): Promise<Profile | null> {
    const profile = await this.profileRepository.findOne({
      where: { email },
    });

    return profile;
  }

  async getOrCreateProfile(userId: string, email: string): Promise<Profile> {
    let profile = await this.profileRepository.findOne({
      where: { id: userId },
    });

    if (!profile) {
      this.logger.log(
        `Creating new profile for user ${userId} with email ${email}`,
      );
      profile = this.profileRepository.create({
        id: userId,
        email: email,
      });
      profile = await this.profileRepository.save(profile);
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    updates: Partial<Profile>,
  ): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { id: userId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Profile not found for user ${userId}. Please ensure you have completed the registration process.`,
      );
    }

    Object.assign(profile, updates);
    return this.profileRepository.save(profile);
  }

  async deleteAccount(userId: string): Promise<void> {
    this.logger.log(`Starting account deletion for user ${userId}`);

    // Soft delete the profile
    await this.profileRepository.update(userId, {
      deleted_at: new Date(),
      is_active: false,
    });

    // Remove user from all organizations (this will trigger cleanup)
    await this.userOrganizationRepository.delete({ user_id: userId });

    // Anonymize meetings (keep for organization records)
    await this.meetingsRepository.update(
      { user_id: userId },
      {
        user_id: null,
        host_email: null,
        participants_email: [],
        transcript: null,
        summary: null,
        email_summary: null,
      },
    );

    this.logger.log(`Account deletion completed for user ${userId}`);
  }

  async exportUserData(userId: string): Promise<any> {
    this.logger.log(`Exporting data for user ${userId}`);

    const profile = await this.getProfile(userId);

    // Get user organizations to check permissions
    const userOrgs = await this.userOrganizationRepository.find({
      where: { user_id: userId },
      relations: ["organization", "team"],
    });

    const organizations = userOrgs.map((org) => ({
      id: org.organization.id,
      name: org.organization.name,
      team_name: org.team.name,
      is_admin: org.team.is_admin,
      joined_at: org.created_at,
    }));

    // Check if user is admin in any team
    const isOwnerOrAdmin = userOrgs.some((org) => org.team.is_admin);

    // Only include meeting data if user is owner or admin
    let meetings: any[] = [];
    if (isOwnerOrAdmin) {
      this.logger.log(
        `User ${userId} has admin/owner role, including meeting data in export`,
      );
      const meetingsData = await this.meetingsRepository.find({
        where: { user_id: userId },
        select: [
          "id",
          "title",
          "summary",
          "transcript",
          "meeting_date",
          "duration_mins",
          "participants_email",
          "created_at",
          "updated_at",
        ],
      });

      meetings = meetingsData.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        summary: meeting.summary,
        transcript: meeting.transcript,
        meeting_date: meeting.meeting_date,
        duration_mins: meeting.duration_mins,
        participants_email: meeting.participants_email,
        created_at: meeting.created_at,
        updated_at: meeting.updated_at,
      }));
    } else {
      this.logger.log(
        `User ${userId} does not have admin/owner role, excluding meeting data from export`,
      );
    }

    return {
      profile: {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
      meetings,
      organizations,
      exportDate: new Date(),
      permissions: {
        canExportMeetings: isOwnerOrAdmin,
        reason: isOwnerOrAdmin
          ? "User has admin or owner role"
          : "Meeting data restricted to admin and owner roles only",
      },
    };
  }
}
