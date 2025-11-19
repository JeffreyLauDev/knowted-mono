import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

const Login = (): JSX.Element => {
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
          <AuthForm mode="login" />
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
            alt="Team collaboration huddle with diverse professionals"
            className="w-full h-full object-cover"
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>

          {/* Testimonial */}
          <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm rounded-2xl p-3 max-w-xs shadow-lg">
            <div className="flex items-start gap-3">
              <img
                src="/grayza-cameron.png"
                alt="Cameron from Grayza"
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1">
                <p className="text-xs text-gray-800 leading-tight mb-1">
                  "Knowted has transformed how we run meetings. Our productivity is up 40% and everyone actually looks forward to our team syncs now."
                </p>
                <div className="text-xs text-gray-600">
                  <p className="font-semibold">Cameron</p>
                  <p>
                    <a
                      href="https://grayza.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Grayza
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-6 right-6 opacity-20">
          <div className="w-24 h-24 border-2 border-white rounded-full"></div>
        </div>
        <div className="absolute top-16 right-16 opacity-10">
          <div className="w-12 h-12 border border-white rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
