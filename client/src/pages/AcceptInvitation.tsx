import { useOrganizationsControllerAcceptInvitation, useOrganizationsControllerGetMyInvitations, useTeamsControllerFindOne } from '@/api/generated/knowtedAPI';
import type { AcceptInvitationDto, InvitationResponseDto } from '@/api/generated/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import { Building2, CheckCircle, Clock, Loader2, User, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

const AcceptInvitation = (): JSX.Element => {
  const { invitationId } = useParams<{ invitationId: string }>();
  const { isAuthenticated, loading } = useAuth();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's invitations to find the specific invitation details
  const { data: invitations, isLoading: isLoadingInvitations } = useOrganizationsControllerGetMyInvitations({
    query: {
      enabled: !!isAuthenticated && !loading,
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 0,
      gcTime: 5 * 60 * 1000
    }
  });

  // Find the specific invitation by ID
  const currentInvitation = useMemo(() => {
    if (!invitations || !Array.isArray(invitations) || !invitationId) {
      return null;
    }
    return (invitations as InvitationResponseDto[]).find((inv) => inv.id === invitationId);
  }, [invitations, invitationId]);

  // Fetch team details if invitation has team_id but no team object
  const { data: teamData } = useTeamsControllerFindOne(
    currentInvitation?.team?.id || '',
    { organization_id: currentInvitation?.organization?.id || '' },
    {
      query: {
        enabled: !!currentInvitation?.team?.id &&
                !!currentInvitation?.organization?.id &&
                !currentInvitation?.team?.name
      }
    }
  );

  // Use team data from invitation or fallback to fetched team data
  const teamInfo = currentInvitation?.team || (teamData as { name: string; description?: string } | undefined);

  // Accept invitation mutation
  const { mutate: acceptInvitation } = useOrganizationsControllerAcceptInvitation({
    mutation: {
      onSuccess: () => {
        setIsAccepting(false);
        setIsSuccess(true);
        toast.success('Invitation accepted successfully!');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      },
      onError: (error) => {
        setIsAccepting(false);
        console.error('Error accepting invitation:', error);
        setError('Failed to accept invitation. The invitation may have expired or already been accepted.');
        toast.error('Failed to accept invitation. Please try again.');
      }
    }
  });

  const handleAcceptInvitation = (): void => {
    if (!invitationId) {
      return;
    }

    setIsAccepting(true);
    setError(null);

    const acceptData: AcceptInvitationDto = {
      invitation_id: invitationId
    };

    acceptInvitation({ data: acceptData });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Show loading while checking authentication or loading invitations
  if (loading || isLoadingInvitations) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: `/accept-invite/${invitationId}` }} replace />;
  }

  // Show error if invitation not found
  if (!currentInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Building2 className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Invitation Not Found</CardTitle>
            <CardDescription>
              The invitation you're looking for doesn't exist or may have expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/dashboard'} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">Invitation Accepted!</CardTitle>
            <CardDescription>
              You have successfully joined {currentInvitation.organization?.name || 'the organization'}
              {teamInfo?.name && ` and the ${teamInfo.name} team`}. Redirecting you to the dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Accept Organization Invitation</CardTitle>
          <CardDescription>
            You've been invited to join an organization. Review the details below and click accept to join.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Organization Details */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-sm">
                  {currentInvitation.organization?.name || 'Unknown Organization'}
                </h4>
                {currentInvitation.organization?.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentInvitation.organization.description}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                {currentInvitation.role || 'Member'}
              </Badge>
            </div>

            {/* Team Information */}
            {teamInfo?.name && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>
                  Team: {teamInfo.name}
                  {teamInfo.description && ` - ${teamInfo.description}`}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>
                Team: {currentInvitation.team?.name || 'Unknown Team'}
              </span>
            </div>

            {currentInvitation.created_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Sent {formatDate(currentInvitation.created_at)}</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleAcceptInvitation}
            disabled={isAccepting}
            className="w-full"
            size="lg"
          >
            {isAccepting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting Invitation...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Invitation
              </>
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              By accepting this invitation, you'll be added to {currentInvitation.organization?.name || 'the organization'}
              {teamInfo?.name && ` and the ${teamInfo.name} team`} with the role of {currentInvitation.role || 'Member'}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
