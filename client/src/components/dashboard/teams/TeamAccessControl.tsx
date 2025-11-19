import { useMeetingTypesControllerFindAll, usePermissionsControllerBulkSetTeamPermissions, usePermissionsControllerGetTeamPermissions } from '@/api/generated/knowtedAPI';
import type { BulkSetTeamPermissionsDto } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Check } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

const PAGE_ACCESS = [
  { id: 'organization', label: 'Organization Details' },
  { id: 'teams', label: 'Teams' },
  { id: 'users', label: 'Users' },
  { id: 'permissions', label: 'Access Control' },
  { id: 'billing', label: 'Billing' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'meeting_types', label: 'Meeting Types' }
];

interface PermissionState {
  read: boolean;
  write: boolean;
}

interface PermissionsShape {
  meetingTypes: Record<string, PermissionState>;
  pages: Record<string, PermissionState>;
}

interface PermissionData {
  resource_type: string;
  resource_id: string | null;
  access_level: string;
}

interface TeamAccessControlProps {
  teamId: string | null;
  isAdminTeam?: boolean;
  onPermissionsChange?: (permissions: PermissionsShape | null) => void;
  onSave?: (permissions: PermissionsShape) => Promise<void>;
  showSaveButton?: boolean;
  compact?: boolean;
}

export interface TeamAccessControlRef {
  getCurrentPermissions: () => PermissionsShape | null;
  savePermissions: () => Promise<void>;
}

