import { useOrganizationsControllerGetOrganizationMembers, usePermissionsControllerGetTeamPermissions, useTeamsControllerFindAll } from '@/api/generated/knowtedAPI';
import { useAuth } from '@/context/AuthContext';
import { RESOURCE_CONFIG } from '@/routes/resources';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

const Organization = (): JSX.Element => {
  const { isAuthenticated, loading, organization, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [filteredResources, setFilteredResources] = useState<typeof RESOURCE_CONFIG>([]);

  // Get organization members to find current user's team
  const { data: membersData } = useOrganizationsControllerGetOrganizationMembers(
    organization?.id || '',
    {
      query: {
        enabled: !!organization?.id && !!user?.id
      }
    }
  );

  // Get all teams for the organization
  const { data: teamsData } = useTeamsControllerFindAll(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );

  // Get permissions for the user's team
  const { data: teamPermissionsData } = usePermissionsControllerGetTeamPermissions(
    userTeamId || '',
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!userTeamId && !!organization?.id
      }
    }
  );

  // Find current user's team
  useEffect(() => {
    if (membersData && user?.id && teamsData) {
      const currentUserMember = Array.isArray(membersData)
        ? membersData.find((member) => member.id === user.id)
        : null;

      if (currentUserMember?.team && Array.isArray(teamsData)) {
        const userTeam = teamsData.find((team) => team.name === currentUserMember.team);
        if (userTeam) {
          setUserTeamId(userTeam.id);
        }
      }
    }
  }, [membersData, user?.id, teamsData]);

  // Filter resources based on permissions
  useEffect(() => {
    console.warn('Permission filtering debug:', {
      teamPermissionsData,
      userTeamId,
      teamsData: Array.isArray(teamsData) ? teamsData.length : 0
    });

    if (!userTeamId) {
      // If no user team ID, show empty array (no access)
      console.warn('No userTeamId, showing no resources');
      setFilteredResources([]);
      return;
    }

    if (!teamPermissionsData) {
      // If no permissions data, show empty array (no access)
      console.warn('No teamPermissionsData, showing no resources');
      setFilteredResources([]);
      return;
    }

    const permissions = Array.isArray(teamPermissionsData) ? teamPermissionsData : [];
    console.warn('Permissions array:', permissions);
    console.warn('RESOURCE_CONFIG:', RESOURCE_CONFIG);

    // Check if user is in admin team
    const teams = Array.isArray(teamsData) ? teamsData : [];
    const userTeam = teams.find((team) => team.id === userTeamId);
    const isAdminTeam = userTeam?.is_admin || false;
    console.warn('User team:', userTeam, 'isAdminTeam:', isAdminTeam);

    if (isAdminTeam) {
      // Admin teams have access to everything
      console.warn('Admin team, showing all resources');
      setFilteredResources(RESOURCE_CONFIG);
      return;
    }

    // Filter resources based on permissions
    const accessibleResources = RESOURCE_CONFIG.filter((resource) => {
      console.warn(`🔍 Checking resource: ${resource.path}`);

      // Map resource paths to permission resource types
      const permissionMap: Record<string, string> = {
        'account': 'organization', // Account is always accessible
        'details': 'organization',
        'teams': 'teams',
        'users': 'users',
        'billing': 'billing',
        'meeting-types': 'meeting_types',
        'calendar': 'calendar'
      };

      const permissionType = permissionMap[resource.path];
      console.warn(`🔍 Resource ${resource.path} maps to permission type: ${permissionType}`);

      if (!permissionType) {
        console.warn(`No permission mapping for ${resource.path}, allowing access`);
        return true; // Allow access if no permission mapping
      }

      // Check if user has read or readWrite permission for this resource
      const hasPermission = permissions.some((perm) =>
        perm.resource_type === permissionType &&
        perm.resource_id === null &&
        (perm.access_level === 'read' || perm.access_level === 'readWrite')
      );

      console.warn(`🔍 Initial permission check for ${permissionType}: ${hasPermission}`);

      // Meeting types page requires explicit meeting_types permission
      // No special case - user must have generic 'meeting_types' permission to see this tab

      // Access-control page requires explicit permissions access
      // No special case - user must have 'permissions' permission to see this tab

      console.warn(`🔍 Final result for ${resource.path} (${permissionType}): hasPermission=${hasPermission}`);
      return hasPermission;
    });

  console.warn('Filtered resources:', accessibleResources.map((r) => r.path));
    setFilteredResources(accessibleResources);
  }, [teamPermissionsData, userTeamId, teamsData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="max-w-[100vw]">
      {/* Top Navigation Bar - Sticky */}
      <div className="sticky top-0 z-50 bg-white dark:bg-background border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
            </div>
          </div>

          {/* Tab Navigation - Responsive */}
          <div className="overflow-x-auto">
            <nav className="flex space-x-4 sm:space-x-8 min-w-max">
              {filteredResources.map((resource) => {
                const isActive = location.pathname.includes(resource.path);

                return (
                  <button
                    key={resource.path}
                    onClick={() => navigate(resource.path)}
                    className={cn(
                      'py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0',
                      isActive
                        ? 'border-primary text-primary font-semibold'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    {resource.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content with Improved Section Separators */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 p-4 sm:py-8">
        <div>
          {/* Content Container with Section Separators */}
          <div className="divide-y divide-gray-200">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Organization;
