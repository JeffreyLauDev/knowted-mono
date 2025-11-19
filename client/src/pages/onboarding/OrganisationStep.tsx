import OrganizationStep from '@/components/onboarding/OrganisationStep';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface EnhancedProfile {
  company_name: string;
  description: string;
  whatsYourOffering: string;
  industry: string;
  target_audience: string;
  channels: string;
}

const OrganizationStepPage = () => {
  const navigate = useNavigate();
  const [enhancedProfile, setEnhancedProfile] = useState<EnhancedProfile | null>(null);

  const handleComplete = (hasNewOrganization: boolean) => {
    if (hasNewOrganization) {
      // User is creating a new organization, continue to business profile steps
      navigate('/onboarding/business-profile');
    } else {
      // User is only joining existing organizations, go to completion step
      // This allows time for the invitation acceptance to fully process
      navigate('/onboarding/complete', { 
        state: { isOnlyJoiningOrganizations: true } 
      });
    }
  };

  return (
    <OrganizationStep
      onComplete={handleComplete}
    />
  );
};

export default OrganizationStepPage; 