import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

const Signup = (): JSX.Element => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if already authenticated
  if (isAuthenticated) {
    // Check if user was redirected from an invitation URL
    const from = location.state?.from;
    if (from?.startsWith('/accept-invite/')) {
      return <Navigate to={from} replace />;
    }
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen h-screen flex flex-col lg:flex-row">
      {/* Form Section - Full width on mobile, 50% on desktop */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-12 py-8 lg:py-16 bg-background relative h-full">
        {/* Subtle background texture - speckled effect */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.08)_1px,transparent_0)] bg-[length:8px_8px]"></div>
        </div>

        <div className="w-full max-w-lg relative z-10">
          <AuthForm mode="signup" />
        </div>
      </div>

      {/* Hero Content - Hidden on mobile, 50% width on desktop */}
      <div className="hidden lg:block w-1/2 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:20px_20px]"
          ></div>
        </div>

        {/* Meeting Image */}
        <div className="relative z-10 w-full h-full overflow-hidden">
          <img
            src="/pexels-fauxels-3184423.jpg"
            alt="Team meeting"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Overlay Content */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-20 flex items-end">
          <div className="p-8 lg:p-12 text-white">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              Join thousands of teams
            </h2>
            <p className="text-lg lg:text-xl text-white/90 leading-relaxed">
              Start your journey with Knowted and transform how your team captures and shares meeting insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