const TeamAccessControl = forwardRef<TeamAccessControlRef, TeamAccessControlProps>(({
  teamId,
  isAdminTeam = false,
  onPermissionsChange,
  onSave,
  showSaveButton = true,
  compact = false
}, ref) => {
  const { organization } = useAuth();
  const { toast } = useToast();
  const [pendingPermissions, setPendingPermissions] = useState<PermissionsShape | null>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getCurrentPermissions: () => pendingPermissions,
    savePermissions: handleSave
  }));

  // Fetch meeting types
  const { data: meetingTypesData, isLoading: meetingTypesLoading } = useMeetingTypesControllerFindAll(
    { organization_id: organization?.id || '' },
    { query: { enabled: !!organization?.id } }
  );
  const meetingTypes = Array.isArray(meetingTypesData) ? meetingTypesData : [];

  // Fetch permissions for selected team
  const {
    data: teamPermissionsData,
    isLoading: teamPermissionsLoading,
    refetch: refetchTeamPermissions
  } = usePermissionsControllerGetTeamPermissions(
    teamId || '',
    { organization_id: organization?.id || '' },
    { query: { enabled: !!teamId && !!organization?.id } }
  );

  // Prepare permission state for UI
  useEffect(() => {
    if (!teamPermissionsLoading && teamPermissionsData) {
      const structured = structurePermissions(teamPermissionsData);
      setPendingPermissions(structured);
      onPermissionsChange?.(structured);
    } else if (!teamId) {
      // For new teams, initialize with default permissions
      const defaultPermissions = getDefaultPermissions();
      setPendingPermissions(defaultPermissions);
      onPermissionsChange?.(defaultPermissions);
    }
  }, [teamPermissionsData, teamPermissionsLoading, meetingTypes, teamId, onPermissionsChange]);

  // Helper to get default permissions for new teams
  function getDefaultPermissions(): PermissionsShape {
    const mt: Record<string, PermissionState> = {};
    meetingTypes.forEach((mtType) => {
      mt[mtType.id] = { read: false, write: false };
    });
    const pg: Record<string, PermissionState> = {};
    PAGE_ACCESS.forEach((page) => {
      pg[page.id] = { read: false, write: false };
    });
    return { meetingTypes: mt, pages: pg };
  }

  // Helper to structure permissions for UI
  function structurePermissions(raw: unknown): PermissionsShape {
    const mt: Record<string, PermissionState> = {};
    meetingTypes.forEach((mtType) => {
      mt[mtType.id] = { read: false, write: false };
    });
    const pg: Record<string, PermissionState> = {};
    PAGE_ACCESS.forEach((page) => {
      pg[page.id] = { read: false, write: false };
    });

    if (Array.isArray(raw)) {
      // First pass: process general permissions (resource_id: null)
      raw.forEach((perm: PermissionData) => {
        if (perm.resource_type === 'meeting_types' && !perm.resource_id) {
          // General meeting types permission (applies to all meeting types)
          Object.keys(mt).forEach((mtId) => {
            mt[mtId].read = perm.access_level === 'read' || perm.access_level === 'readWrite';
            mt[mtId].write = perm.access_level === 'readWrite';
          });
        }

        if (perm.resource_type in pg && !perm.resource_id) {
          if (perm.resource_type === 'organization') {
            // Organization details: never allow read, only write
            pg[perm.resource_type].read = false;
            pg[perm.resource_type].write = perm.access_level === 'readWrite';
          } else {
            pg[perm.resource_type].read = perm.access_level === 'read' || perm.access_level === 'readWrite';
            pg[perm.resource_type].write = perm.access_level === 'readWrite';
          }
        }
      });

      // Second pass: process specific permissions (resource_id exists) to override general ones
      raw.forEach((perm: PermissionData) => {
        if (perm.resource_type === 'meeting_types' && perm.resource_id && mt[perm.resource_id]) {
          // Specific meeting type permission (overrides general permission)
          mt[perm.resource_id].read = perm.access_level === 'read' || perm.access_level === 'readWrite';
          mt[perm.resource_id].write = perm.access_level === 'readWrite';
        }
      });
    }

    // For admin teams, set all permissions to true (except organization details read)
    if (isAdminTeam) {
      Object.keys(mt).forEach((id) => {
        mt[id] = { read: true, write: true };
      });
      Object.keys(pg).forEach((id) => {
        if (id === 'organization') {
          pg[id] = { read: false, write: true }; // Organization details: no read, yes write
        } else {
          pg[id] = { read: true, write: true };
        }
      });
    }

    // Auto-enable meeting types page access if team has any meeting type resources
    const hasAnyMeetingTypeAccess = Object.values(mt).some((perm) => perm.read || perm.write);
    if (hasAnyMeetingTypeAccess) {
      pg.meeting_types = { read: true, write: false };
    }

    return { meetingTypes: mt, pages: pg };
  }

  // Handle permission toggle
  function handleToggle(section: keyof PermissionsShape, id: string, type: 'read' | 'write', checked: boolean): void {
    if (isAdminTeam) {
      return; // Disable editing for admin teams
    }

    setPendingPermissions((prev) => {
      if (!prev) {
        return prev;
      }
      const updated = { ...prev };
      updated[section] = { ...updated[section], [id]: { ...updated[section][id] } };
      updated[section][id][type] = checked;
      if (type === 'write' && checked) {
        updated[section][id].read = true;
      }
      if (type === 'read' && !checked) {
        updated[section][id].write = false;
      }
      onPermissionsChange?.(updated);
      return updated;
    });
  }

  // Save permissions
  const { mutate: savePermissions } = usePermissionsControllerBulkSetTeamPermissions({
    mutation: {
      onSuccess: () => {
        refetchTeamPermissions();
        toast({ title: 'Success', description: 'Permissions updated successfully' });
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to update permissions', variant: 'destructive' });
      }
    }
  });

  async function handleSave(): Promise<void> {
    if (!teamId || !pendingPermissions) {
      return;
    }

    if (onSave) {
      await onSave(pendingPermissions);
      return;
    }

    const data: BulkSetTeamPermissionsDto[] = [];
    Object.entries(pendingPermissions.meetingTypes).forEach(([id, perms]) => {
      data.push({ resource_type: 'meeting_types', resource_id: id, access_level: perms.write ? 'readWrite' : perms.read ? 'read' : 'none' });
    });
    Object.entries(pendingPermissions.pages).forEach(([id, perms]) => {
      if (id === 'organization') {
        // Organization details: only save write permission, never read
        data.push({ resource_type: id as 'teams' | 'users' | 'billing' | 'calendar' | 'organization' | 'permissions', resource_id: null, access_level: perms.write ? 'readWrite' : 'none' });
      } else {
        data.push({ resource_type: id as 'teams' | 'users' | 'billing' | 'calendar' | 'organization' | 'permissions', resource_id: null, access_level: perms.write ? 'readWrite' : perms.read ? 'read' : 'none' });
      }
    });
    savePermissions({
      teamId: teamId,
      data,
      params: { organization_id: organization?.id || '' }
    });
  }

  // Loading state
  if (meetingTypesLoading || (teamId && teamPermissionsLoading)) {
    return <div className="flex items-center justify-center py-8">Loading permissions...</div>;
  }

  if (!pendingPermissions) {
    return <div className="text-center py-8 text-gray-500">No permissions data available</div>;
  }

  return (
    <div className="space-y-6">
      {!compact && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Read access allows viewing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Write access allows editing</span>
          </div>
        </div>
      )}

      {/* Meeting Types Access */}
      <div>
        <h4 className="font-semibold text-lg mb-3 text-gray-900">Meeting Types Access</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="relative w-full overflow-auto">
            <Table className="w-full caption-bottom text-sm">
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[200px] py-3 px-4 font-medium text-gray-700">Meeting Type</TableHead>
                  <TableHead className="text-center py-3 px-4 font-medium text-gray-700">Can see meeting content</TableHead>
                  <TableHead className="text-center py-3 px-4 font-medium text-gray-700">Can edit meeting content</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetingTypes.map((mt) => (
                  <TableRow key={mt.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <TableCell className="font-medium py-3 px-4">{mt.name}</TableCell>
                    <TableCell className="text-center py-3 px-4">
                      <Checkbox
                        checked={pendingPermissions.meetingTypes[mt.id]?.read || false}
                        onCheckedChange={(checked) => handleToggle('meetingTypes', mt.id, 'read', checked as boolean)}
                        disabled={isAdminTeam}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      >
                        {pendingPermissions.meetingTypes[mt.id]?.read && <Check className="h-4 w-4" />}
                      </Checkbox>
                    </TableCell>
                    <TableCell className="text-center py-3 px-4">
                      <Checkbox
                        checked={pendingPermissions.meetingTypes[mt.id]?.write || false}
                        onCheckedChange={(checked) => handleToggle('meetingTypes', mt.id, 'write', checked as boolean)}
                        disabled={isAdminTeam}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      >
                        {pendingPermissions.meetingTypes[mt.id]?.write && <Check className="h-4 w-4" />}
                      </Checkbox>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Page Access */}
      <div>
        <h4 className="font-semibold text-lg mb-3 text-gray-900">Settings Access</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="relative w-full overflow-auto">
            <Table className="w-full caption-bottom text-sm">
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[200px] py-3 px-4 font-medium text-gray-700">Page</TableHead>
                  <TableHead className="text-center py-3 px-4 font-medium text-gray-700">Can view</TableHead>
                  <TableHead className="text-center py-3 px-4 font-medium text-gray-700">Can edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PAGE_ACCESS.map((page) => (
                  <TableRow key={page.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <TableCell className="font-medium py-3 px-4">{page.label}</TableCell>
                    <TableCell className="text-center py-3 px-4">
                      {page.id === 'organization' ? (
                        <span className="text-gray-400 text-sm">Always available</span>
                      ) : (
                        <Checkbox
                          checked={pendingPermissions.pages[page.id]?.read || false}
                          onCheckedChange={(checked) => handleToggle('pages', page.id, 'read', checked as boolean)}
                          disabled={isAdminTeam}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        >
                          {pendingPermissions.pages[page.id]?.read && <Check className="h-4 w-4" />}
                        </Checkbox>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-3 px-4">
                      <Checkbox
                        checked={pendingPermissions.pages[page.id]?.write || false}
                        onCheckedChange={(checked) => handleToggle('pages', page.id, 'write', checked as boolean)}
                        disabled={isAdminTeam}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      >
                        {pendingPermissions.pages[page.id]?.write && <Check className="h-4 w-4" />}
                      </Checkbox>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {showSaveButton && (
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-white h-11 px-6 py-2"
            disabled={isAdminTeam}
          >
            Update Access Control
          </Button>
        </div>
      )}
    </div>
  );
});

TeamAccessControl.displayName = 'TeamAccessControl';

export default TeamAccessControl;
