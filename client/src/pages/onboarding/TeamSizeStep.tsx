import TeamSizeStep from '@/components/onboarding/TeamSizeStep';

const TeamSizeStepPage = () => {
  const handleComplete = () => {
    // The component handles navigation internally
  };

  return (
    <TeamSizeStep
      onComplete={handleComplete}
    />
  );
};

export default TeamSizeStepPage; 