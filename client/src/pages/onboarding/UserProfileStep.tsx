import UserProfileStep from '@/components/onboarding/UserProfileStep';
import { useNavigate } from 'react-router-dom';

const UserProfileStepPage = (): JSX.Element => {
  const navigate = useNavigate();

  const handleComplete = (): void => {
    navigate('/onboarding/organization');
  };

  return (
    <UserProfileStep
      onComplete={handleComplete}
    />
  );
};

export default UserProfileStepPage;
