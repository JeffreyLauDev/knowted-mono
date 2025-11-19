import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Briefcase, Building2, CheckCircle2, LogOut, Menu, User, Users } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

const OnboardingLayout = ({ children }: OnboardingLayoutProps): JSX.Element => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const currentStep = getStepFromPath(location.pathname);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const steps = [
    {
      path: '/onboarding/user-profile',
      label: 'User Profile',
      description: 'Tell us about yourself',
      icon: User,
      stepNumber: 1
    },
    {
      path: '/onboarding/organization',
      label: 'Organization',
      description: 'Tell us about your organization',
      icon: Building2,
      stepNumber: 2
    },
    {
      path: '/onboarding/business-profile',
      label: 'Business Profile',
      description: 'Tell us about your business',
      icon: Briefcase,
      stepNumber: 3
    },
    {
      path: '/onboarding/team-size',
      label: 'Team Size',
      description: 'How many people are in your team',
      icon: Users,
      stepNumber: 4
    },
    {
      path: '/onboarding/complete',
      label: 'Complete',
      description: 'Review and complete your setup',
      icon: CheckCircle2,
      stepNumber: 5
    }
  ];

  const handleLogout = async (): Promise<void> => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Mobile Header - Only visible on mobile */}
      <div className="lg:hidden bg-gradient-to-r from-primary to-primary/80 dark:from-[hsl(154,48%,21%)] dark:to-[hsl(154,48%,21%)]/80 text-white dark:text-[hsl(43,33%,96%)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              src="/logos/Knowted Logo - Stacked (White)@1.5x@1.5x.png"
              alt="Knowted"
              className="h-6 w-auto"
            />
            <span className="text-lg font-semibold">Knowted</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            className="text-white hover:bg-white/10 p-2"
          >
            <Menu size={20} />
          </Button>
        </div>

        {/* Mobile Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-white/80 dark:text-[hsl(43,33%,96%)]/80 mb-2">
            <span>Step {currentStep} of {steps.length}</span>
            <span>{steps[currentStep - 1]?.label}</span>
          </div>
          <div className="w-full bg-white/20 dark:bg-white/20 rounded-full h-2">
            <div
              className="bg-white dark:bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 dark:bg-black/70" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute left-0 top-0 h-full w-80 bg-gradient-to-br from-primary to-primary/80 dark:from-[hsl(154,48%,21%)] dark:to-[hsl(154,48%,21%)]/80 text-white dark:text-[hsl(43,33%,96%)] p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white dark:text-[hsl(43,33%,96%)]">Onboarding Progress</h2>

            </div>

            {/* Mobile Steps */}
            <div className="space-y-4 mb-6">
              {steps.map((step, index) => {
                const IconComponent = step.icon;
                const isCompleted = index < currentStep - 1;
                const isCurrent = index === currentStep - 1;

                return (
                  <div key={step.path} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isCompleted
                        ? 'bg-primary/60 dark:bg-white/60 text-white dark:text-[hsl(154,48%,21%)]'
                        : isCurrent
                        ? 'bg-white dark:bg-[hsl(43,33%,96%)] text-primary dark:text-[hsl(154,48%,21%)]'
                        : 'bg-white/20 dark:bg-white/20 text-white/60 dark:text-[hsl(43,33%,96%)]/60'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <IconComponent size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${
                        isCurrent ? 'text-white dark:text-[hsl(43,33%,96%)]' : isCompleted ? 'text-white/90 dark:text-[hsl(43,33%,96%)]/90' : 'text-white/70 dark:text-[hsl(43,33%,96%)]/70'
                      }`}>
                        {step.stepNumber}. {step.label}
                      </div>
                      <div className={`text-xs ${
                        isCurrent ? 'text-white/90 dark:text-[hsl(43,33%,96%)]/90' : 'text-white/60 dark:text-[hsl(43,33%,96%)]/60'
                      }`}>
                        {step.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile User Info & Actions */}
            {user?.email && (
              <div className="pt-4 border-t border-white/20 dark:border-white/20">
                <div className="mb-3 text-sm text-white/80 dark:text-[hsl(43,33%,96%)]/80">
                  {user.email}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start text-white/80 dark:text-[hsl(43,33%,96%)]/80 hover:text-white dark:hover:text-[hsl(43,33%,96%)] hover:bg-white/10 dark:hover:bg-white/10 text-sm h-9"
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row h-screen lg:h-screen h-[calc(100vh-120px)]">
        {/* Left Sidebar - Progress & Branding - Hidden on mobile */}
        <div className="hidden lg:flex w-1/3 bg-gradient-to-br from-primary to-primary/80 dark:from-[hsl(154,48%,21%)] dark:to-[hsl(154,48%,21%)]/80 text-primary-foreground dark:text-[hsl(43,33%,96%)] relative overflow-hidden order-2 lg:order-1">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -translate-x-24 translate-y-24"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/60 dark:bg-white/60 rounded-full -translate-x-12 translate-y-12"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 bg-primary/40 dark:bg-white/40 rounded-full -translate-x-6 translate-y-6"></div>
          </div>

          <div className="relative z-10 p-6 h-full flex flex-col">
            {/* Logo & Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <img
                  src="/logos/Knowted Logo - Stacked (White)@1.5x@1.5x.png"
                  alt="Knowted"
                  className="h-10 w-auto"
                />
                <span className="text-2xl font-semibold text-white dark:text-[hsl(43,33%,96%)]">Knowted</span>
              </div>
              <h1 className="text-lg font-bold leading-tight text-white dark:text-[hsl(43,33%,96%)]">
                Create your account in a few clicks
              </h1>
            </div>

            {/* Progress Steps */}
            <div className="flex-1 space-y-4">
              {steps.map((step, index) => {
                const IconComponent = step.icon;
                const isCompleted = index < currentStep - 1;
                const isCurrent = index === currentStep - 1;

                return (
                  <div key={step.path} className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isCompleted
                        ? 'bg-primary/60 dark:bg-white/60 text-white dark:text-[hsl(154,48%,21%)]'
                        : isCurrent
                        ? 'bg-white dark:bg-[hsl(43,33%,96%)] text-primary dark:text-[hsl(154,48%,21%)]'
                        : 'bg-white/20 dark:bg-white/20 text-white/60 dark:text-[hsl(43,33%,96%)]/60'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <IconComponent size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${
                        isCurrent ? 'text-white dark:text-[hsl(43,33%,96%)]' : isCompleted ? 'text-primary-foreground/80 dark:text-[hsl(43,33%,96%)]/80' : 'text-white/80 dark:text-[hsl(43,33%,96%)]/80'
                      }`}>
                        {step.stepNumber}. {step.label}
                      </div>
                      <div className={`text-xs ${
                        isCurrent ? 'text-white/90 dark:text-[hsl(43,33%,96%)]/90' : 'text-white/60 dark:text-[hsl(43,33%,96%)]/60'
                      }`}>
                        {step.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* User Info & Actions */}
            <div className="mt-auto pt-6 border-t border-white/20 dark:border-white/20">
              {user?.email && (
                <div className="mb-3 text-xs text-white/80 dark:text-[hsl(43,33%,96%)]/80">
                  {user.email}
                </div>
              )}
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start text-white/80 dark:text-[hsl(43,33%,96%)]/80 hover:text-white dark:hover:text-[hsl(43,33%,96%)] hover:bg-white/10 dark:hover:bg-white/10 text-xs h-9"
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="w-full lg:w-2/3 bg-white dark:bg-background order-1 lg:order-2 flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 lg:px-6 py-4 lg:py-8 min-h-full flex flex-col">
            <div className="flex-1">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getStepFromPath = (path: string): number => {
  switch (path) {
    case '/onboarding/user-profile':
      return 1;
    case '/onboarding/organization':
      return 2;
    case '/onboarding/business-profile':
      return 3;
    case '/onboarding/team-size':
      return 4;
    case '/onboarding/complete':
      return 5;
    default:
      return 1;
  }
};

export default OnboardingLayout;
