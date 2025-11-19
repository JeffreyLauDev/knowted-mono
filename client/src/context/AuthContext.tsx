import {
  useOrganizationsControllerFindAll,
  usePaymentControllerGetCurrentPlan
} from '@/api/generated/knowtedAPI';
import type { CurrentPlanDto } from '@/api/generated/models';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { clearUserIdentification, identifyUser } from '@/utils/logrocket';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string;
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    email: string;
    created_at: string;
    updated_at: string;
  };
}

interface Organization {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  is_default?: boolean;
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  organizations: Organization[];
  accessToken: string | null;
  loading: boolean;
  isOnboardingComplete: boolean;
  hasActiveSubscription: boolean;
  isSubscriptionLoading: boolean;
  currentPlan: CurrentPlanDto | null;
  isSubscriptionDataLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    userData?: { firstName?: string; lastName?: string; organizationName?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  createOrganization: (name: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
  isReady: boolean;
  orgsLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  organization: null,
  organizations: [],
  accessToken: null,
  loading: true,
  isOnboardingComplete: false,
  hasActiveSubscription: false,
  isSubscriptionLoading: false,
  currentPlan: null,
  isSubscriptionDataLoading: false
};

export const AuthContext = createContext<AuthContextType>({
  ...initialState,
  login: async () => {
    throw new Error('AuthContext not initialized');
  },
  signup: async () => {
    throw new Error('AuthContext not initialized');
  },
  logout: async () => {
    throw new Error('AuthContext not initialized');
  },
  switchOrganization: async () => {
    throw new Error('AuthContext not initialized');
  },
  createOrganization: async () => {
    throw new Error('AuthContext not initialized');
  },
  isAuthenticated: false,
  isReady: false,
  orgsLoading: false
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {

    return initialState;
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizationsControllerFindAll<Organization[]>({
    query: {
      enabled: !!state.user,
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
      retryDelay: 1000
    }
  });

  // Check current plan for the current organization
  const { data: currentPlanResponse, isLoading: currentPlanLoading } = usePaymentControllerGetCurrentPlan(
    { organization_id: state.organization?.id || '' },
    {
      query: {
        enabled: !!state.organization?.id && !!state.user,
        refetchInterval: 30000, // Refetch every 30 seconds
        retry: 3,
        retryDelay: 1000
      }
    }
  );

  // Update subscription data loading state
  useEffect(() => {
    if (state.organization?.id && state.user) {
      setState((prev) => ({
        ...prev,
        isSubscriptionDataLoading: currentPlanLoading
      }));
    }
  }, [currentPlanLoading, state.organization?.id, state.user]);

    useEffect(() => {
    if (organizationsResponse?.length) {
      // Try to get the stored organization ID
      const storedOrgId = localStorage.getItem('selectedOrganizationId');
      const selectedOrg = storedOrgId
        ? organizationsResponse.find((org) => org.id === storedOrgId)
        : null;

      // If stored org is not found in current organizations, clear it from localStorage
      if (storedOrgId && !selectedOrg) {
        localStorage.removeItem('selectedOrganizationId');
      }

      console.warn('🏢 AuthContext: Organizations found, setting onboarding complete', {
        organizationsCount: organizationsResponse.length,
        selectedOrgId: selectedOrg?.id || organizationsResponse[0]?.id
      });

      // Always update the state with the new organizations list
      setState((prev) => ({
        ...prev,
        organizations: organizationsResponse,
        organization: selectedOrg || organizationsResponse[0],
        isOnboardingComplete: true
      }));
    } else if (state.user && !orgsLoading && organizationsResponse !== undefined) {
      // Only set isOnboardingComplete to false when we have a user, the query is not loading,
      // and we have a definitive response (even if it's empty)

      console.warn('🚫 AuthContext: No organizations found, setting onboarding incomplete', {
        user: !!state.user,
        orgsLoading,
        organizationsResponse
      });

      // Clear any stale onboarding completion flag from localStorage
      localStorage.removeItem('onboardingCompleted');

      setState((prev) => ({
        ...prev,
        organizations: [],
        organization: null,
        isOnboardingComplete: false
      }));
    }
  }, [organizationsResponse, state.user, orgsLoading]);

  // Check current plan status and update subscription state
  useEffect(() => {
    if (state.organization?.id && !currentPlanLoading && currentPlanResponse !== undefined) {
      // Check if there's an active subscription using the new API format
      const currentPlan = currentPlanResponse as CurrentPlanDto;
      // Consider users with active subscription OR in trial as having "active subscription"
      // This prevents payment popups from showing for trial users
      const hasActiveSubscription = currentPlan?.hasSubscription && (currentPlan?.isActive || currentPlan?.isTrial);

      setState((prev) => ({
        ...prev,
        hasActiveSubscription,
        isSubscriptionLoading: currentPlanLoading,
        currentPlan,
        isSubscriptionDataLoading: false
      }));
    }
  }, [state.organization?.id, currentPlanLoading, currentPlanResponse]);

  // Add a timeout mechanism to handle cases where the organizations query takes too long
  useEffect(() => {
    if (state.user && orgsLoading) {
      const timeout = setTimeout(() => {
        // If we've been loading organizations for more than 5 seconds, assume there are none
        if (orgsLoading && !organizationsResponse) {
          setState((prev) => ({
            ...prev,
            organizations: [],
            organization: null,
            isOnboardingComplete: false
          }));
        }
      }, 5000);

      return (): void => clearTimeout(timeout);
    }
  }, [state.user, orgsLoading, organizationsResponse]);

  // Add a separate effect to watch for localStorage changes
  useEffect(() => {
    const handleStorageChange = (): void => {
      if (organizationsResponse?.length) {
        const storedOrgId = localStorage.getItem('selectedOrganizationId');
        const selectedOrg = storedOrgId
          ? organizationsResponse.find((org) => org.id === storedOrgId)
          : null;

        if (selectedOrg && selectedOrg.id !== state.organization?.id) {
          setState((prev) => ({
            ...prev,
            organization: selectedOrg
          }));
        }
      }
    };

    // Listen for storage events (for cross-tab synchronization)
    window.addEventListener('storage', handleStorageChange);

    // Also check for changes periodically (for same-tab changes)
    const interval = setInterval(handleStorageChange, 1000);

    return (): void => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [organizationsResponse, state.organization?.id]);

  // LogRocket identification effect
  useEffect(() => {
    if (state.user && !state.loading) {
      const subscriptionInfo = {
        hasActiveSubscription: state.hasActiveSubscription,
        currentPlan: state.currentPlan
      };

      identifyUser(state.user, subscriptionInfo);
    } else if (!state.user && !state.loading) {
      // Clear identification when user is logged out
      clearUserIdentification();
    }
  }, [state.user, state.hasActiveSubscription, state.currentPlan, state.loading]);

  useEffect(() => {
    const initializeAuth = async (): Promise<void> => {

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();

          if (supabaseUser) {
            setState((prev) => ({
              ...prev,
              loading: false,
              accessToken: session.access_token,
              user: {
                id: supabaseUser.id,
                email: supabaseUser.email || '',
                name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || ''
              }
            }));
          }
        } else {
          setState({ ...initialState, loading: false });
        }
      } catch {
        setState({ ...initialState, loading: false });
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setState((prev) => ({
          ...prev,
          user: {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || ''
          },
          accessToken: session.access_token
        }));
      } else if (event === 'SIGNED_OUT') {
        setState({ ...initialState, loading: false });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setState((prev) => ({ ...prev, accessToken: session.access_token }));
      }
    });

    return (): void => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {throw error;}

      if (data.session) {
        setState((prev) => ({
          ...prev,
          loading: false,
          accessToken: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || ''
          }
        }));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Login failed: ${errorMessage}`);
      throw error;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const signup = async (
    email: string,
    password: string,
    userData?: { firstName?: string; lastName?: string; organizationName?: string }
  ): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData?.firstName,
            last_name: userData?.lastName,
            organization_name: userData?.organizationName,
            name: userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}`.trim() : undefined
          }
        }
      });

