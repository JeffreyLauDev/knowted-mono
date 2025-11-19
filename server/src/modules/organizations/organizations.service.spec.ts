import { createMock } from '@golevelup/ts-jest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConfigService } from '@nestjs/config';
import { Calendars } from '../calendar/entities/calendars.entity';
import { EmailService } from '../email/email.service';
import { MeetingType } from '../meeting_types/entities/meeting_types.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { Profile } from '../profiles/entities/profile.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { Teams } from '../teams/entities/teams.entity';
import { TeamsService } from '../teams/teams.service';
import { OrganizationInvite } from './entities/organization-invite.entity';
import { Organizations } from './entities/organizations.entity';
import { UserOrganization } from './entities/user-organization.entity';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let organizationsRepository: jest.Mocked<Repository<Organizations>>;
  let userOrganizationRepository: jest.Mocked<Repository<UserOrganization>>;
  let organizationInviteRepository: jest.Mocked<Repository<OrganizationInvite>>;
  let teamsRepository: jest.Mocked<Repository<Teams>>;
  let meetingTypeRepository: jest.Mocked<Repository<MeetingType>>;
  let calendarsRepository: jest.Mocked<Repository<Calendars>>;
  let teamsService: jest.Mocked<TeamsService>;
  let profilesService: jest.Mocked<ProfilesService>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let emailService: jest.Mocked<EmailService>;
  let configService: jest.Mocked<ConfigService>;

  const mockOrganization = createMock<Organizations>({
    id: 'org-123',
    name: 'Test Organization',
    owner_id: 'user-123',
  });

  const mockAdminTeam = createMock<Teams>({
    id: 'team-123',
    name: 'Admin',
    description: 'Administrator team',
    organization_id: 'org-123',
    is_admin: true,
  });

  const mockUserOrganization = createMock<UserOrganization>({
    id: 'user-org-123',
    user_id: 'user-123',
    organization_id: 'org-123',
    team_id: 'team-123',
  });

  const mockInvitation = createMock<OrganizationInvite>({
    id: 'invite-123',
    organization_id: 'org-123',
    email: 'test@example.com',
    team_id: 'team-123',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    is_accepted: false,
  });

  const mockMeetingType = createMock<MeetingType>({
    id: 'meeting-type-123',
    name: 'Onboarding',
    description: 'Test meeting type',
    organization_id: 'org-123',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organizations),
          useValue: createMock<Repository<Organizations>>({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(UserOrganization),
          useValue: createMock<Repository<UserOrganization>>({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(OrganizationInvite),
          useValue: createMock<Repository<OrganizationInvite>>({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(Teams),
          useValue: createMock<Repository<Teams>>({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(MeetingType),
          useValue: createMock<Repository<MeetingType>>({
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(Calendars),
          useValue: createMock<Repository<Calendars>>({
            find: jest.fn(),
            remove: jest.fn(),
          }),
        },
        {
          provide: TeamsService,
          useValue: createMock<TeamsService>({
            getAdminTeams: jest.fn(),
          }),
        },
        {
          provide: ProfilesService,
          useValue: createMock<ProfilesService>({
            getProfileByEmail: jest.fn(),
          }),
        },
        {
          provide: PermissionsService,
          useValue: createMock<PermissionsService>({
            bulkSetTeamPermissions: jest.fn(),
            create: jest.fn(),
          }),
        },
        {
          provide: EmailService,
          useValue: createMock<EmailService>({
            sendOrganizationInvitation: jest.fn(),
          }),
        },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>({
            get: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    organizationsRepository = module.get(getRepositoryToken(Organizations));
    userOrganizationRepository = module.get(getRepositoryToken(UserOrganization));
    organizationInviteRepository = module.get(getRepositoryToken(OrganizationInvite));
    teamsRepository = module.get(getRepositoryToken(Teams));
    meetingTypeRepository = module.get(getRepositoryToken(MeetingType));
    calendarsRepository = module.get(getRepositoryToken(Calendars));
    teamsService = module.get(TeamsService);
    profilesService = module.get(ProfilesService);
    permissionsService = module.get(PermissionsService);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService);
  });

  describe('create', () => {
    it('should create organization with owner_id set', async () => {
      // Arrange
      const createDto = {
        name: 'Test Organization',
        website: 'https://test.com',
      };
      const userId = 'user-123';

      organizationsRepository.create.mockReturnValue(mockOrganization);
      organizationsRepository.save.mockResolvedValue(mockOrganization);
      teamsRepository.save.mockResolvedValue(mockAdminTeam);
      userOrganizationRepository.save.mockResolvedValue(mockUserOrganization);
      teamsService.getAdminTeams.mockResolvedValue([mockAdminTeam]);
      meetingTypeRepository.save.mockResolvedValue(mockMeetingType);
      permissionsService.create.mockResolvedValue({} as any);

      // Act
      const result = await service.create(createDto, userId);

      // Assert
      expect(organizationsRepository.create).toHaveBeenCalledWith({
        ...createDto,
        owner_id: userId,
      });
      expect(organizationsRepository.save).toHaveBeenCalledWith(mockOrganization);
      expect(teamsRepository.save).toHaveBeenCalledWith({
        name: 'Admin',
        description: 'Administrator team',
        organization_id: mockOrganization.id,
        is_admin: true,
      });
      expect(userOrganizationRepository.save).toHaveBeenCalledWith({
        user_id: userId,
        organization_id: mockOrganization.id,
        team_id: mockAdminTeam.id,
      });
      expect(result).toEqual(mockOrganization);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const createDto = {
        name: 'Test Organization',
        website: 'https://test.com',
      };
      const userId = 'user-123';

      organizationsRepository.create.mockReturnValue(mockOrganization);
      organizationsRepository.save.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.create(createDto, userId)).rejects.toThrow('Database error');
    });
  });

  describe('completeOnboarding', () => {
    it('should complete onboarding with proper data', async () => {
      // Arrange
      const onboardingDto = {
        name: 'Test Organization',
        website: 'https://test.com',
        company_analysis: 'Test analysis',
      };
      const userId = 'user-123';

      organizationsRepository.create.mockReturnValue(mockOrganization);
      organizationsRepository.save.mockResolvedValue(mockOrganization);
      teamsRepository.save.mockResolvedValue(mockAdminTeam);
      userOrganizationRepository.save.mockResolvedValue(mockUserOrganization);
      teamsService.getAdminTeams.mockResolvedValue([mockAdminTeam]);
      meetingTypeRepository.save.mockResolvedValue(mockMeetingType);
      permissionsService.bulkSetTeamPermissions.mockResolvedValue(undefined);
      permissionsService.create.mockResolvedValue({} as any);

      // Act
      const result = await service.completeOnboarding(onboardingDto, userId);

      // Assert
      expect(organizationsRepository.create).toHaveBeenCalledWith({
        ...onboardingDto,
        owner_id: userId,
      });
      expect(permissionsService.bulkSetTeamPermissions).toHaveBeenCalledWith(
        mockOrganization.id,
        mockAdminTeam.id,
        [
          { resource_type: 'reports', access_level: 'readWrite' },
          { resource_type: 'teams', access_level: 'readWrite' },
          { resource_type: 'report_types', access_level: 'readWrite' },
          { resource_type: 'meeting_types', access_level: 'readWrite' },
          { resource_type: 'permissions', access_level: 'readWrite' },
        ],
      );
      expect(result).toEqual(mockOrganization);
    });

    it('should handle permission setup failures', async () => {
      // Arrange
      const onboardingDto = {
        name: 'Test Organization',
        website: 'https://test.com',
      };
      const userId = 'user-123';

      organizationsRepository.create.mockReturnValue(mockOrganization);
      organizationsRepository.save.mockResolvedValue(mockOrganization);
      teamsRepository.save.mockResolvedValue(mockAdminTeam);
      userOrganizationRepository.save.mockResolvedValue(mockUserOrganization);
      teamsService.getAdminTeams.mockResolvedValue([mockAdminTeam]);
      permissionsService.bulkSetTeamPermissions.mockRejectedValue(new Error('Permission error'));

      // Act & Assert
      await expect(service.completeOnboarding(onboardingDto, userId)).rejects.toThrow('Permission error');
    });
  });

  describe('updateUserTeam', () => {
    it('should update user team successfully for non-owner', async () => {
      // Arrange
      const userId = 'user-456'; // Different user (not owner)
      const organizationId = 'org-123';
      const newTeamId = 'team-456';
      const newTeam = createMock<Teams>({
        id: 'team-456',
        name: 'New Team',
        organization_id: 'org-123',
        is_admin: false,
      });
      const nonOwnerUserOrg = createMock<UserOrganization>({
        id: 'user-org-456',
        user_id: 'user-456',
        organization_id: 'org-123',
        team_id: 'team-123',
      });

      teamsRepository.findOne.mockResolvedValue(newTeam);
      userOrganizationRepository.findOne.mockResolvedValue(nonOwnerUserOrg);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.update.mockResolvedValue({ affected: 1 } as any);
      userOrganizationRepository.findOne.mockResolvedValueOnce(nonOwnerUserOrg).mockResolvedValueOnce({
        ...nonOwnerUserOrg,
        team_id: newTeamId,
      });

      // Act
      const result = await service.updateUserTeam(userId, organizationId, newTeamId);

      // Assert
      expect(teamsRepository.findOne).toHaveBeenCalledWith({
        where: { id: newTeamId, organization_id: organizationId },
      });
      expect(userOrganizationRepository.update).toHaveBeenCalledWith(
        { id: nonOwnerUserOrg.id },
        { team_id: newTeamId },
      );
      expect(result.team_id).toBe(newTeamId);
    });

    it('should prevent organization owner from moving to non-admin team', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-123';
      const newTeamId = 'team-456';
      const newTeam = createMock<Teams>({
        id: 'team-456',
        name: 'New Team',
        organization_id: 'org-123',
        is_admin: false,
      });

      teamsRepository.findOne.mockResolvedValue(newTeam);
      userOrganizationRepository.findOne.mockResolvedValue(mockUserOrganization);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);

      // Act & Assert
      await expect(service.updateUserTeam(userId, organizationId, newTeamId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(teamsRepository.findOne).toHaveBeenCalledWith({
        where: { id: newTeamId, organization_id: organizationId },
      });
    });

    it('should allow organization owner to move to admin team', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-123';
      const newTeamId = 'team-456';
      const newTeam = createMock<Teams>({
        id: 'team-456',
        name: 'Admin Team',
        organization_id: 'org-123',
        is_admin: true,
      });

      teamsRepository.findOne.mockResolvedValue(newTeam);
      userOrganizationRepository.findOne.mockResolvedValue(mockUserOrganization);
      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.update.mockResolvedValue({ affected: 1 } as any);
      userOrganizationRepository.findOne.mockResolvedValueOnce(mockUserOrganization).mockResolvedValueOnce({
        ...mockUserOrganization,
        team_id: newTeamId,
      });

      // Act
      const result = await service.updateUserTeam(userId, organizationId, newTeamId);

      // Assert
      expect(result.team_id).toBe(newTeamId);
    });

    it('should handle team not found error', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-123';
      const newTeamId = 'team-456';

      teamsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateUserTeam(userId, organizationId, newTeamId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle user not found error', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-123';
      const newTeamId = 'team-456';
      const newTeam = createMock<Teams>({
        id: 'team-456',
        name: 'New Team',
        organization_id: 'org-123',
        is_admin: false,
      });

      teamsRepository.findOne.mockResolvedValue(newTeam);
      userOrganizationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateUserTeam(userId, organizationId, newTeamId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('inviteUser', () => {
    it('should create invitation successfully for existing user', async () => {
      // Arrange
      const organizationId = 'org-123';
      const inviteData = {
        email: 'test@example.com',
        team_id: 'team-123',
      };
      const existingProfile = createMock<Profile>({
        id: 'profile-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar_url: null,
        deleted_at: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      organizationInviteRepository.findOne.mockResolvedValue(null);
      organizationInviteRepository.create.mockReturnValue(mockInvitation);
      organizationInviteRepository.save.mockResolvedValue(mockInvitation);
      profilesService.getProfileByEmail.mockResolvedValue(existingProfile);
      teamsRepository.findOne.mockResolvedValue(mockAdminTeam);
      emailService.sendOrganizationInvitation.mockResolvedValue(undefined);

      // Act
      const result = await service.inviteUser(organizationId, inviteData);

      // Assert
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({ where: { id: organizationId } });
      expect(organizationInviteRepository.create).toHaveBeenCalledWith({
        organization_id: organizationId,
        email: inviteData.email,
        team_id: inviteData.team_id,
        expires_at: expect.any(Date),
        is_accepted: false,
      });
      expect(emailService.sendOrganizationInvitation).toHaveBeenCalledWith(
        inviteData.email,
        'there',
        mockOrganization.name,
        mockInvitation.id,
        mockAdminTeam.name,
      );
      expect(result.message).toBe('Invitation sent successfully to existing user.');
    });

    it('should create invitation successfully for new user', async () => {
      // Arrange
      const organizationId = 'org-123';
      const inviteData = {
        email: 'newuser@example.com',
        team_id: 'team-123',
      };

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      organizationInviteRepository.findOne.mockResolvedValue(null);
      organizationInviteRepository.create.mockReturnValue(mockInvitation);
      organizationInviteRepository.save.mockResolvedValue(mockInvitation);
      profilesService.getProfileByEmail.mockResolvedValue(null);
      teamsRepository.findOne.mockResolvedValue(mockAdminTeam);
      emailService.sendOrganizationInvitation.mockResolvedValue(undefined);

      // Act
      const result = await service.inviteUser(organizationId, inviteData);

      // Assert
      expect(emailService.sendOrganizationInvitation).toHaveBeenCalledWith(
        inviteData.email,
        'there',
        mockOrganization.name,
        mockInvitation.id,
        mockAdminTeam.name,
      );
      expect(result.message).toBe('Invitation sent successfully');
    });

    it('should handle duplicate invitation error', async () => {
      // Arrange
      const organizationId = 'org-123';
      const inviteData = {
        email: 'test@example.com',
        team_id: 'team-123',
      };

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      organizationInviteRepository.findOne.mockResolvedValue(mockInvitation);

      // Act & Assert
      await expect(service.inviteUser(organizationId, inviteData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle email sending failure and clean up invitation', async () => {
      // Arrange
      const organizationId = 'org-123';
      const inviteData = {
        email: 'test@example.com',
        team_id: 'team-123',
      };
      const existingProfile = createMock<Profile>({
        id: 'profile-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar_url: null,
        deleted_at: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      organizationInviteRepository.findOne.mockResolvedValue(null);
      organizationInviteRepository.create.mockReturnValue(mockInvitation);
      organizationInviteRepository.save.mockResolvedValue(mockInvitation);
      profilesService.getProfileByEmail.mockResolvedValue(existingProfile);
      teamsRepository.findOne.mockResolvedValue(mockAdminTeam);
      emailService.sendOrganizationInvitation.mockRejectedValue(new Error('Email failed'));
      organizationInviteRepository.remove.mockResolvedValue(mockInvitation);

      // Act & Assert
      await expect(service.inviteUser(organizationId, inviteData)).rejects.toThrow(
        ConflictException,
      );
      expect(organizationInviteRepository.remove).toHaveBeenCalledWith(mockInvitation);
    });

    it('should validate organization exists', async () => {
      // Arrange
      const organizationId = 'org-123';
      const inviteData = {
        email: 'test@example.com',
        team_id: 'team-123',
      };

      organizationsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.inviteUser(organizationId, inviteData)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('acceptInvitation', () => {
    it('should accept valid invitation', async () => {
      // Arrange
      const invitationId = 'invite-123';
      const userId = 'user-123';
      const userEmail = 'test@example.com';
      const invitationWithRelations = {
        ...mockInvitation,
        organization: mockOrganization,
        team: mockAdminTeam,
      };

      organizationInviteRepository.findOne.mockResolvedValue(invitationWithRelations);
      userOrganizationRepository.findOne.mockResolvedValue(null);
      organizationInviteRepository.update.mockResolvedValue({ affected: 1 } as any);
      userOrganizationRepository.create.mockReturnValue(mockUserOrganization);
      userOrganizationRepository.save.mockResolvedValue(mockUserOrganization);

      // Act
      const result = await service.acceptInvitation(invitationId, userId, userEmail);

      // Assert
      expect(organizationInviteRepository.findOne).toHaveBeenCalledWith({
        where: { id: invitationId },
        relations: ['organization', 'team'],
      });
      expect(organizationInviteRepository.update).toHaveBeenCalledWith(
        { id: invitationId },
        {
          is_accepted: true,
          accepted_by_user_id: userId,
        },
      );
      expect(userOrganizationRepository.create).toHaveBeenCalledWith({
        user_id: userId,
        organization_id: mockInvitation.organization_id,
        team_id: mockInvitation.team_id,
      });
      expect(result.message).toBe('Invitation accepted successfully');
    });

    it('should handle expired invitation', async () => {
      // Arrange
      const invitationId = 'invite-123';
      const userId = 'user-123';
      const userEmail = 'test@example.com';
      const expiredInvitation = {
        ...mockInvitation,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      organizationInviteRepository.findOne.mockResolvedValue(expiredInvitation);

      // Act & Assert
      await expect(service.acceptInvitation(invitationId, userId, userEmail)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle already accepted invitation', async () => {
      // Arrange
      const invitationId = 'invite-123';
      const userId = 'user-123';
      const userEmail = 'test@example.com';
      const acceptedInvitation = {
        ...mockInvitation,
        is_accepted: true,
      };

      organizationInviteRepository.findOne.mockResolvedValue(acceptedInvitation);

      // Act & Assert
      await expect(service.acceptInvitation(invitationId, userId, userEmail)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should validate email match', async () => {
      // Arrange
      const invitationId = 'invite-123';
      const userId = 'user-123';
      const userEmail = 'different@example.com';

      organizationInviteRepository.findOne.mockResolvedValue(mockInvitation);

      // Act & Assert
      await expect(service.acceptInvitation(invitationId, userId, userEmail)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should handle user already member error', async () => {
      // Arrange
      const invitationId = 'invite-123';
      const userId = 'user-123';
      const userEmail = 'test@example.com';

      organizationInviteRepository.findOne.mockResolvedValue(mockInvitation);
      userOrganizationRepository.findOne.mockResolvedValue(mockUserOrganization);

      // Act & Assert
      await expect(service.acceptInvitation(invitationId, userId, userEmail)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle invitation not found error', async () => {
      // Arrange
      const invitationId = 'invite-123';
      const userId = 'user-123';
      const userEmail = 'test@example.com';

      organizationInviteRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.acceptInvitation(invitationId, userId, userEmail)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createDefaultMeetingTypes', () => {
    it('should create all default meeting types', async () => {
      // Arrange
      const organizationId = 'org-123';
      const adminTeams = [mockAdminTeam];

      teamsService.getAdminTeams.mockResolvedValue(adminTeams);
      meetingTypeRepository.create.mockReturnValue(mockMeetingType);
      meetingTypeRepository.save.mockResolvedValue(mockMeetingType);
      permissionsService.create.mockResolvedValue({} as any);

      // Act
      await service.createDefaultMeetingTypes(organizationId);

      // Assert
      expect(teamsService.getAdminTeams).toHaveBeenCalledWith(organizationId);
      expect(meetingTypeRepository.create).toHaveBeenCalledTimes(4); // 4 default meeting types
      expect(permissionsService.create).toHaveBeenCalledTimes(4); // 4 permissions for admin team
    });

    it('should handle permission creation failures', async () => {
      // Arrange
      const organizationId = 'org-123';
      const adminTeams = [mockAdminTeam];

      teamsService.getAdminTeams.mockResolvedValue(adminTeams);
      meetingTypeRepository.create.mockReturnValue(mockMeetingType);
      meetingTypeRepository.save.mockResolvedValue(mockMeetingType);
      permissionsService.create.mockRejectedValue(new Error('Permission error'));

      // Act & Assert
      await expect(service.createDefaultMeetingTypes(organizationId)).rejects.toThrow('Permission error');
    });
  });

  describe('bulkInviteUsers', () => {
    it('should successfully process bulk invitations', async () => {
      // Arrange
      const organizationId = 'org-123';
      const bulkInviteData = {
        users: [
          { email: 'user1@example.com', team_id: 'team-123' },
          { email: 'user2@example.com', team_id: 'team-456' },
        ],
      };

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      organizationInviteRepository.findOne.mockResolvedValue(null);
      organizationInviteRepository.create.mockReturnValue(mockInvitation);
      organizationInviteRepository.save.mockResolvedValue(mockInvitation);
      profilesService.getProfileByEmail.mockResolvedValue(null);
      teamsRepository.findOne.mockResolvedValue(mockAdminTeam);
      emailService.sendOrganizationInvitation.mockResolvedValue(undefined);

      // Act
      const result = await service.bulkInviteUsers(organizationId, bulkInviteData);

      // Assert
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({ where: { id: organizationId } });
      expect(organizationInviteRepository.create).toHaveBeenCalledTimes(2);
      expect(emailService.sendOrganizationInvitation).toHaveBeenCalledTimes(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.total_processed).toBe(2);
    });

    it('should handle partial failures in bulk invitations', async () => {
      // Arrange
      const organizationId = 'org-123';
      const bulkInviteData = {
        users: [
          { email: 'user1@example.com', team_id: 'team-123' },
          { email: 'user2@example.com', team_id: 'team-456' },
        ],
      };

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      organizationInviteRepository.findOne
        .mockResolvedValueOnce(null) // First user - no existing invite
        .mockResolvedValueOnce(mockInvitation); // Second user - existing invite
      organizationInviteRepository.create.mockReturnValue(mockInvitation);
      organizationInviteRepository.save.mockResolvedValue(mockInvitation);
      profilesService.getProfileByEmail.mockResolvedValue(null);
      teamsRepository.findOne.mockResolvedValue(mockAdminTeam);
      emailService.sendOrganizationInvitation.mockResolvedValue(undefined);

      // Act
      const result = await service.bulkInviteUsers(organizationId, bulkInviteData);

      // Assert
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.total_processed).toBe(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    });

    it('should handle email sending failures in bulk invitations', async () => {
      // Arrange
      const organizationId = 'org-123';
      const bulkInviteData = {
        users: [
          { email: 'user1@example.com', team_id: 'team-123' },
        ],
      };

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      organizationInviteRepository.findOne.mockResolvedValue(null);
      organizationInviteRepository.create.mockReturnValue(mockInvitation);
      organizationInviteRepository.save.mockResolvedValue(mockInvitation);
      profilesService.getProfileByEmail.mockResolvedValue(null);
      teamsRepository.findOne.mockResolvedValue(mockAdminTeam);
      emailService.sendOrganizationInvitation.mockRejectedValue(new Error('Email failed'));
      organizationInviteRepository.remove.mockResolvedValue(mockInvitation);

      // Act
      const result = await service.bulkInviteUsers(organizationId, bulkInviteData);

      // Assert
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Failed to send invitation email');
      expect(organizationInviteRepository.remove).toHaveBeenCalledWith(mockInvitation);
    });

    it('should validate organization exists', async () => {
      // Arrange
      const organizationId = 'org-123';
      const bulkInviteData = {
        users: [{ email: 'user1@example.com', team_id: 'team-123' }],
      };

      organizationsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.bulkInviteUsers(organizationId, bulkInviteData)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeUserFromOrganization', () => {
    it('should successfully remove user from organization', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-123';
      const mockCalendars = [
        createMock<Calendars>({
          id: 'calendar-1',
          organization_id: organizationId,
          profile: { id: userId },
        }),
      ];

      calendarsRepository.find.mockResolvedValue(mockCalendars);
      calendarsRepository.remove.mockResolvedValue(mockCalendars as any);
      userOrganizationRepository.delete.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.removeUserFromOrganization(userId, organizationId);

      // Assert
      expect(calendarsRepository.find).toHaveBeenCalledWith({
        where: {
          organization_id: organizationId,
          profile: { id: userId },
        },
      });
      expect(userOrganizationRepository.delete).toHaveBeenCalledWith({
        user_id: userId,
        organization_id: organizationId,
      });
      expect(result.deleted).toBe(true);
    });

    it('should handle user not found in organization', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-123';

      calendarsRepository.find.mockResolvedValue([]);
      userOrganizationRepository.delete.mockResolvedValue({ affected: 0 } as any);

      // Act
      const result = await service.removeUserFromOrganization(userId, organizationId);

      // Assert
      expect(result.deleted).toBe(false);
    });

    it('should handle calendar cleanup failures gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-123';
      const mockCalendars = [
        createMock<Calendars>({
          id: 'calendar-1',
          organization_id: organizationId,
          profile: { id: userId },
        }),
      ];

      calendarsRepository.find.mockResolvedValue(mockCalendars);
      calendarsRepository.remove.mockRejectedValue(new Error('Calendar cleanup failed'));
      userOrganizationRepository.delete.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.removeUserFromOrganization(userId, organizationId);

      // Assert
      expect(result.deleted).toBe(true);
      // Should not throw error even if calendar cleanup fails
    });
  });

  describe('getUserOrganizations', () => {
    it('should return user organizations successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUserOrgs = [
        createMock<UserOrganization>({
          id: 'user-org-1',
          user_id: userId,
          organization_id: 'org-1',
          organization: createMock<Organizations>({
            id: 'org-1',
            name: 'Organization 1',
          }),
        }),
        createMock<UserOrganization>({
          id: 'user-org-2',
          user_id: userId,
          organization_id: 'org-2',
          organization: createMock<Organizations>({
            id: 'org-2',
            name: 'Organization 2',
          }),
        }),
      ];

      userOrganizationRepository.find.mockResolvedValue(mockUserOrgs);

      // Act
      const result = await service.getUserOrganizations(userId);

      // Assert
      expect(userOrganizationRepository.find).toHaveBeenCalledWith({
        where: { user_id: userId },
        relations: ['organization'],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'org-1',
        name: 'Organization 1',
      });
      expect(result[1]).toEqual({
        id: 'org-2',
        name: 'Organization 2',
      });
    });

    it('should return empty array when user has no organizations', async () => {
      // Arrange
      const userId = 'user-123';

      userOrganizationRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getUserOrganizations(userId);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('getPendingInvitations', () => {
    it('should return pending invitations successfully', async () => {
      // Arrange
      const organizationId = 'org-123';
      const mockInvitations = [
        createMock<OrganizationInvite>({
          id: 'invite-1',
          organization_id: organizationId,
          email: 'user1@example.com',
          team_id: 'team-123',
          team: createMock<Teams>({
            id: 'team-123',
            name: 'Team 1',
          }),
          created_at: new Date(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          is_accepted: false,
        }),
        createMock<OrganizationInvite>({
          id: 'invite-2',
          organization_id: organizationId,
          email: 'user2@example.com',
          team_id: 'team-456',
          team: createMock<Teams>({
            id: 'team-456',
            name: 'Team 2',
          }),
          created_at: new Date(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          is_accepted: false,
        }),
      ];

      organizationInviteRepository.find.mockResolvedValue(mockInvitations);

      // Act
      const result = await service.getPendingInvitations(organizationId);

      // Assert
      expect(organizationInviteRepository.find).toHaveBeenCalledWith({
        where: {
          organization_id: organizationId,
          is_accepted: false,
        },
        relations: ['team'],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'invite-1',
        organization_id: organizationId,
        team_id: 'team-123',
        team_name: 'Team 1',
        email: 'user1@example.com',
        created_at: expect.any(Date),
        expires_at: expect.any(Date),
        is_accepted: false,
        accepted_by_user_id: expect.any(Function),
      });
    });

    it('should filter out expired invitations', async () => {
      // Arrange
      const organizationId = 'org-123';
      const now = new Date();
      const mockInvitations = [
        createMock<OrganizationInvite>({
          id: 'invite-1',
          organization_id: organizationId,
          email: 'user1@example.com',
          team_id: 'team-123',
          team: createMock<Teams>({
            id: 'team-123',
            name: 'Team 1',
          }),
          created_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
          expires_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (expired)
          is_accepted: false,
        }),
        createMock<OrganizationInvite>({
          id: 'invite-2',
          organization_id: organizationId,
          email: 'user2@example.com',
          team_id: 'team-456',
          team: createMock<Teams>({
            id: 'team-456',
            name: 'Team 2',
          }),
          created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          expires_at: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now (valid)
          is_accepted: false,
        }),
      ];

      organizationInviteRepository.find.mockResolvedValue(mockInvitations);

      // Act
      const result = await service.getPendingInvitations(organizationId);

      // Assert
      expect(result).toHaveLength(1); // Only non-expired invitation
      expect(result[0].id).toBe('invite-2');
    });

    it('should return empty array when no pending invitations', async () => {
      // Arrange
      const organizationId = 'org-123';

      organizationInviteRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getPendingInvitations(organizationId);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return organization when found', async () => {
      // Arrange
      const organizationId = 'org-123';
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
      });

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);

      // Act
      const result = await service.findOne(organizationId);

      // Assert
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      const organizationId = 'org-123';

      organizationsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(organizationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOneWithUserAccess', () => {
    it('should return organization when user has access', async () => {
      // Arrange
      const organizationId = 'org-123';
      const userId = 'user-123';
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
      });
      const mockUserOrg = createMock<UserOrganization>({
        user_id: userId,
        organization_id: organizationId,
      });

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.findOne.mockResolvedValue(mockUserOrg);

      // Act
      const result = await service.findOneWithUserAccess(organizationId, userId);

      // Assert
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
        select: [
          'id',
          'name',
          'website',
          'company_analysis',
          'company_type',
          'team_size',
          'business_description',
          'business_offering',
          'industry',
          'target_audience',
          'channels',
        ],
      });
      expect(userOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: userId, organization_id: organizationId },
      });
      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      const organizationId = 'org-123';
      const userId = 'user-123';

      organizationsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOneWithUserAccess(organizationId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user has no access', async () => {
      // Arrange
      const organizationId = 'org-123';
      const userId = 'user-123';
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
      });

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOneWithUserAccess(organizationId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all organizations when no query provided', async () => {
      // Arrange
      const mockOrganizations = [
        createMock<Organizations>({ id: 'org-1', name: 'Org 1' }),
        createMock<Organizations>({ id: 'org-2', name: 'Org 2' }),
      ];

      organizationsRepository.find.mockResolvedValue(mockOrganizations);

      // Act
      const result = await service.findAll();

      // Assert
      expect(organizationsRepository.find).toHaveBeenCalledWith({
        where: {},
        select: ['id', 'name'],
      });
      expect(result).toEqual(mockOrganizations);
    });

    it('should return filtered organizations when query provided', async () => {
      // Arrange
      const query = { name: 'Test Org' };
      const mockOrganizations = [
        createMock<Organizations>({ id: 'org-1', name: 'Test Org' }),
      ];

      organizationsRepository.find.mockResolvedValue(mockOrganizations);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(organizationsRepository.find).toHaveBeenCalledWith({
        where: query,
        select: ['id', 'name'],
      });
      expect(result).toEqual(mockOrganizations);
    });
  });

  describe('update', () => {
    it('should update organization successfully', async () => {
      // Arrange
      const organizationId = 'org-123';
      const updateData = { name: 'Updated Organization' };
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
      });
      const updatedOrganization = { ...mockOrganization, ...updateData };

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      organizationsRepository.save.mockResolvedValue(updatedOrganization);

      // Act
      const result = await service.update(organizationId, updateData);

      // Assert
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(organizationsRepository.save).toHaveBeenCalledWith(updatedOrganization);
      expect(result).toEqual(updatedOrganization);
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      const organizationId = 'org-123';
      const updateData = { name: 'Updated Organization' };

      organizationsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(organizationId, updateData)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateWithUserAccess', () => {
    it('should update organization when user has access', async () => {
      // Arrange
      const organizationId = 'org-123';
      const userId = 'user-123';
      const updateData = { name: 'Updated Organization' };
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
      });
      const updatedOrganization = { ...mockOrganization, ...updateData };
      const mockUserOrg = createMock<UserOrganization>({
        user_id: userId,
        organization_id: organizationId,
      });

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.findOne.mockResolvedValue(mockUserOrg);
      organizationsRepository.save.mockResolvedValue(updatedOrganization);

      // Act
      const result = await service.updateWithUserAccess(organizationId, updateData, userId);

      // Assert
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
        select: [
          'id',
          'name',
          'website',
          'company_analysis',
          'company_type',
          'team_size',
          'business_description',
          'business_offering',
          'industry',
          'target_audience',
          'channels',
        ],
      });
      expect(userOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: userId, organization_id: organizationId },
      });
      expect(result).toEqual(updatedOrganization);
    });

    it('should throw NotFoundException when user has no access', async () => {
      // Arrange
      const organizationId = 'org-123';
      const userId = 'user-123';
      const updateData = { name: 'Updated Organization' };
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
      });

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateWithUserAccess(organizationId, updateData, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateOnboardingWithUserAccess', () => {
    it('should update onboarding data when user has access', async () => {
      // Arrange
      const organizationId = 'org-123';
      const userId = 'user-123';
      const onboardingData = { name: 'Test Organization', company_type: 'Technology' };
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
      });
      const updatedOrganization = { ...mockOrganization, ...onboardingData };
      const mockUserOrg = createMock<UserOrganization>({
        user_id: userId,
        organization_id: organizationId,
      });

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.findOne.mockResolvedValue(mockUserOrg);
      organizationsRepository.save.mockResolvedValue(updatedOrganization);

      // Act
      const result = await service.updateOnboardingWithUserAccess(organizationId, onboardingData, userId);

      // Assert
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
        select: [
          'id',
          'name',
          'website',
          'company_analysis',
          'company_type',
          'team_size',
          'business_description',
          'business_offering',
          'industry',
          'target_audience',
          'channels',
        ],
      });
      expect(result).toEqual(updatedOrganization);
    });
  });

  describe('remove', () => {
    it('should remove organization and cleanup calendars', async () => {
      // Arrange
      const organizationId = 'org-123';
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
      });
      const mockUserOrgs = [
        createMock<UserOrganization>({
          user_id: 'user-1',
          organization_id: organizationId,
        }),
        createMock<UserOrganization>({
          user_id: 'user-2',
          organization_id: organizationId,
        }),
      ];

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.find.mockResolvedValue(mockUserOrgs);
      calendarsRepository.find.mockResolvedValue([]);
      userOrganizationRepository.delete.mockResolvedValue({ affected: 2 } as any);
      organizationsRepository.remove.mockResolvedValue(mockOrganization);

      // Act
      const result = await service.remove(organizationId);

      // Assert
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(userOrganizationRepository.find).toHaveBeenCalledWith({
        where: { organization_id: organizationId },
      });
      expect(userOrganizationRepository.delete).toHaveBeenCalledWith({
        organization_id: organizationId,
      });
      expect(organizationsRepository.remove).toHaveBeenCalledWith(mockOrganization);
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      const organizationId = 'org-123';

      organizationsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(organizationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeWithUserAccess', () => {
    it('should remove organization when user has access', async () => {
      // Arrange
      const organizationId = 'org-123';
      const userId = 'user-123';
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
      });
      const mockUserOrg = createMock<UserOrganization>({
        user_id: userId,
        organization_id: organizationId,
      });
      const mockUserOrgs = [mockUserOrg];

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.findOne.mockResolvedValue(mockUserOrg);
      userOrganizationRepository.find.mockResolvedValue(mockUserOrgs);
      calendarsRepository.find.mockResolvedValue([]);
      userOrganizationRepository.delete.mockResolvedValue({ affected: 1 } as any);
      organizationsRepository.remove.mockResolvedValue(mockOrganization);

      // Act
      const result = await service.removeWithUserAccess(organizationId, userId);

      // Assert
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when user has no access', async () => {
      // Arrange
      const organizationId = 'org-123';
      const userId = 'user-123';
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
      });

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.removeWithUserAccess(organizationId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateApiToken', () => {
    it('should generate new API token', async () => {
      // Arrange
      const organizationId = 'org-123';
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
        api_token: null,
      });
      const updatedOrganization = { ...mockOrganization, api_token: 'new-token-123' };

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      organizationsRepository.save.mockResolvedValue(updatedOrganization);

      // Act
      const result = await service.updateApiToken(organizationId);

      // Assert
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(organizationsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: organizationId,
          api_token: expect.any(String),
        }),
      );
      expect(result).toEqual({ token: expect.any(String) });
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      const organizationId = 'org-123';

      organizationsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateApiToken(organizationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateApiTokenWithUserAccess', () => {
    it('should generate new API token when user has access', async () => {
      // Arrange
      const organizationId = 'org-123';
      const userId = 'user-123';
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
        api_token: null,
      });
      const mockUserOrg = createMock<UserOrganization>({
        user_id: userId,
        organization_id: organizationId,
      });

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.findOne.mockResolvedValue(mockUserOrg);
      organizationsRepository.save.mockResolvedValue({ ...mockOrganization, api_token: 'new-token-123' });

      // Act
      const result = await service.updateApiTokenWithUserAccess(organizationId, userId);

      // Assert
      expect(result).toEqual({ token: expect.any(String) });
    });

    it('should throw NotFoundException when user has no access', async () => {
      // Arrange
      const organizationId = 'org-123';
      const userId = 'user-123';
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
      });

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateApiTokenWithUserAccess(organizationId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addUserToOrganization', () => {
    it('should add user to organization successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-123';
      const mockOrganization = createMock<Organizations>({
        id: organizationId,
        name: 'Test Organization',
      });
      const mockUserOrg = createMock<UserOrganization>({
        user_id: userId,
        organization_id: organizationId,
      });

      organizationsRepository.findOne.mockResolvedValue(mockOrganization);
      userOrganizationRepository.create.mockReturnValue(mockUserOrg);
      userOrganizationRepository.save.mockResolvedValue(mockUserOrg);

      // Act
      const result = await service.addUserToOrganization(userId, organizationId);

      // Assert
      expect(organizationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(userOrganizationRepository.create).toHaveBeenCalledWith({
        user_id: userId,
        organization_id: organizationId,
      });
      expect(result).toEqual(mockUserOrg);
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-123';

      organizationsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.addUserToOrganization(userId, organizationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-123';
      const mockUserOrg = createMock<UserOrganization>({
        id: 'user-org-123',
        user_id: userId,
        organization_id: organizationId,
      });

      userOrganizationRepository.findOne.mockResolvedValue(mockUserOrg);
      userOrganizationRepository.save.mockResolvedValue(mockUserOrg);

      // Act
      const result = await service.updateUserRole(userId, organizationId);

      // Assert
      expect(userOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: userId, organization_id: organizationId },
      });
      expect(userOrganizationRepository.save).toHaveBeenCalledWith(mockUserOrg);
      expect(result).toEqual(mockUserOrg);
    });

    it('should throw NotFoundException when user-organization relationship not found', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-123';

      userOrganizationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateUserRole(userId, organizationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getOrganizationMembers', () => {
    it('should return organization members successfully', async () => {
      // Arrange
      const organizationId = 'org-123';
      const mockMembers = [
        createMock<UserOrganization>({
          user_id: 'user-1',
          user: createMock<Profile>({
            id: 'user-1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
          }),
          team: createMock<Teams>({
            id: 'team-1',
            name: 'Admin',
          }),
        }),
        createMock<UserOrganization>({
          user_id: 'user-2',
          user: createMock<Profile>({
            id: 'user-2',
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane@example.com',
          }),
          team: createMock<Teams>({
            id: 'team-2',
            name: 'Member',
          }),
        }),
      ];

      userOrganizationRepository.find.mockResolvedValue(mockMembers);

      // Act
      const result = await service.getOrganizationMembers(organizationId);

      // Assert
      expect(userOrganizationRepository.find).toHaveBeenCalledWith({
        where: { organization_id: organizationId },
        relations: ['user', 'team'],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'user-1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        team: 'Admin',
      });
      expect(result[1]).toEqual({
        id: 'user-2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        team: 'Member',
      });
    });

    it('should return empty array when no members', async () => {
      // Arrange
      const organizationId = 'org-123';

      userOrganizationRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getOrganizationMembers(organizationId);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('getInvitationById', () => {
    it('should return invitation when found', async () => {
      // Arrange
      const invitationId = 'invite-123';
      const mockInvitation = createMock<OrganizationInvite>({
        id: invitationId,
        organization_id: 'org-123',
        email: 'user@example.com',
        organization: createMock<Organizations>({
          id: 'org-123',
          name: 'Test Organization',
        }),
      });

      organizationInviteRepository.findOne.mockResolvedValue(mockInvitation);

      // Act
      const result = await service.getInvitationById(invitationId);

      // Assert
      expect(organizationInviteRepository.findOne).toHaveBeenCalledWith({
        where: { id: invitationId },
        relations: ['organization'],
      });
      expect(result).toEqual(mockInvitation);
    });

    it('should return null when invitation not found', async () => {
      // Arrange
      const invitationId = 'invite-123';

      organizationInviteRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getInvitationById(invitationId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation successfully', async () => {
      // Arrange
      const invitationId = 'invite-123';
      const organizationId = 'org-123';
      const userId = 'user-123';
      const mockInvitation = createMock<OrganizationInvite>({
        id: invitationId,
        organization_id: organizationId,
        email: 'user@example.com',
        is_accepted: false,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        organization: createMock<Organizations>({
          id: organizationId,
          name: 'Test Organization',
        }),
      });

      organizationInviteRepository.findOne.mockResolvedValue(mockInvitation);
      organizationInviteRepository.remove.mockResolvedValue(mockInvitation);

      // Act
      const result = await service.cancelInvitation(invitationId, organizationId, userId);

      // Assert
      expect(organizationInviteRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: invitationId,
          organization_id: organizationId,
        },
        relations: ['organization'],
      });
      expect(organizationInviteRepository.remove).toHaveBeenCalledWith(mockInvitation);
      expect(result).toEqual({
        message: 'Invitation cancelled successfully',
        invitation_id: invitationId,
        organization_id: organizationId,
      });
    });

    it('should throw NotFoundException when invitation not found', async () => {
      // Arrange
      const invitationId = 'invite-123';
      const organizationId = 'org-123';
      const userId = 'user-123';

      organizationInviteRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cancelInvitation(invitationId, organizationId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when invitation already accepted', async () => {
      // Arrange
      const invitationId = 'invite-123';
      const organizationId = 'org-123';
      const userId = 'user-123';
      const mockInvitation = createMock<OrganizationInvite>({
        id: invitationId,
        organization_id: organizationId,
        email: 'user@example.com',
        is_accepted: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        organization: createMock<Organizations>({
          id: organizationId,
          name: 'Test Organization',
        }),
      });

      organizationInviteRepository.findOne.mockResolvedValue(mockInvitation);

      // Act & Assert
      await expect(service.cancelInvitation(invitationId, organizationId, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when invitation expired', async () => {
      // Arrange
      const invitationId = 'invite-123';
      const organizationId = 'org-123';
      const userId = 'user-123';
      const mockInvitation = createMock<OrganizationInvite>({
        id: invitationId,
        organization_id: organizationId,
        email: 'user@example.com',
        is_accepted: false,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago (expired)
        organization: createMock<Organizations>({
          id: organizationId,
          name: 'Test Organization',
        }),
      });

      organizationInviteRepository.findOne.mockResolvedValue(mockInvitation);

      // Act & Assert
      await expect(service.cancelInvitation(invitationId, organizationId, userId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getUserInvitations', () => {
    it('should return user invitations successfully', async () => {
      // Arrange
      const userEmail = 'user@example.com';
      const mockInvitations = [
        createMock<OrganizationInvite>({
          id: 'invite-1',
          organization_id: 'org-1',
          email: userEmail,
          is_accepted: false,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          organization: createMock<Organizations>({
            id: 'org-1',
            name: 'Organization 1',
          }),
          team: createMock<Teams>({
            id: 'team-1',
            name: 'Team 1',
          }),
        }),
        createMock<OrganizationInvite>({
          id: 'invite-2',
          organization_id: 'org-2',
          email: userEmail,
          is_accepted: false,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          organization: createMock<Organizations>({
            id: 'org-2',
            name: 'Organization 2',
          }),
          team: createMock<Teams>({
            id: 'team-2',
            name: 'Team 2',
          }),
        }),
      ];

      organizationInviteRepository.find.mockResolvedValue(mockInvitations);

      // Act
      const result = await service.getUserInvitations(userEmail);

      // Assert
      expect(organizationInviteRepository.find).toHaveBeenCalledWith({
        where: {
          email: userEmail,
          is_accepted: false,
        },
        relations: ['organization', 'team'],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'invite-1',
        organization: {
          id: 'org-1',
          name: 'Organization 1',
        },
        team: {
          id: 'team-1',
          name: 'Team 1',
        },
        email: userEmail,
        created_at: expect.any(Date),
        expires_at: expect.any(Date),
        role: 'Member',
        status: 'pending',
        invited_by: undefined,
      });
    });

    it('should filter out expired invitations', async () => {
      // Arrange
      const userEmail = 'user@example.com';
      const now = new Date();
      const mockInvitations = [
        createMock<OrganizationInvite>({
          id: 'invite-1',
          organization_id: 'org-1',
          email: userEmail,
          is_accepted: false,
          created_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
          expires_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (expired)
          organization: createMock<Organizations>({
            id: 'org-1',
            name: 'Organization 1',
          }),
          team: createMock<Teams>({
            id: 'team-1',
            name: 'Team 1',
          }),
        }),
        createMock<OrganizationInvite>({
          id: 'invite-2',
          organization_id: 'org-2',
          email: userEmail,
          is_accepted: false,
          created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          expires_at: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now (valid)
          organization: createMock<Organizations>({
            id: 'org-2',
            name: 'Organization 2',
          }),
          team: createMock<Teams>({
            id: 'team-2',
            name: 'Team 2',
          }),
        }),
      ];

      organizationInviteRepository.find.mockResolvedValue(mockInvitations);

      // Act
      const result = await service.getUserInvitations(userEmail);

      // Assert
      expect(result).toHaveLength(1); // Only non-expired invitation
      expect(result[0].id).toBe('invite-2');
    });

    it('should return empty array when no invitations', async () => {
      // Arrange
      const userEmail = 'user@example.com';

      organizationInviteRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getUserInvitations(userEmail);

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});
