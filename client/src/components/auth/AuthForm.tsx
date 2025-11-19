import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { Check, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthFormProps {
  mode?: 'login' | 'signup';
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordResetSent, setIsPasswordResetSent] = useState(false);

  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!isForgotPassword) {
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (password.length < 6) {
        newErrors.password = 'Password must be at least 8 characters';
      }
    }

    if (!isLogin && !isForgotPassword) {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      if (isForgotPassword) {
        // Handle password reset
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        });

        if (error) {
          throw error;
        }

        setIsPasswordResetSent(true);
        toast.success('Password reset email sent! Check your inbox.');
      } else if (isLogin) {
        // Use Supabase sign in directly
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          toast.success('Signed in successfully!');
          navigate('/dashboard');
        }
      } else {
        // Use Supabase sign up directly
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });

        if (error) {
          throw error;
        }

        if (data.user && !data.session) {
          // Email confirmation required
          toast.success('Account created successfully! Please check your email to verify your account before signing in.');
          setIsLogin(true);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        } else if (data.session) {
          // Auto-confirmed, proceed to onboarding
          toast.success('Account created successfully!');
          navigate('/onboarding');
        }
      }
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || (isForgotPassword ? 'Failed to send password reset email' : (isLogin ? 'Failed to sign in' : 'Failed to create account'));
      toast.error(errorMessage);

      if (isForgotPassword) {
        setErrors({ email: errorMessage });
      } else if (isLogin) {
        setErrors({ email: errorMessage });
      } else {
        setErrors({ general: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (): void => {
    if (mode === 'login') {
      navigate('/signup');
    } else {
      navigate('/login');
    }
  };

  const handleForgotPassword = (): void => {
    setIsForgotPassword(true);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  const handleBackToLogin = (): void => {
    setIsForgotPassword(false);
    setIsPasswordResetSent(false);
    setErrors({});
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  // Add OAuth sign in handler
  const handleOAuthSignIn = async (provider: 'google' | 'azure'): Promise<void> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) {throw error;}
      // On success, Supabase will redirect automatically
    } catch {
      toast.error('OAuth sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if fields are valid for showing success indicators
  const isEmailValid = email && /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password && password.length >= 6;

  // If password reset email was sent, show success message
  if (isPasswordResetSent) {
    return (
      <div className="w-full">
        <div className="mb-6 lg:mb-8">
          <div className="flex justify-start mb-4 lg:mb-6">
            <Logo size="lg" variant="default" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 lg:mb-3 text-primary">
            Check your email
          </h1>
          <p className="text-base sm:text-lg text-gray-600 font-semibold">
            We've sent a password reset link to {email}
          </p>
        </div>

        <div className="text-center space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="text-green-600 mb-4">
              <Check className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-lg font-semibold text-green-800 mb-2">Password reset email sent!</h2>
            <p className="text-green-700">
              Click the link in your email to reset your password. The link will expire in 1 hour.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleBackToLogin}
              variant="outline"
              className="w-full"
            >
              Back to Sign In
            </Button>
            <p className="text-sm text-gray-600">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                type="button"
                onClick={() => setIsPasswordResetSent(false)}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Logo and Headline (like Jobber) */}
      <div className="mb-6 lg:mb-8">
        <div className="flex justify-start mb-4 lg:mb-6">
          <Logo size="lg" variant="default" />
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 lg:mb-3 text-primary">
          {isForgotPassword ? 'Reset your password' : 'Knowted turns meetings into powerful insights.'}
        </h1>
        <p className="text-base sm:text-lg  font-semibold">
          {isForgotPassword ? 'Enter your email address and we\'ll send you a link to reset your password.' : 'Put Knowted to work for you. No credit card required.'}
        </p>
      </div>

      {/* Form - Email and Password fields FIRST (like Jobber) */}
      <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5 mb-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-100">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={isLoading}
              className="pl-10 h-11 lg:h-12 border-gray-300 focus:border-primary focus:ring-primary bg-white dark:bg-transparent"
              aria-invalid={!!errors.email}
            />
          </div>
          {isEmailValid && !isForgotPassword && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="h-4 w-4" />
              <span>Enter your email</span>
            </div>
          )}
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {!isForgotPassword && (
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-100">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
              className="pl-10 pr-10 h-11 lg:h-12 border-gray-300 focus:border-primary focus:ring-primary bg-white dark:bg-transparent"
              aria-invalid={!!errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {isPasswordValid && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <Check className="h-4 w-4" />
                <span>Please use at least 8 characters.</span>
              </div>
            )}
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}

            {/* Forgot Password Link */}
            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
        )}

        {!isLogin && !isForgotPassword && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-100">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={isLoading}
              className="pl-10 pr-10 h-11 lg:h-12 border-gray-300 focus:border-primary focus:ring-primary bg-white dark:bg-transparent"
              aria-invalid={!!errors.confirmPassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>
        )}

        {errors.general && (
          <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg border border-red-200">
            {errors.general}
          </div>
        )}

        <Button
          type="submit"
          className="w-full font-semibold py-3 h-11 lg:h-12 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isForgotPassword ? 'Sending...' : (isLogin ? 'Signing in...' : 'Creating account...')}
            </>
          ) : (
            isForgotPassword ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Start Free Trial')
          )}
        </Button>
      </form>

      {/* Separator - Only show when not in forgot password mode */}
      {!isForgotPassword && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <Separator className="flex-1" />
            <span className="text-sm text-gray-500 font-medium">OR</span>
            <Separator className="flex-1" />
          </div>

          {/* OAuth Buttons - BELOW the form (like Jobber) */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 border-gray-300 dark:border-gray-600 transition-colors h-11 lg:h-12 hover:text-primary"
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading}
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
              {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 border-gray-300 dark:border-gray-600 transition-colors h-11 lg:h-12 hover:text-primary"
              onClick={() => handleOAuthSignIn('azure')}
              disabled={isLoading}
            >
              <img src="https://www.svgrepo.com/show/448239/microsoft.svg" alt="Microsoft" className="h-5 w-5" />
              {isLogin ? 'Sign in with Microsoft' : 'Sign up with Microsoft'}
            </Button>
          </div>
        </>
      )}

      {/* Toggle */}
      <div className="mt-6 lg:mt-8 text-center">
        <p className="text-sm text-gray-600">
          {isForgotPassword ? (
            <>
              Remember your password?{' '}
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Back to sign in
              </button>
            </>
          ) : (
            <>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </>
          )}
        </p>
      </div>

      {/* Legal Text - Only show when not in forgot password mode */}
      {!isForgotPassword && (
        <div className="mt-4 lg:mt-6 text-center">
          <p className="text-xs text-gray-500">
            By using Knowted, you agree to Knowted's{' '}
            <a href="https://knowted.io/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="https://knowted.io/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </div>
      )}
    </div>
  );
};
