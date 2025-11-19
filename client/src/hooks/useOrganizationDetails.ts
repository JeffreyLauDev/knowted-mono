import { useOrganizationsControllerFindOne } from '@/api/generated/knowtedAPI';
import { useAuth } from '@/context/AuthContext';

export const useOrganizationDetails = () => {
  const { organization } = useAuth();
  
  const { data: organizationDetails, isLoading, error, refetch } = useOrganizationsControllerFindOne(
    organization?.id || '',
    {
      query: {
        enabled: !!organization?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: true,
        refetchOnWindowFocus: false,
      }
    }
  );

  return {
    organizationDetails,
    isLoading,
    error,
    refetch
  };
};
