import type { CreateTeamsDto } from '@/api/generated/models/createTeamsDto';
import type { MeetingTypeDto } from '@/api/generated/models/meetingTypeDto';
import type { OnboardingDto } from '@/api/generated/models/onboardingDto';
import React, { createContext, useContext, useState } from 'react';

interface Team extends CreateTeamsDto {
  id: string;
  members?: string[];
}

type MeetingType = MeetingTypeDto;

interface EnhancedProfile {
  company_name: string;
  description: string;
  whatsYourOffering: string;
  industry: string;
  target_audience: string;
  channels: string;
}

export interface OnboardingContextType {
  onboardingData: {
    organizationName: string;
    website: string;
    companyAnalysis: string;
    companyType: string;
    teamSize: string;
    meetingTypes: MeetingType[];
    transcriptionTool: 'fireflies' | 'otter.ai' | null;
    userProfile: {
      firstName: string;
      lastName: string;
    } | null;

    teams: Team[];
    enhancedProfile: EnhancedProfile | null;
    selectedInvitations: string[]; // Add selected invitations
  };
  updateorganizationName: (name: string) => void;
  updateWebsite: (website: string) => void;
  updateCompanyAnalysis: (analysis: string) => void;
  updateCompanyType: (type: string) => void;
  updateTeamSize: (size: string) => void;
  updateUserProfile: (profile: { firstName: string; lastName: string }) => void;
  addMeetingType: (meetingType: MeetingType) => void;
  removeMeetingType: (id: string) => void;
  addTeam: (team: Team) => void;
  removeTeam: (id: string) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  updateTranscriptionTool: (tool: 'fireflies' | 'otter.ai' | null) => void;
  updateEnhancedProfile: (profile: EnhancedProfile | null) => void;
  updateSelectedInvitations: (invitations: string[]) => void; // Add function to update selected invitations

  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within a OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: React.ReactNode;
  initialData?: Partial<{
    organizationName: string;
    website: string;
    companyAnalysis: string;
    companyType: string;
    teamSize: string;
    meetingTypes: MeetingType[];
    transcriptionTool: 'fireflies' | 'otter.ai' | null;
    userProfile: { firstName: string; lastName: string } | null;
    teams: Team[];
    enhancedProfile: EnhancedProfile | null;
    selectedInvitations: string[];
  }>;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  initialData
}) => {
  const [onboardingData, setOnboardingData] = useState({
    organizationName: initialData?.organizationName || '',
    website: initialData?.website || '',
    companyAnalysis: initialData?.companyAnalysis || '',
    companyType: initialData?.companyType || '',
    teamSize: initialData?.teamSize || '',
    meetingTypes: initialData?.meetingTypes || [],
    transcriptionTool: initialData?.transcriptionTool || null,
    userProfile: initialData?.userProfile || null,

    teams: initialData?.teams || [],
    enhancedProfile: initialData?.enhancedProfile || null,
    selectedInvitations: initialData?.selectedInvitations || []
  });

  const updateorganizationName = (name: string): void => {
    setOnboardingData((prev) => ({ ...prev, organizationName: name }));
  };

  const updateWebsite = (website: string): void => {
    setOnboardingData((prev) => ({ ...prev, website }));
  };

  const updateCompanyAnalysis = (analysis: string): void => {
    setOnboardingData((prev) => ({ ...prev, companyAnalysis: analysis }));
  };

  const updateCompanyType = (type: string): void => {
    setOnboardingData((prev) => ({ ...prev, companyType: type }));
  };

  const updateTeamSize = (size: string): void => {
    setOnboardingData((prev) => ({ ...prev, teamSize: size }));
  };

  const updateUserProfile = (profile: { firstName: string; lastName: string }): void => {
    setOnboardingData((prev) => ({ ...prev, userProfile: profile }));
  };

  const addMeetingType = (meetingType: MeetingType): void => {
    setOnboardingData((prev) => ({ ...prev, meetingTypes: [...prev.meetingTypes, meetingType] }));
  };

  const removeMeetingType = (id: string): void => {
    setOnboardingData((prev) => ({ ...prev, meetingTypes: prev.meetingTypes.filter((type) => type.id !== id) }));
  };

  const addTeam = (team: Team): void => {
    setOnboardingData((prev) => ({ ...prev, teams: [...prev.teams, team] }));
  };

  const removeTeam = (id: string): void => {
    setOnboardingData((prev) => ({ ...prev, teams: prev.teams.filter((team) => team.id !== id) }));
  };

  const updateTeam = (id: string, updates: Partial<Team>): void => {
    setOnboardingData((prev) => ({
      ...prev,
      teams: prev.teams.map((team) => team.id === id ? { ...team, ...updates } : team)
    }));
  };

  const updateTranscriptionTool = (tool: 'fireflies' | 'otter.ai' | null): void => {
    setOnboardingData((prev) => ({ ...prev, transcriptionTool: tool }));
  };

  const updateEnhancedProfile = (profile: EnhancedProfile | null): void => {
    setOnboardingData((prev) => ({ ...prev, enhancedProfile: profile }));
  };

  const updateSelectedInvitations = (invitations: string[]): void => {
    setOnboardingData((prev) => ({ ...prev, selectedInvitations: invitations }));
  };

  const completeOnboarding = async (): Promise<void> => {
    try {
      // Prepare the onboarding data
      const onboardingPayload: OnboardingDto = {
        name: onboardingData.organizationName,
        website: onboardingData.website || undefined,
        business_description: onboardingData.companyAnalysis || undefined,
        company_type: onboardingData.companyType || undefined,
        team_size: onboardingData.teamSize || undefined,
        industry: onboardingData.enhancedProfile?.industry || undefined,
        target_audience: onboardingData.enhancedProfile?.target_audience || undefined,
        channels: onboardingData.enhancedProfile?.channels || undefined,
        business_offering: onboardingData.enhancedProfile?.whatsYourOffering || undefined
      };

      // Call the API to complete onboarding
      const response = await fetch('/api/v1/organizations/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(onboardingPayload)
      });

      if (!response.ok) {
        throw new Error(`Failed to complete onboarding: ${response.statusText}`);
      }

      console.warn('Onboarding completed successfully');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error; // Re-throw to let the calling component handle it
    }
  };

  const resetOnboarding = (): void => {
    setOnboardingData({
      organizationName: '',
      website: '',
      companyAnalysis: '',
      companyType: '',
      teamSize: '',
      meetingTypes: [],
      transcriptionTool: null,
      userProfile: null,
      teams: [],
      enhancedProfile: null,
      selectedInvitations: []
    });
  };

  const value = {
    onboardingData,
    updateorganizationName,
    updateWebsite,
    updateCompanyAnalysis,
    updateCompanyType,
    updateTeamSize,
    updateUserProfile,
    addMeetingType,
    removeMeetingType,
    addTeam,
    removeTeam,
    updateTeam,
    updateTranscriptionTool,
    updateEnhancedProfile,
    updateSelectedInvitations,

    completeOnboarding,
    resetOnboarding
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
