import BusinessProfileStep from '@/components/onboarding/BusinessProfileStep';
import { useOnboarding } from '@/context/OnboardingContext';
import { useNavigate } from 'react-router-dom';

const BusinessProfileStepPage = () => {
  const { onboardingData } = useOnboarding();
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate('/onboarding/team-size');
  };

  return (
    <BusinessProfileStep
      data={onboardingData}
      onComplete={handleComplete}
    />
  );
};

export default BusinessProfileStepPage; 