// Re-export the DTOs from the generated API for convenience
export type {
  AcceptInvitationResponseDto, InvitationResponseDto, InvitedByDto, OrganizationInfoDto,
  TeamInfoDto
} from '@/api/generated/models';

// Keep this interface if it's still needed for backward compatibility
// Otherwise, we can use AcceptInvitationResponseDto directly
export interface AcceptInvitationResponse {
  organization_id: string;
  message?: string;
}
