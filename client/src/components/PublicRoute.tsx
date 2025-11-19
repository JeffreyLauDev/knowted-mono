import { useAuth } from '@/context/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface PublicRouteProps {
  children?: React.ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps): JSX.Element => {
  const { isAuthenticated, organizations, loading, isOnboardingComplete, organization } = useAuth();
  const hasCompletedOnboarding = isOnboardingComplete || !!organization;
  const location = useLocation();

  // Allow shared meeting routes to be accessed without redirection
  const isSharedMeetingRoute = location.pathname.startsWith('/shared/');

  
  if (loading) {
        return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <div className="text-sm text-muted-foreground">
          Checking authentication status...
        </div>
      </div>
    );
  }

  // Don't redirect if this is a shared meeting route
  if (isSharedMeetingRoute) {
    return children ? <>{children}</> : <Outlet />;
  }

  if (isAuthenticated && !hasCompletedOnboarding && !loading) {
        return <Navigate to="/onboarding" replace />;
  }
  if (isAuthenticated && hasCompletedOnboarding && !loading) {
        return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default PublicRoute;
