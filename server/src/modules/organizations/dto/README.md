# Organization Invitation DTOs

This directory contains all the DTOs (Data Transfer Objects) for organization invitation functionality. These DTOs provide type-safe interfaces for the frontend to use when working with invitation-related API endpoints.

## Available DTOs

### InvitationResponseDto
Used for individual invitation data structures returned by the API.

**Properties:**
- `id: string` - Invitation ID
- `organization?: OrganizationInfoDto` - Organization information
- `team?: TeamInfoDto` - Team information  
- `invited_by?: InvitedByDto` - Information about who sent the invitation
- `role?: string` - User role in the organization
- `status?: string` - Invitation status
- `created_at?: string` - When the invitation was created
- `expires_at?: string` - When the invitation expires

### AcceptInvitationResponseDto
Used for the response when accepting an invitation.

**Properties:**
- `message: string` - Success message
- `organization: OrganizationInfoDto` - Organization information
- `team: TeamInfoDto` - Team information

### PendingInvitationResponseDto
Used for pending invitation lists (admin view).

**Properties:**
- `id: string` - Invitation ID
- `organization_id: string` - Organization ID
- `team_id: string` - Team ID
- `team_name: string` - Team name
- `email: string` - Email of the invited user
- `first_name: string` - First name of the invited user
- `last_name: string` - Last name of the invited user
- `created_at: Date` - When the invitation was created
- `expires_at: Date` - When the invitation expires
- `is_accepted: boolean` - Whether the invitation has been accepted
- `accepted_by_user_id?: string | null` - User ID who accepted the invitation

### Supporting DTOs

#### OrganizationInfoDto
- `id: string` - Organization ID
- `name: string` - Organization name
- `description?: string` - Organization description

#### TeamInfoDto
- `id: string` - Team ID
- `name: string` - Team name
- `description?: string` - Team description

#### InvitedByDto
- `id: string` - User ID of the person who sent the invitation
- `first_name: string` - First name
- `last_name: string` - Last name
- `email: string` - Email address

## API Endpoints

### Get User's Invitations
```
GET /api/v1/organizations/api/v1/my-invitations
```
**Response:** `InvitationResponseDto[]`

### Get Organization's Pending Invitations (Admin)
```
GET /api/v1/organizations/:id/pending-invitations
```
**Response:** `PendingInvitationResponseDto[]`

### Accept Invitation
```
POST /api/v1/organizations/accept-invitation
```
**Request:** `AcceptInvitationDto`
**Response:** `AcceptInvitationResponseDto`

## Frontend Usage

Instead of defining your own interfaces, import these DTOs:

```typescript
import {
  InvitationResponseDto,
  AcceptInvitationResponseDto,
  PendingInvitationResponseDto,
  AcceptInvitationDto
} from 'path/to/backend/src/modules/organizations/dto';

// Use in your API calls
const invitations: InvitationResponseDto[] = await api.getMyInvitations();
const acceptResponse: AcceptInvitationResponseDto = await api.acceptInvitation(invitationId);
```

## Benefits

1. **Type Safety**: Ensures frontend and backend are using the same data structures
2. **Documentation**: Each property is documented with descriptions and examples
3. **Consistency**: All invitation-related data follows the same structure
4. **Maintainability**: Changes to the API structure are reflected in the DTOs
5. **IDE Support**: Full autocomplete and type checking in TypeScript 