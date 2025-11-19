import InvitationProvider from '@/components/invitations/InvitationProvider';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  requireSubscription?: boolean;
}

const ProtectedRoute = ({ requireSubscription = true }: ProtectedRouteProps): JSX.Element => {
  const { isAuthenticated, loading, organizations, isOnboardingComplete, isReady, orgsLoading } = useAuth();
  const location = useLocation();
  const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);

  // Debug logging
  console.log('🔒 ProtectedRoute Debug:', {
    pathname: location.pathname,
    isAuthenticated,
    loading,
    orgsLoading,
    isReady,
    organizationsCount: organizations.length,
    isOnboardingComplete,
    requireSubscription
  });

  // Timeout mechanism for unauthenticated users stuck in loading state
  useEffect(() => {
    if (!isAuthenticated && (loading || !isReady || orgsLoading)) {
      const timeout = setTimeout(() => {
        console.log('⏰ ProtectedRoute: 5-second timeout reached, redirecting to login');
        setShouldRedirectToLogin(true);
      }, 5000);

      return () => clearTimeout(timeout);
    } else {
      // Reset the redirect flag if user becomes authenticated
      setShouldRedirectToLogin(false);
    }
  }, [isAuthenticated, loading, isReady, orgsLoading]);

  // Check if we should redirect to login due to timeout
  if (shouldRedirectToLogin) {
    console.log('🚫 ProtectedRoute: Timeout redirect to login triggered');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show loading spinner while checking authentication and organizations
  // We need to wait for all data to be loaded before making routing decisions
  if (loading || !isReady || orgsLoading) {
    console.log('⏳ ProtectedRoute: Still loading, showing spinner');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div className="text-sm text-muted-foreground">
          {loading ? 'Checking authentication...' :
           orgsLoading ? 'Loading organization data...' :
           'Preparing your dashboard...'}
        </div>
        {/* Add a small note about waiting for data */}
        <div className="text-xs text-muted-foreground max-w-sm text-center">
          Please wait while we load your account information...
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('🚫 ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is trying to access a specific meeting or dashboard item
  const isAccessingSpecificResource = location.pathname.includes('/meetings/') ||
                                    location.pathname.includes('/dashboard/') &&
                                    location.pathname !== '/dashboard';

  console.log('🎯 ProtectedRoute: Resource access check:', {
    isAccessingSpecificResource,
    pathname: location.pathname,
    organizationsCount: organizations.length,
    isOnboardingComplete,
    isReady,
    orgsLoading
  });

  // Special case: If user is accessing a specific resource (like a meeting),
  // we should be more lenient about redirecting to onboarding
  if (isAccessingSpecificResource) {
    // Only redirect to onboarding if we're absolutely sure the user has no organizations
    // AND we're not still loading the data
    if (organizations.length === 0 && !isOnboardingComplete && isReady) {
      console.log('🔄 ProtectedRoute: Redirecting to onboarding from specific resource - user has no orgs and onboarding incomplete', {
        redirectTo: '/onboarding',
        state: { from: location },
        currentState: {
          organizationsCount: organizations.length,
          isOnboardingComplete,
          isReady,
          pathname: location.pathname
        }
      });
      return <Navigate to="/onboarding" state={{ from: location }} replace />;
    } else {
      console.log('✅ ProtectedRoute: Allowing access to specific resource - being lenient about onboarding');
      return (
        <InvitationProvider>
          <Outlet />
        </InvitationProvider>
      );
    }
  }

  // For general dashboard access, use the stricter logic
  // Only redirect to onboarding if ALL of these conditions are met:
  // 1. User has no organizations AND
  // 2. User hasn't completed onboarding AND
  // 3. All data has finished loading (isReady is true)
  const shouldRedirectToOnboarding = organizations.length === 0 &&
                                   !isOnboardingComplete &&
                                   isReady;

  console.log('🔍 ProtectedRoute: Redirect decision for general access:', {
    shouldRedirectToOnboarding,
    reason: shouldRedirectToOnboarding ? {
      noOrgs: organizations.length === 0,
      incompleteOnboarding: !isOnboardingComplete,
      dataReady: isReady
    } : 'Conditions not met for redirect'
  });

  if (shouldRedirectToOnboarding) {
    console.log('🔄 ProtectedRoute: Redirecting to onboarding for general access - all conditions met for redirect', {
      redirectTo: '/onboarding',
      state: { from: location },
      currentState: {
        organizationsCount: organizations.length,
        isOnboardingComplete,
        isReady,
        pathname: location.pathname
      }
    });
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  // If user has organizations or has completed onboarding, allow access
  if (organizations.length > 0 || isOnboardingComplete) {
    console.log('✅ ProtectedRoute: Allowing general access - has orgs or completed onboarding');
  } else if (!isReady) {
    console.log('⏳ ProtectedRoute: Data not ready yet, allowing access temporarily');
  } else {
    console.log('❓ ProtectedRoute: Unexpected state, allowing access');
  }

  return (
    <InvitationProvider>
      <Outlet />
    </InvitationProvider>
  );
};

export default ProtectedRoute;
