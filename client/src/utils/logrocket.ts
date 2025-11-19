import type { CurrentPlanDto } from '@/api/generated/models/currentPlanDto';
import LogRocket from 'logrocket';

interface UserProfile {
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

/**
 * Identify a user in LogRocket with their profile and subscription information
 */
export const identifyUser = (user: UserProfile, subscriptionInfo?: {
    hasActiveSubscription: boolean;
    currentPlan: CurrentPlanDto;
}): void => {
  if (!user) {
    console.warn('LogRocket: Cannot identify user - user data is missing');
    return;
  }

  const userTraits: Record<string, string | number | boolean> = {
    email: user.email,
    name: user.name
  };

  // Add profile information if available
  if (user.profile) {
    userTraits.profileId = user.profile.id;
    userTraits.firstName = user.profile.first_name;
    userTraits.lastName = user.profile.last_name;
    userTraits.avatarUrl = user.profile.avatar_url;
    userTraits.profileCreatedAt = user.profile.created_at;
    userTraits.profileUpdatedAt = user.profile.updated_at;
  }

  // Add subscription information if available
  if (subscriptionInfo) {
    userTraits.hasActiveSubscription = subscriptionInfo.hasActiveSubscription;
    if (subscriptionInfo.currentPlan) {
      userTraits.subscriptionPlan = subscriptionInfo.currentPlan.planName;
    }
  }

  try {
    LogRocket.identify(user.id, userTraits);
    console.warn('LogRocket: User identified successfully', { userId: user.id, email: user.email });
  } catch (error) {
    console.error('LogRocket: Failed to identify user', error);
  }
};

/**
 * Clear user identification in LogRocket (useful for logout)
 */
export const clearUserIdentification = (): void => {
  try {
    LogRocket.identify(null);
    console.warn('LogRocket: User identification cleared');
  } catch (error) {
    console.error('LogRocket: Failed to clear user identification', error);
  }
};
