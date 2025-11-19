import { useOrganizationsControllerCreate } from '@/api/generated/knowtedAPI';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CreateOrganization = (): JSX.Element => {
  const [orgName, setOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { switchOrganization } = useAuth();
  const queryClient = useQueryClient();

  // Watch for when the pending organization becomes the current organization
  useEffect(() => {
    if (pendingOrgId) {
      // Use a timeout to give the AuthContext time to update
      const timeout = setTimeout(() => {
        const storedOrgId = localStorage.getItem('selectedOrganizationId');
        if (storedOrgId === pendingOrgId) {
                    setPendingOrgId(null);
          navigate('/dashboard');
        }
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [pendingOrgId, navigate]);

  const createOrganizationMutation = useOrganizationsControllerCreate({
    mutation: {
      onSuccess: async (data) => {
        toast.success('Organization created successfully');
        
        try {
          // Get the newly created organization from the response
          const newOrg = data as any;
          
          if (newOrg?.id) {
            // Store the selected organization ID in localStorage
            localStorage.setItem('selectedOrganizationId', newOrg.id);
                        setPendingOrgId(newOrg.id);

                        // Invalidate and refetch the organizations query to update the list
                        await queryClient.invalidateQueries({
              queryKey: ['/organizations']
            });

            // Force a refetch to ensure the organizations list is updated
            await queryClient.refetchQueries({
              queryKey: ['/organizations']
            });

            // Directly call switchOrganization to ensure immediate switching
            try {
              await switchOrganization(newOrg.id);
                            navigate('/dashboard');
            } catch (error) {
              console.error('Error switching organization:', error);
              // Fallback to the timeout-based approach
            }
          } else {
                         // If we can't get the new org from response, try to find it by name
                          await queryClient.invalidateQueries({
               queryKey: ['/organizations']
             });

             const result = await queryClient.refetchQueries({
               queryKey: ['/organizations']
             });

            const updatedOrganizations = result[0]?.data as any[];
            
            if (updatedOrganizations) {
              const foundOrg = updatedOrganizations.find((org) => org.name === orgName.trim());
              console.log('Looking for org with name:', orgName.trim());
              
              if (foundOrg) {
                localStorage.setItem('selectedOrganizationId', foundOrg.id);
                                setPendingOrgId(foundOrg.id);

                // Directly call switchOrganization to ensure immediate switching
                try {
                  await switchOrganization(foundOrg.id);
                                    navigate('/dashboard');
                } catch (error) {
                  console.error('Error switching organization:', error);
                  // Fallback to the timeout-based approach
                }
              } else {
                                navigate('/dashboard');
              }
            } else {
                            navigate('/dashboard');
            }
          }
        } catch (error) {
          console.error('Error switching to new organization:', error);
          navigate('/dashboard');
        }
      },
      onError: (error: any) => {
        setError(error.message || 'Failed to create organization');
        toast.error('Failed to create organization');
      }
    }
  });

  const handleCreate = async () => {
    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    try {
      setIsCreating(true);
      setError('');

      await createOrganizationMutation.mutateAsync({
        data: {
          name: orgName.trim()
        }
      });

    } catch (error: any) {
      // Error is handled in the onError callback
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (

      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-0 h-auto"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle>Create New Organization</CardTitle>
            </div>
            <CardDescription>
              Create a new organization to manage your teams and projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="Enter organization name..."
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    setError('');
                  }}
                  autoFocus
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isCreating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Organization'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

  );
};

export default CreateOrganization;
