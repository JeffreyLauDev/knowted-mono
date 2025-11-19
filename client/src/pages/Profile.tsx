import { useProfilesControllerGetProfile, useProfilesControllerUpdateProfile } from '@/api/generated/knowtedAPI';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User } from 'lucide-react';
import { useEffect, useState } from 'react';

const Profile = (): JSX.Element => {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Fetch profile data
  const { data: profile, isLoading, refetch } = useProfilesControllerGetProfile();

  // Helper function to extract profile data from API response
  const getProfileData = (): any => {
    if (!profile) {return null;}
    return 'data' in profile ? profile.data : profile;
  };

  // Update profile mutation
  const { mutate: updateProfile, isPending: isUpdating } = useProfilesControllerUpdateProfile();

  // Set form values when profile data loads
  useEffect(() => {
    const profileData = getProfileData();
    if (profileData) {
      setFirstName(profileData.first_name || '');
      setLastName(profileData.last_name || '');
    }
  }, [profile]);

  const handleSave = (): void => {
    updateProfile({
      data: {
        first_name: firstName,
        last_name: lastName
      }
    }, {
      onSuccess: () => {
        toast({
          title: 'Profile updated',
          description: 'Your profile has been updated successfully.'
        });
        setIsEditing(false);
        refetch();
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: 'Failed to update profile. Please try again.',
          variant: 'destructive'
        });
        console.error('Profile update error:', error);
      }
    });
  };

  const handleCancel = (): void => {
    if (profile) {
      // Handle both direct response and AxiosResponse wrapper
      const profileData = 'data' in profile ? profile.data : profile;
      setFirstName(profileData.first_name || '');
      setLastName(profileData.last_name || '');
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal information and account settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your name and personal details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={!isEditing}
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={!isEditing}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile && 'data' in profile ? profile.data.email || '' : profile?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Email address cannot be changed. Contact support if you need to update your email.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Member since:</span>
            <span className="font-medium">
              {profile && 'data' in profile
                ? profile.data.created_at
                  ? new Date(profile.data.created_at).toLocaleDateString()
                  : 'N/A'
                : profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : 'N/A'
              }
            </span>
          </div>

          <div className="flex gap-3 pt-4">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="min-w-[100px]"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
