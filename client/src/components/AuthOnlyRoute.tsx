import { useAuth } from '@/context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

interface AuthOnlyRouteProps {
  children?: React.ReactNode;
}

const AuthOnlyRoute = ({ children }: AuthOnlyRouteProps): JSX.Element => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary'></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default AuthOnlyRoute;
