import { useProfilesControllerGetProfile, useProfilesControllerUpdateProfile } from '@/api/generated/knowtedAPI';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/integrations/api/client';
import { toast } from '@/lib/toast';
import { AlertTriangle, Download, Loader2, Save, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const Account = (): JSX.Element => {
  const { user, updateUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  // Fetch profile data from the me endpoint
  const { data: profile, isLoading: profileLoading } = useProfilesControllerGetProfile({
    query: {
      enabled: !!user,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false
    }
  });

  const updateProfileMutation = useProfilesControllerUpdateProfile();

  // Update form data when profile data changes
  useEffect(() => {
    if (profile && 'first_name' in profile) {
      setFormData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || ''
      });
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      setIsUpdating(true);

      const updatedProfile = await updateProfileMutation.mutateAsync({
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName
        }
      });

      toast.success('Profile updated successfully');

      // Update local user data with the updated profile
      if (updatedProfile && 'first_name' in updatedProfile) {
        updateUser({
          ...user,
          profile: {
            id: updatedProfile.id || '',
            first_name: updatedProfile.first_name || '',
            last_name: updatedProfile.last_name || '',
            avatar_url: updatedProfile.avatar_url,
            email: updatedProfile.email || '',
            created_at: updatedProfile.created_at || '',
            updated_at: updatedProfile.updated_at || ''
          }
        });
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  interface ExportData {
    profile?: {
      id?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      created_at?: string;
      updated_at?: string;
    };
    meetings?: {
      id?: string;
      title?: string;
      summary?: string;
      meeting_date?: string;
      duration_mins?: number;
      participants_email?: string[];
      created_at?: string;
      updated_at?: string;
    }[];
    organizations?: {
      id?: string;
      name?: string;
      team_name?: string;
      is_admin?: boolean;
      joined_at?: string;
    }[];
    exportDate?: string;
    permissions?: {
      canExportMeetings: boolean;
      reason: string;
    };
  }

  const convertToCSV = (data: ExportData): string => {
    const csvRows: string[] = [];

    // Add profile data
    csvRows.push('Data Type,Field,Value');
    csvRows.push(`Profile,ID,${data.profile?.id || ''}`);
    csvRows.push(`Profile,First Name,${data.profile?.first_name || ''}`);
    csvRows.push(`Profile,Last Name,${data.profile?.last_name || ''}`);
    csvRows.push(`Profile,Email,${data.profile?.email || ''}`);
    csvRows.push(`Profile,Created At,${data.profile?.created_at || ''}`);
    csvRows.push(`Profile,Updated At,${data.profile?.updated_at || ''}`);
    csvRows.push(''); // Empty row for separation

    // Add meetings data
    if (data.meetings && data.meetings.length > 0) {
      csvRows.push('Meetings,ID,Title,Summary,Meeting Date,Duration (mins),Participants,Created At,Updated At');
      data.meetings.forEach((meeting) => {
        csvRows.push([
          'Meeting',
          meeting.id || '',
          `"${(meeting.title || '').replace(/"/g, '""')}"`,
          `"${(meeting.summary || '').replace(/"/g, '""')}"`,
          meeting.meeting_date || '',
          meeting.duration_mins?.toString() || '',
          `"${(meeting.participants_email || []).join('; ')}"`,
          meeting.created_at || '',
          meeting.updated_at || ''
        ].join(','));
      });
      csvRows.push(''); // Empty row for separation
    } else if (data.permissions && !data.permissions.canExportMeetings) {
      csvRows.push('Meetings,Access Restricted');
      csvRows.push(`Meeting Data,${data.permissions.reason || 'Meeting data restricted to admin and owner roles only'}`);
      csvRows.push(''); // Empty row for separation
    }

    // Add organizations data
    if (data.organizations && data.organizations.length > 0) {
      csvRows.push('Organizations,ID,Name,Team Name,Is Admin,Joined At');
      data.organizations.forEach((org) => {
        csvRows.push([
          'Organization',
          org.id || '',
          `"${(org.name || '').replace(/"/g, '""')}"`,
          `"${(org.team_name || '').replace(/"/g, '""')}"`,
          org.is_admin ? 'Yes' : 'No',
          org.joined_at || ''
        ].join(','));
      });
      csvRows.push(''); // Empty row for separation
    }

    // Add export metadata
    csvRows.push(`Export Info,Export Date,${data.exportDate || new Date().toISOString()}`);

    return csvRows.join('\n');
  };

  const handleExportData = async (): Promise<void> => {
    try {
      setIsExporting(true);

      const response = await apiClient.get('/api/v1/profiles/export');
      const data = response as ExportData;

      // Convert to CSV
      const csvContent = convertToCSV(data);

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `knowted-data-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show appropriate success message based on permissions
      if (data.permissions && !data.permissions.canExportMeetings) {
        toast.success('Data export completed! Note: Meeting data is restricted to admin and owner roles.');
      } else {
        toast.success('Data export completed!');
      }
    } catch {
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    // Disable delete functionality - contact admin instead
    toast.info('Account deletion requires admin approval. Please email us at support@knowted.ai to request account deletion.');
    setShowDeleteConfirm(false);
  };

  // Show loading state while profile is being fetched
  if (profileLoading) {
    return (
      <div className="space-y-6 px-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      <form onSubmit={handleUpdateProfile}>
        {/* Profile Information Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-28">
            {/* Left Column - Description */}
            <div className="lg:col-span-1">
              <h3 className="text-base font-semibold text-foreground mb-1">Profile Information</h3>
              <p className="text-sm text-muted-foreground">Update your personal information and account details. This information is used to personalize your Knowted experience.</p>
            </div>

            {/* Right Column - Settings */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-sm font-medium text-muted-foreground">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter your first name"
                    className="h-10 border-border focus:border-primary focus:ring-primary ring-offset-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-sm font-medium text-muted-foreground">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter your last name"
                    className="h-10 border-border focus:border-primary focus:ring-primary ring-offset-background"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  value={formData.email}
                  disabled
                  className="h-10 border-border bg-muted text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support if you need to update your email.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section Separator */}
        <div className="border-t border-border my-8"></div>

        {/* Data Management Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-28">
            {/* Left Column - Description */}
            <div className="lg:col-span-1">
              <h3 className="text-base font-semibold text-foreground mb-1">Data Management</h3>
              <p className="text-sm text-muted-foreground">Export your data or delete your account. All actions are permanent and cannot be undone.</p>
            </div>

            {/* Right Column - Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Data Export */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted">
                <div>
                  <h4 className="font-medium text-foreground">Export Your Data</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Download a copy of all your data in CSV format for GDPR compliance
                  </p>
                </div>
                <Button
                  onClick={handleExportData}
                  disabled={isExporting}
                  variant="outline"
                  className="px-4 py-2 h-9 text-sm text-muted-foreground border-border hover:bg-accent"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Data
                    </>
                  )}
                </Button>
              </div>

              {/* Account Deletion */}
              <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-200">Delete Account</h4>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                {!showDeleteConfirm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 h-9 text-sm"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 h-9 text-sm"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Contact Admin
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 h-9 text-sm text-muted-foreground border-border hover:bg-accent"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {showDeleteConfirm && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Account Deletion:</strong> Account deletion requires admin approval.
                    Please contact your administrator to request account deletion.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>

        {/* Section Separator */}
        <div className="border-t border-border my-8"></div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-8">
          <Button
            type="button"
            variant="outline"
            className="px-4 py-2 h-9 text-sm text-muted-foreground border-border hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isUpdating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 h-9 text-sm font-medium"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Account;
