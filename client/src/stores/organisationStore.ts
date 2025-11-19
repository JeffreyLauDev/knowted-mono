
import { create } from 'zustand';

interface organization {
  id: string;
  name: string;
}

interface organizationState {
  organization: organization | null;
  setorganization: (organization: organization) => void;
}

export const useorganizationStore = create<organizationState>((set) => ({
  organization: null,
  setorganization: (organization) => set({ organization }),
}));
