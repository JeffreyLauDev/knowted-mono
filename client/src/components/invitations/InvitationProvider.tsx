import { useInvitations } from '@/hooks/useInvitations';
import { createContext, useContext, type ReactNode } from 'react';

interface InvitationContextType {
  hasInvitations: boolean;
  isLoading: boolean;
}

const InvitationContext = createContext<InvitationContextType>({
  hasInvitations: false,
  isLoading: false
});

interface InvitationProviderProps {
  children: ReactNode;
}

const InvitationProvider = ({ children }: InvitationProviderProps): JSX.Element => {
  const { hasInvitations, isLoading } = useInvitations();

  return (
    <InvitationContext.Provider value={{ hasInvitations, isLoading }}>
      {children}
    </InvitationContext.Provider>
  );
};

export const useInvitationContext = (): InvitationContextType => {
  const context = useContext(InvitationContext);
  if (!context) {
    throw new Error('useInvitationContext must be used within an InvitationProvider');
  }
  return context;
};

export default InvitationProvider;
