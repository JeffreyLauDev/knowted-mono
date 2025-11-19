import { useOrganizationsControllerAcceptInvitation, useOrganizationsControllerCompleteOnboarding } from '@/api/generated/knowtedAPI';
import CompleteStep from '@/components/onboarding/CompleteStep';
import { useAuth } from '@/context/AuthContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const CompleteStepPage = (): JSX.Element => {
  const { onboardingData } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { organizations, orgsLoading } = useAuth();

  // Use the Orval generated hooks for completing onboarding and accepting invitations
  const completeOnboardingMutation = useOrganizationsControllerCompleteOnboarding();
  const acceptInvitationMutation = useOrganizationsControllerAcceptInvitation();

  // Check if user is only joining organizations from navigation state
  const isOnlyJoiningOrganizations = location.state?.isOnlyJoiningOrganizations || false;

  // State to track if we should navigate after organizations are loaded
  const [shouldNavigateAfterLoad, setShouldNavigateAfterLoad] = React.useState(false);
  
  // State to track loading state for completion
  const [isCompleting, setIsCompleting] = React.useState(false);

  // Effect to handle navigation after organizations are loaded
  React.useEffect(() => {
    if (shouldNavigateAfterLoad && organizations.length > 0 && !orgsLoading) {
      setShouldNavigateAfterLoad(false);
      navigate('/dashboard');
    }
  }, [shouldNavigateAfterLoad, organizations.length, orgsLoading, navigate]);

  const handleComplete = async (): Promise<void> => {
    if (isCompleting) return; // Prevent duplicate submissions
    
    setIsCompleting(true);
    try {
      // Check if user has selected invitations to join
      const hasSelectedInvitations = onboardingData.selectedInvitations && onboardingData.selectedInvitations.length > 0;
      
      if (isOnlyJoiningOrganizations || hasSelectedInvitations) {
        // User is joining organizations (either only joining or joining + creating new)
        
        if (hasSelectedInvitations) {
          // Process the selected invitations first
          await processSelectedInvitations();
        }
        
        // Invalidate and refetch organizations to get fresh data after accepting invitations
        await queryClient.invalidateQueries({
          queryKey: ['/api/v1/organizations']
        });

        if (isOnlyJoiningOrganizations) {
          // User is only joining organizations, set flag to navigate after organizations are loaded
          setShouldNavigateAfterLoad(true);
        } else {
          // User is joining organizations AND creating new organization
          // Continue to create new organization
          await createNewOrganization();
        }
      } else {
        // User is only creating new organization
        await createNewOrganization();
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // You might want to show a toast or error message here
    } finally {
      setIsCompleting(false);
    }
  };

  const processSelectedInvitations = async (): Promise<void> => {
    if (!onboardingData.selectedInvitations || onboardingData.selectedInvitations.length === 0) {
      return;
    }

    try {
      // Accept all selected invitations
      const acceptPromises = onboardingData.selectedInvitations.map((invitationId) =>
        acceptInvitationMutation.mutateAsync({
          data: { invitation_id: invitationId }
        })
      );

      await Promise.all(acceptPromises);
      console.warn(`Successfully joined ${onboardingData.selectedInvitations.length} organization(s)`);
    } catch (error) {
      console.error('Error joining organizations:', error);
      throw error; // Re-throw to let the calling function handle it
    }
  };

  const createNewOrganization = async (): Promise<void> => {
    // Prepare the onboarding data according to OnboardingDto
    const onboardingPayload = {
      name: onboardingData.organizationName,
      website: onboardingData.website || undefined,
      business_description: onboardingData.companyAnalysis || undefined,
      company_type: onboardingData.companyType || undefined,
      team_size: onboardingData.teamSize || undefined,
      industry: onboardingData.enhancedProfile?.industry || undefined,
      target_audience: onboardingData.enhancedProfile?.target_audience || undefined,
      channels: onboardingData.enhancedProfile?.channels || undefined,
      business_offering: onboardingData.enhancedProfile?.whatsYourOffering || undefined
    };

    // Call the Orval generated API endpoint
    await completeOnboardingMutation.mutateAsync({
      data: onboardingPayload
    });

    await queryClient.invalidateQueries({
      queryKey: ['/api/v1/organizations']
    });

    navigate('/dashboard');
  };

  return (
    <CompleteStep
      isOnlyJoiningOrganizations={isOnlyJoiningOrganizations}
      onComplete={handleComplete}
      loading={isCompleting}
    />
  );
};

export default CompleteStepPage;
