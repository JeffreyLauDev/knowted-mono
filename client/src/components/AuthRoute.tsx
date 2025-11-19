
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const AuthRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const location = useLocation();
  
  useEffect(() => {
    // Only determine the redirect path once when component mounts
    // or if authentication status changes
    if (!loading) {
      const path = isAuthenticated ? '/dashboard' : '/login';
      setRedirectPath(path);
    }
  }, [isAuthenticated, loading]);
  
  // Only show loading when we haven't determined where to go yet
  // and we're still loading auth state
  if (loading && redirectPath === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Once we've determined where to redirect, do the redirect immediately without showing loading
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }
  
  // This should rarely happen, but as a fallback
  return null;
};

export default AuthRoute;