      if (error) {throw error;}

      if (data.user && !data.session) {
        // Email confirmation required
        toast.success('Account created successfully! Please check your email to verify your account.');
      } else if (data.session) {
        // Auto-confirmed, set user state
        setState((prev) => ({
          ...prev,
          loading: false,
          accessToken: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || ''
          }
        }));
        toast.success('Account created successfully!');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Signup failed: ${errorMessage}`);
      throw error;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };
  //logout
  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {throw error;}

      // Clear LogRocket identification immediately
      clearUserIdentification();

      setState({ ...initialState, loading: false });
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Logout error: ${errorMessage}`);
    }
  };

  const switchOrganization = async (orgId: string): Promise<void> => {
    const org = state.organizations.find((o) => o.id === orgId);
    if (!org) {throw new Error('Organization not found');}

    // Store the selected organization ID in localStorage
    localStorage.setItem('selectedOrganizationId', orgId);

    setState((prev) => ({ ...prev, organization: org }));

    // Force a refetch of organizations to ensure we have the latest data
    await queryClient.refetchQueries({
      queryKey: ['/organizations']
    });

    // Don't navigate automatically - let the calling component handle navigation
  };

  const createOrganization = async (): Promise<void> => {
    try {
      // This will be handled by the API call in the CreateOrganization component
      // The organizations list will be refreshed automatically by the useOrganizationsControllerFindAll hook
      // after the mutation is successful
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create organization: ${errorMessage}`);
      throw error;
    }
  };

  const updateUser = (userData: Partial<User>): void => {
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...userData } : null
    }));
  };

      // Determine if we're truly ready (user authenticated + organizations loaded)
  // We need to wait for both authentication and organizations query to finish
  const isReady = !state.loading && !!state.user && !orgsLoading && organizationsResponse !== undefined;

  // For the main loading state, we only care about auth loading and orgs loading
  // Current plan loading shouldn't block basic routing
  const isLoading = state.loading || orgsLoading;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        loading: isLoading,
        isAuthenticated: !!state.user,
        isReady,
        orgsLoading,
        login,
        signup,
        logout,
        switchOrganization,
        createOrganization,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

