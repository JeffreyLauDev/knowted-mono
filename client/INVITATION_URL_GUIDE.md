# Organization Invitation URL Guide

## Overview
This document describes the professional URL format for accepting organization invitations in the Knowted frontend application.

## URL Format
```
http://localhost:8081/accept-invite/{invitationId}
```

### Example
```
http://localhost:8081/accept-invite/123e4567-e89b-12d3-a456-426614174000
```

## Implementation Details

### Route Configuration
- **Route**: `/accept-invite/:invitationId`
- **Component**: `AcceptInvitation.tsx`
- **Location**: `src/pages/AcceptInvitation.tsx`

### Data Structure
The invitation acceptance system uses the following backend DTOs:

- **InvitationResponseDto** - For individual invitation data structures
  - Includes nested DTOs: OrganizationInfoDto, TeamInfoDto, InvitedByDto
  - Covers all invitation properties with proper typing
- **AcceptInvitationResponseDto** - For the response when accepting an invitation
  - Provides organization and team information after acceptance
- **OrganizationInfoDto** - Organization details (id, name, description)
- **TeamInfoDto** - Team details (id, name, description)
- **InvitedByDto** - Information about who sent the invitation

### Features

#### Authentication Handling
- Redirects unauthenticated users to login page
- Preserves invitation URL for post-login redirect
- Seamless authentication flow

#### Invitation Details Display
- **Organization Information**: Name, description, role
- **Team Information**: Team name and description (if applicable)
- **Inviter Details**: Name of person who sent the invitation
- **Timestamps**: When the invitation was sent
- **Status**: Current invitation status

#### User Experience
- Professional, clean UI design
- Loading states during data fetching
- Error handling for expired/invalid invitations
- Success feedback with automatic redirect
- Responsive design for all devices

### API Integration

#### Fetching Invitation Data
```typescript
const { data: invitations } = useOrganizationsControllerGetMyInvitations({
  query: {
    enabled: !!isAuthenticated && !loading,
    refetchInterval: 30000,
    staleTime: 0,
    gcTime: 5 * 60 * 1000
  }
});
```

#### Accepting Invitations
```typescript
const { mutate: acceptInvitation } = useOrganizationsControllerAcceptInvitation({
  mutation: {
    onSuccess: () => {
      // Handle success - redirect to dashboard
    },
    onError: (error) => {
      // Handle error - show appropriate message
    }
  }
});
```

### Error Handling
- **Invalid Invitation ID**: Shows appropriate error message
- **Expired Invitations**: Handles gracefully with user feedback
- **Already Accepted**: Prevents duplicate acceptance
- **Network Errors**: Retry mechanisms and user-friendly messages

### Security Considerations
- Invitation IDs are validated against user's actual invitations
- Authentication required for all operations
- Proper error handling prevents information leakage
- Secure redirect handling after authentication

## Usage Examples

### Direct URL Access
Users can directly visit invitation URLs:
```
http://localhost:8081/accept-invite/abc123-def456-ghi789
```

### Email Integration
Invitation emails can include direct links:
```html
<a href="http://localhost:8081/accept-invite/abc123-def456-ghi789">
  Accept Invitation
</a>
```

### Programmatic Access
Components can navigate to invitation URLs:
```typescript
navigate(`/accept-invite/${invitationId}`);
```

## Testing
- Test with valid invitation IDs
- Test with invalid/expired invitations
- Test authentication flow
- Test error scenarios
- Test responsive design

## Future Enhancements
- Bulk invitation acceptance
- Invitation expiration warnings
- Enhanced analytics tracking
- Mobile app deep linking support

## Backend Email Template

For the backend team, here's the recommended email template structure:

```html
<h2>You've been invited to join {organization_name}</h2>
<p>{invited_by_name} has invited you to join {organization_name} on Knowted.</p>
<p>Click the link below to accept the invitation:</p>
<a href="https://app.knowted.com/accept-invite/{invitation_id}">
  Accept Invitation
</a>
<p>Or copy and paste this URL into your browser:</p>
<p>https://app.knowted.com/accept-invite/{invitation_id}</p>
```

## Troubleshooting

### Common Issues
1. **404 Error**: Check that the route is properly configured
2. **Authentication Loop**: Ensure `AuthOnlyRoute` is working correctly
3. **API Errors**: Verify the backend endpoint is accessible
4. **Redirect Issues**: Check the login redirect logic

### Debug Steps
1. Check browser console for errors
2. Verify invitation ID format (UUID)
3. Confirm user authentication status
4. Test API endpoint directly 