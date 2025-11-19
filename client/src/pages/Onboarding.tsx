import OnboardingLayout from '@/components/onboarding/OnboardingLayout';
import { useAuth } from '@/context/AuthContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import BusinessProfileStepPage from './onboarding/BusinessProfileStep';
import CompleteStepPage from './onboarding/CompleteStep';
import OrganizationStepPage from './onboarding/OrganisationStep';
import TeamSizeStepPage from './onboarding/TeamSizeStep';
import UserProfileStepPage from './onboarding/UserProfileStep';

const Onboarding = (): JSX.Element => {
  const { isAuthenticated, loading, organization } = useAuth();
  const location = useLocation();

  // Check if we have an organization and should skip to dashboard
  // No need to set localStorage - the auth context handles this automatically

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check if onboarding is completed by having an organization
  const isOnboardingCompleted = !!organization;

  if (isAuthenticated && isOnboardingCompleted) {
    // Get the original destination from the location state, or default to dashboard
    const originalDestination = location.state?.from?.pathname || '/dashboard';
    console.warn('🎯 Onboarding: Completed, redirecting to original destination', {
      originalDestination,
      fromState: location.state?.from
    });
    return <Navigate to={originalDestination} replace />;
  }

  return (
    <OnboardingProvider>
      <OnboardingLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/onboarding/user-profile" replace />} />
          <Route path="/user-profile" element={<UserProfileStepPage />} />
          <Route path="/organization" element={<OrganizationStepPage />} />
          <Route path="/business-profile" element={<BusinessProfileStepPage />} />
          <Route path="/team-size" element={<TeamSizeStepPage />} />
          <Route path="/complete" element={<CompleteStepPage />} />
        </Routes>
      </OnboardingLayout>
    </OnboardingProvider>
  );
};

export default Onboarding;
