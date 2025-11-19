import { useOrganizationsControllerUpdateUserTeam, usePermissionsControllerBulkSetTeamPermissions, useTeamsControllerCreate, useTeamsControllerFindAll } from '@/api/generated/knowtedAPI';
import type { BulkSetTeamPermissionsDto, BulkSetTeamPermissionsDtoResourceType, MeetingTypeDto, OrganizationMemberResponseDto, ReportTypeResponseDto, TeamInfoDto } from '@/api/generated/models';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useToast } from '../ui/use-toast';
import { CreateGroupDialog } from './role-management/CreateGroupDialog';
import { EditMemberDialog } from './role-management/EditMemberDialog';
import { MemberList } from './role-management/MemberList';
import { PermissionDialog } from './role-management/PermissionDialog';

const RoleManagement = (): JSX.Element => {
  const { toast } = useToast();
  const { organization, user } = useAuth();
  const [members, setMembers] = useState<OrganizationMemberResponseDto[]>([]);
  const [meetingTypes, setMeetingTypes] = useState<MeetingTypeDto[]>([]);
  const [reportTypes, setReportTypes] = useState<ReportTypeResponseDto[]>([]);
  const [selectedMember, setSelectedMember] = useState<OrganizationMemberResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [pendingPermissions, setPendingPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<OrganizationMemberResponseDto | null>(null);
  const [permissionGroups, setPermissionGroups] = useState<TeamInfoDto[]>([]);
  const [groupPermissions, setGroupPermissions] = useState<any[]>([]);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [organizationId, setorganizationId] = useState<string | null>(null);

  // Move React hooks to top level
  const updateUserTeamMutation = useOrganizationsControllerUpdateUserTeam();
  const setPermissionsMutation = usePermissionsControllerBulkSetTeamPermissions();
  const createTeamMutation = useTeamsControllerCreate();

  // Use the teams query hook
  const { data: teamsResponse, error: teamsError } = useTeamsControllerFindAll(
    { organization_id: organizationId || '' },
    {
      query: {
        enabled: !!organizationId
      }
    }
  );

  // Update permission groups when teams data changes
  useEffect(() => {
    if (teamsResponse?.data) {
      const teams = teamsResponse.data as TeamInfoDto[];
      setPermissionGroups(teams);
    }
  }, [teamsResponse]);

  useEffect(() => {
    if (teamsError !== undefined) {
      console.error('Error fetching teams:', teamsError);
      toast({
        title: 'Error',
        description: 'Failed to load teams data',
        variant: 'destructive'
      });
    }
  }, [teamsError, toast]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<void> => {
    try {
      setIsLoading(true);

      if (!organization?.id) {
        throw new Error('No organization found');
      }
      setorganizationId(organization.id);

      // TODO: Replace with API calls to get members, meeting types, and report types
      // These should be replaced with the appropriate Orval-generated API hooks
      const membersData: OrganizationMemberResponseDto[] = [];
      const meetingTypesData: MeetingTypeDto[] = [];
      const reportTypesData: ReportTypeResponseDto[] = [];

      setMembers(membersData);
      setMeetingTypes(meetingTypesData);
      setReportTypes(reportTypesData);

      // TODO: Replace with API call to get team permissions
      const meetingTypePerms: any[] = [];
      const reportTypePerms: any[] = [];

      setGroupPermissions([...meetingTypePerms, ...reportTypePerms]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permissions data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionValue = (memberId: string, resourceType: string, permission: string): boolean => {
    // For meeting types
    if (resourceType.startsWith('meeting_type_')) {
      const meetingTypeId = resourceType.replace('meeting_type_', '');
      const perm = groupPermissions.find(
        (p) => p.team_id === memberId && 'meeting_type_id' in p && p.meeting_type_id === meetingTypeId
      );
      return perm ? Boolean(perm[permission as keyof any]) : false;
    }
    // For report types
    else if (resourceType.startsWith('report_type_')) {
      const reportTypeId = resourceType.replace('report_type_', '');
      const perm = groupPermissions.find(
        (p) => p.team_id === memberId && 'report_type_id' in p && p.report_type_id === reportTypeId
      );
      return perm ? Boolean(perm[permission as keyof any]) : false;
    }
    return false;
  };

  const handlePermissionChange = async (
    memberId: string,
    resourceType: string,
    permission: 'can_read' | 'can_write',
    value: boolean
  ): Promise<void> => {
    try {
      if (!organizationId) {throw new Error('No organization ID found');}

      const permissionEntries: BulkSetTeamPermissionsDto[] = [{
        resource_type: resourceType as BulkSetTeamPermissionsDtoResourceType,
        access_level: value ? 'readWrite' : 'none'
      }];

      await setPermissionsMutation.mutateAsync({
        teamId: memberId,
        data: permissionEntries,
        params: {
          organization_id: organizationId
        }
      });

      // Update local state
      setGroupPermissions((prev) =>
        prev.map((p) =>
          p.team_id === memberId &&
          ((resourceType.startsWith('meeting_type_') && p.meeting_type_id === resourceType.replace('meeting_type_', '')) ||
           (resourceType.startsWith('report_type_') && p.report_type_id === resourceType.replace('report_type_', '')))
            ? { ...p, [permission]: value }
            : p
        )
      );

    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to update permission',
        variant: 'destructive'
      });
    }
  };

  const handleSavePermissions = async (): Promise<void> => {
    if (!selectedMember) {return;}

    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(pendingPermissions)) {
        const [resourceType, permission] = key.split('.');
        if (typeof value === 'boolean') {
          await handlePermissionChange(selectedMember.id, resourceType, permission as 'can_read' | 'can_write', value);
        }
      }
      setPendingPermissions({});
      setPermissionsDialogOpen(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string): Promise<void> => {
    try {
      // TODO: Replace with API call to delete member
      setMembers(members.filter((m) => m.id !== memberId));
      toast({
        title: 'Success',
        description: 'Member deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete member',
        variant: 'destructive'
      });
    }
  };

  const handleAddMember = async (memberData: { name: string; email: string; team_id?: string }): Promise<void> => {
    try {
      // TODO: Replace with API call to add member
      await fetchData();
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateMember = async (
    memberId: string,
    updates: Partial<{ first_name?: string; last_name?: string; email?: string; team_id?: string }>
  ): Promise<void> => {
    if (!organizationId) {
      console.error('❌ No organization ID found');
      toast({
        title: 'Error',
        description: 'No organization ID found',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Prepare the update data
      const updateData = {
        first_name: updates.first_name,
        last_name: updates.last_name,
        email: updates.email,
        team_id: updates.team_id
      };

      // Call the API to update the member's team
      await updateUserTeamMutation.mutateAsync({
        id: organizationId,
        userId: memberId,
        data: { team_id: updateData.team_id || '' }
      });

      toast({
        title: 'Success',
        description: 'Member updated successfully'
      });
      setEditMemberDialogOpen(false);

      // Update the local state to reflect the team change immediately
      const newTeamId = updateData.team_id;
      if (newTeamId) {
        const newTeam = permissionGroups.find((team) => team.id === newTeamId);
        if (newTeam) {
          setMembers((prevMembers) =>
            prevMembers.map((member) =>
              member.id === memberId
                ? { ...member, team: newTeam.name }
                : member
            )
          );
        }
      }
    } catch (error) {
      console.error('❌ Error updating member:', error);
      toast({
        title: 'Error',
        description: 'Failed to update member',
        variant: 'destructive'
      });
    }
  };

  const handleCreateGroup = async (name: string, initialPermissions: Record<string, boolean>): Promise<void> => {
    if (!organizationId) {
      toast({
        title: 'Error',
        description: 'No organization ID found',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Create the team using the API
      const response = await createTeamMutation.mutateAsync({
        data: {
          name,
          description: ''
        },
        params: {
          organization_id: organizationId
        }
      });

      const newTeam = response.data as { id: string };
      if (!newTeam) {throw new Error('Failed to create team');}

      // Set permissions using the API
      const permissionEntries: BulkSetTeamPermissionsDto[] = Object.entries(initialPermissions).map(([key, value]) => {
        const [resourceType] = key.split(':');
        return {
          resource_type: resourceType as BulkSetTeamPermissionsDtoResourceType,
          access_level: value ? 'readWrite' : 'none'
        };
      });

      await setPermissionsMutation.mutateAsync({
        teamId: newTeam.id,
        data: permissionEntries,
        params: {
          organization_id: organizationId
        }
      });

      await fetchData();
      toast({
        title: 'Success',
        description: 'Permission group created successfully'
      });
    } catch (error) {
      console.error('Error creating permission group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create permission group',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="teams-page-loading">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-[140px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Skeleton className="h-10 w-full" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-[100px]" />
                      <Skeleton className="h-6 w-[80px]" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <MemberList
        members={members}
        search={search}
        onSearchChange={setSearch}
        onAddMember={() => setAddDialogOpen(true)}
        onEditMember={(member) => {
          setMemberToEdit(member);
          setEditMemberDialogOpen(true);
        }}
        onDeleteMember={handleDeleteMember}
      />

      <PermissionDialog
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
        selectedMember={selectedMember}
        meetingTypes={meetingTypes}
        reportTypes={reportTypes}
        pendingPermissions={pendingPermissions}
        isSaving={isSaving}
        onSave={handleSavePermissions}
        getPermissionValue={getPermissionValue}
        onPermissionChange={handlePermissionChange}
        members={members}
        onCopyPermissions={async (sourceMemberId, targetMemberId) => {
          try {
            // Get all permissions for the source member
            const sourcePermissions = groupPermissions.filter(
              (p) => p.team_id === sourceMemberId
            );

            // Create new permissions for the target member
            const newPermissions = sourcePermissions.map((perm) => ({
              ...perm,
              team_id: targetMemberId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));

            // Set permissions using the API
            const permissionEntries: BulkSetTeamPermissionsDto[] = newPermissions.map((perm) => ({
              resource_type: (perm.meeting_type_id ? 'meeting_type' : 'report_type') as BulkSetTeamPermissionsDtoResourceType,
              access_level: perm.can_write ? 'readWrite' : 'none'
            }));

            await setPermissionsMutation.mutateAsync({
              teamId: targetMemberId,
              data: permissionEntries,
              params: {
                organization_id: organizationId || ''
              }
            });

            // Refresh data
            await fetchData();

            toast({
              title: 'Success',
              description: 'Permissions copied successfully'
            });
          } catch (error) {
            console.error('Error copying permissions:', error);
            toast({
              title: 'Error',
              description: 'Failed to copy permissions',
              variant: 'destructive'
            });
          }
        }}
      />

      <EditMemberDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        permissionGroups={permissionGroups}
        onAddMember={handleAddMember}
      />

      <EditMemberDialog
        open={editMemberDialogOpen}
        onClose={() => setEditMemberDialogOpen(false)}
        member={memberToEdit}
        permissionGroups={permissionGroups}
        currentUserId={user?.id || ''}
        onUpdateMember={(memberId, updates) => {
          return handleUpdateMember(memberId, updates);
        }}
      />

      <CreateGroupDialog
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        onCreateGroup={handleCreateGroup}
        meetingTypes={meetingTypes}
        reportTypes={reportTypes}
        onGroupCreated={fetchData}
      />
    </div>
  );
};

export default RoleManagement;
