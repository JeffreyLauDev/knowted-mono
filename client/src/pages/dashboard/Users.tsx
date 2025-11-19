import { useOrganizationsControllerCancelInvitation, useOrganizationsControllerGetOrganizationMembers, useOrganizationsControllerGetPendingInvitations, useOrganizationsControllerUpdateUserTeam, usePaymentControllerGetCurrentPlan, useTeamsControllerFindAll } from '@/api/generated/knowtedAPI';
import type { CurrentPlanDto, OrganizationMemberResponseDto } from '@/api/generated/models';
import { AddMemberDialog } from '@/components/dashboard/role-management/AddMemberDialog';
import { EditMemberDialog } from '@/components/dashboard/role-management/EditMemberDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/context/AuthContext';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Clock, Edit, Filter, MoreHorizontal, Plus, Search, Trash2, User } from 'lucide-react';
import React, { useState } from 'react';

const Users = (): JSX.Element => {
  const { organization, user } = useAuth();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMemberResponseDto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    teams: [] as string[],
    status: [] as string[],
    dateRange: 'all' as string
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Get organization members
  const { data: membersData, isLoading: membersLoading, refetch } = useOrganizationsControllerGetOrganizationMembers(
    organization?.id || '',
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );

  // Get pending invitations
  const {
    data: pendingInvitationsData,
    isLoading: pendingInvitationsLoading,
    refetch: refetchPending
  } = useOrganizationsControllerGetPendingInvitations(
    organization?.id || '',
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );

  // Get teams for permission groups
  const { data: teamsData } = useTeamsControllerFindAll(
    {
      organization_id: organization?.id || ''
    },
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );

  // Get current plan information for seat limits
  const { data: currentPlanData, isLoading: currentPlanLoading } = usePaymentControllerGetCurrentPlan(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );

  // Cancel invitation mutation
  const cancelInvitationMutation = useOrganizationsControllerCancelInvitation();

  // Update user team mutation
  const updateUserTeamMutation = useOrganizationsControllerUpdateUserTeam();

  // Ensure members is always an array
  const members = Array.isArray(membersData) ? membersData : [];
  const pendingInvitations = Array.isArray(pendingInvitationsData) ? pendingInvitationsData : [];
  const teams = Array.isArray(teamsData) ? teamsData : [];
  const currentPlan = currentPlanData as CurrentPlanDto | undefined;

  // Calculate available seats
  const currentSeats = members.length;
  const actualSeats = currentPlan?.seatsCount || 1; // Use actual subscription seats, not plan limit
  const availableSeats = Math.max(0, actualSeats - currentSeats);
  const isAtSeatLimit = currentSeats >= actualSeats;

  // Filter members based on search query and filters
  const filteredMembers = members.filter((member) => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      member.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());

    // Team filter
    const matchesTeam = filters.teams.length === 0 ||
      (member.team && filters.teams.includes(member.team));

    // Status filter (for now, we'll consider all members as active)
    const matchesStatus = filters.status.length === 0 ||
      filters.status.includes('active');

    // Date range filter (simplified - you can enhance this based on your data)
    const matchesDateRange = filters.dateRange === 'all' ||
      filters.dateRange === 'recent' ||
      filters.dateRange === 'older';

    return matchesSearch && matchesTeam && matchesStatus && matchesDateRange;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageMembers = filteredMembers.slice(startIndex, endIndex);

  // Reset to first page when search query or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  const handleUserInvited = (): void => {
    // Refetch both the members list and pending invitations after a successful invitation
    refetch();
    refetchPending();
  };

  const handleCancelInvitation = async (invitationId: string): Promise<void> => {
    try {
      await cancelInvitationMutation.mutateAsync({
        data: {
          invitation_id: invitationId
        },
        params: {
          organization_id: organization?.id || ''
        }
      });
      // Refetch pending invitations after successful cancellation
      refetchPending();
    } catch (error) {
      console.error('Error canceling invitation:', error);
    }
  };

  const handleEditMember = (member: OrganizationMemberResponseDto): void => {
    setSelectedMember(member);
    setIsEditDialogOpen(true);
  };

  const handleUpdateMember = async (
    memberId: string,
    updates: Partial<{ first_name?: string; last_name?: string; email?: string; team_id?: string }>
  ): Promise<void> => {
    try {
      // Only update team for other users (name updates are handled by PATCH /profiles/me)
      if (updates.team_id) {
        await updateUserTeamMutation.mutateAsync({
          id: organization?.id || '',
          userId: memberId,
          data: { team_id: updates.team_id }
        });
      }

      // Close dialog and refresh data
      setIsEditDialogOpen(false);
      setSelectedMember(null);
      refetch();
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  const handleCloseEditDialog = (): void => {
    setIsEditDialogOpen(false);
    setSelectedMember(null);
  };

  // Pagination handlers
  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
  };

  const handlePreviousPage = (): void => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = (): void => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Filter handlers
  const handleTeamFilter = async (team: string, checked: boolean): Promise<void> => {
    // Haptic feedback for filter interaction
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Silently fail if haptics are not available
    }

    setFilters((prev) => ({
      ...prev,
      teams: checked
        ? [...prev.teams, team]
        : prev.teams.filter((t) => t !== team)
    }));
  };

  const handleStatusFilter = async (status: string, checked: boolean): Promise<void> => {
    // Haptic feedback for filter interaction
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Silently fail if haptics are not available
    }

    setFilters((prev) => ({
      ...prev,
      status: checked
        ? [...prev.status, status]
        : prev.status.filter((s) => s !== status)
    }));
  };

  const handleDateRangeFilter = async (dateRange: string): Promise<void> => {
    // Haptic feedback for filter interaction
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Silently fail if haptics are not available
    }

    setFilters((prev) => ({
      ...prev,
      dateRange
    }));
  };

  const clearAllFilters = async (): Promise<void> => {
    // Haptic feedback for clear action
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Silently fail if haptics are not available
    }

    setFilters({
      teams: [],
      status: [],
      dateRange: 'all'
    });
  };

  const hasActiveFilters = (): boolean => {
    return filters.teams.length > 0 || filters.status.length > 0 || filters.dateRange !== 'all';
  };

  // Get unique teams from members
  const availableTeams = Array.from(new Set(members.map((member) => member.team).filter(Boolean)));

  // Helper function to get user initials
  const getUserInitials = (firstName?: string, lastName?: string): string => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  // Helper function to get access tags based on team
  const getAccessTags = (teamName?: string): { label: string; className: string }[] => {
    if (!teamName) {
      return [];
    }

    // Map team names to access levels with specific colors matching the design
    const accessMap: Record<string, { label: string; className: string }> = {
      'Admin': { label: 'Admin', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      'Manager': { label: 'Manager', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      'Member': { label: 'Member', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      'Viewer': { label: 'Viewer', className: 'bg-muted text-muted-foreground' }
    };

    const team = accessMap[teamName] || { label: teamName, className: 'bg-muted text-muted-foreground' };
    return [team];
  };

  return (
    <>
      <div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Current Users Section */}
          <div>
            {/* Section Header */}
            <div className="py-6 px-4">
              <div className="flex flex-col gap-4">
                {/* Title and Filters Row */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-1 sm:space-y-0">
                    <h2 className="text-2xl font-bold text-foreground">All Users</h2>
                    {!currentPlanLoading && currentPlan && (
                      <span className="text-sm text-muted-foreground">
                        {currentSeats} of {actualSeats} seats used
                        {isAtSeatLimit && (
                          <span className="text-red-600 font-medium ml-1">• At limit</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Filters and Add User - Desktop only */}
                  <div className="hidden sm:flex items-center space-x-3">
                    {/* Filters */}
                    <div className="relative">
                    {/* Desktop Popover */}
                    <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`hidden sm:flex h-10 px-4 bg-background border-border hover:bg-accent focus:ring-primary hover:text-gray ${
                            hasActiveFilters() ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          <Filter className="h-4 w-4 mr-2" />
                          Filters
                          {hasActiveFilters() && (
                            <span className="ml-1 h-2 w-2 bg-primary rounded-full"></span>
                          )}
                        </Button>
                      </PopoverTrigger>
                    {/* Desktop Popover */}
                    <PopoverContent className="hidden sm:block w-80 p-4" align="end">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground">Filters</h3>
                          {hasActiveFilters() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearAllFilters}
                              className="text-xs text-muted-foreground hover:text-muted-foreground"
                            >
                              Clear all
                            </Button>
                          )}
                        </div>

                        {/* Team Filter */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Team</label>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {availableTeams.map((team) => (
                              <div key={team} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`team-${team}`}
                                  checked={filters.teams.includes(team)}
                                  onCheckedChange={(checked) => handleTeamFilter(team, checked as boolean)}
                                />
                                <label htmlFor={`team-${team}`} className="text-sm text-muted-foreground">
                                  {team}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Status</label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="status-active"
                                checked={filters.status.includes('active')}
                                onCheckedChange={(checked) => handleStatusFilter('active', checked as boolean)}
                              />
                              <label htmlFor="status-active" className="text-sm text-muted-foreground">
                                Active
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="status-inactive"
                                checked={filters.status.includes('inactive')}
                                onCheckedChange={(checked) => handleStatusFilter('inactive', checked as boolean)}
                              />
                              <label htmlFor="status-inactive" className="text-sm text-muted-foreground">
                                Inactive
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Date Range Filter */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Date Added</label>
                          <div className="space-y-2">
                            {[
                              { value: 'all', label: 'All time' },
                              { value: 'recent', label: 'Last 30 days' },
                              { value: 'older', label: 'Older than 30 days' }
                            ].map((option) => (
                              <div key={option.value} className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`date-${option.value}`}
                                  name="dateRange"
                                  value={option.value}
                                  checked={filters.dateRange === option.value}
                                  onChange={(e) => handleDateRangeFilter(e.target.value)}
                                  className="text-primary focus:ring-primary"
                                />
                                <label htmlFor={`date-${option.value}`} className="text-sm text-muted-foreground">
                                  {option.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                    </Popover>

                    {/* Mobile Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Haptic feedback for opening filters
                        try {
                          await Haptics.impact({ style: ImpactStyle.Light });
                        } catch {
                          // Silently fail if haptics are not available
                        }
                        setIsFilterOpen(true);
                      }}
                      className={`sm:hidden h-10 px-3 bg-background border-border hover:bg-accent focus:ring-primary hover:text-gray ${
                        hasActiveFilters() ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      {hasActiveFilters() && (
                        <span className="ml-1 h-2 w-2 bg-primary rounded-full"></span>
                      )}
                    </Button>
                    </div>

                    {/* Add User Button */}
                    <Button
                      onClick={() => setIsInviteDialogOpen(true)}
                      className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={isAtSeatLimit}
                      title={isAtSeatLimit ? 'You have reached your seat limit. Please upgrade your plan to invite more users.' : 'Invite a new user to your organization'}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add user
                    </Button>
                  </div>

                  {/* Mobile Filters Button */}
                  <div className="sm:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await Haptics.impact({ style: ImpactStyle.Light });
                        } catch {
                          // Silently fail if haptics are not available
                        }
                        setIsFilterOpen(true);
                      }}
                      className={`px-3 sm:px-4 h-10 bg-background border-border hover:bg-accent focus:ring-primary hover:text-gray ${
                        hasActiveFilters() ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      {hasActiveFilters() && (
                        <span className="ml-1 h-2 w-2 bg-primary rounded-full"></span>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Search Bar Row */}
                <div className="flex items-center">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full h-10 border-0 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-hidden">
              {membersLoading ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded-md" />
                    ))}
                  </div>
                </div>
              ) : currentPageMembers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium">No users found</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search terms.' : 'Invite your first team member to get started.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table Layout */}
                  <div className="hidden sm:block">
                                      <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-muted-foreground border-b border-border">
                      <div className="col-span-5">User name</div>
                      <div className="col-span-3">Access</div>
                      <div className="col-span-2">Last active</div>
                      <div className="col-span-1">Date added</div>
                      <div className="col-span-1"></div>
                    </div>

                  {currentPageMembers.map((member, index) => {
                    const accessTags = getAccessTags(member.team);
                    const initials = getUserInitials(member.first_name, member.last_name);

                    return (
                                              <div key={member.id} className={`grid grid-cols-12 gap-4 p-4 items-start  transition-colors ${index < currentPageMembers.length - 1 ? 'border-b border-border' : ''}`}>
                          <div className="col-span-5">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src="" alt={`${member.first_name} ${member.last_name}`} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">
                                {member.first_name} {member.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-3">
                          <div className="flex flex-wrap gap-2">
                            {accessTags.map((tag, tagIndex) => (
                              <span key={tagIndex} className={`px-2 py-1 rounded-full text-xs font-medium ${tag.className}`}>
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="col-span-2 text-sm text-muted-foreground">
                          {new Date().toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="col-span-1 text-sm text-muted-foreground">
                          {new Date().toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="col-span-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditMember(member)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 dark:text-red-400">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                  </div>

                  {/* Mobile List Layout */}
                  <div className="sm:hidden">
                    {currentPageMembers.map((member, index) => {
                      const accessTags = getAccessTags(member.team);
                      const initials = getUserInitials(member.first_name, member.last_name);

                      return (
                        <div key={member.id} className={`hover:bg-accent transition-colors ${index < currentPageMembers.length - 1 ? 'border-b border-border' : ''}`}>
                          <div className="py-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                  <AvatarImage src="" alt={`${member.first_name} ${member.last_name}`} />
                                  <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-foreground truncate">
                                    {member.first_name} {member.last_name}
                                  </div>
                                  <div className="text-sm text-muted-foreground truncate mt-1">
                                    {member.email}
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {accessTags.map((tag, tagIndex) => (
                                      <span key={tagIndex} className={`px-2 py-1 rounded-full text-xs font-medium ${tag.className}`}>
                                        {tag.label}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 ml-3 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditMember(member)}
                                  className="h-9 w-9 p-0 hover:bg-muted"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 p-0 hover:bg-muted text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Pagination */}
            {filteredMembers.length > itemsPerPage && (
              <div className="px-6 py-6">
                <div className="flex items-center justify-center space-x-1">
                  {/* Previous Button */}
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className={`h-9 w-9 rounded-md text-sm font-medium transition-colors ${
                      currentPage === 1
                        ? 'text-muted-foreground cursor-not-allowed'
                        : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    ‹
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`h-9 w-9 rounded-md text-sm font-medium transition-colors ${
                        page === currentPage
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Next Button */}
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`h-9 w-9 rounded-md text-sm font-medium transition-colors ${
                      currentPage === totalPages
                        ? 'text-muted-foreground cursor-not-allowed'
                        : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    ›
                  </button>
                </div>

                {/* Pagination Info */}
                <div className="flex items-center justify-center mt-2 text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredMembers.length)} of{' '}
                  {filteredMembers.length} users
                </div>
              </div>
            )}
          </div>

          {/* Pending Invitations Section */}
          {pendingInvitations.length > 0 && (
            <div className="bg-background">
              <div className="px-6 py-6">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">Pending Invitations</h3>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">{pendingInvitations.length}</Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-1">Users who have been invited but haven't accepted yet.</p>
              </div>

              <div className="overflow-hidden">
                {pendingInvitationsLoading ? (
                  <div className="p-6">
                    <div className="animate-pulse space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-16 bg-muted rounded-md" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-6">
                    <div className="grid grid-cols-12 gap-4 py-4 text-sm font-medium text-muted-foreground border-b border-border">
                      <div className="col-span-4">Email</div>
                      <div className="col-span-3">Team</div>
                      <div className="col-span-3">Status</div>
                      <div className="col-span-2"></div>
                    </div>

                    {pendingInvitations.map((invitation, index) => (
                      <div key={invitation.id} className={`grid grid-cols-12 gap-4 py-4 items-center hover:bg-accent transition-colors ${index < pendingInvitations.length - 1 ? 'border-b border-border' : ''}`}>
                        <div className="col-span-4 text-foreground">{invitation.email}</div>
                        <div className="col-span-3 text-muted-foreground">{invitation.team_name || 'No team assigned'}</div>
                        <div className="col-span-3">
                          <span className="px-2 py-1 rounded-full text-xs font-medium text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20">
                            Pending
                          </span>
                        </div>
                        <div className="col-span-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCancelInvitation(invitation.id)}
                            disabled={cancelInvitationMutation.isPending}
                            className="h-8 w-8 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button - Mobile only */}
        <div className="fixed bottom-6 right-6 sm:hidden z-50">
          <Button
            onClick={() => setIsInviteDialogOpen(true)}
            disabled={isAtSeatLimit}
            className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isAtSeatLimit ? 'You have reached your seat limit. Please upgrade your plan to invite more users.' : 'Invite a new user to your organization'}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile Bottom Sheet - Filters */}
        <BottomSheet
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="Filters"
          showCloseButton={true}
          showApplyButton={true}
          applyButtonText="Apply Filters"
          enableSwipeToClose={true}
          enableBackdropClose={false}
          className="sm:hidden"
        >
          <div className="px-6 py-4">
            <div className="space-y-6">
              {/* Clear All Button */}
              {hasActiveFilters() && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-sm text-muted-foreground hover:text-muted-foreground"
                  >
                    Clear all
                  </Button>
                </div>
              )}

              {/* Team Filter */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-foreground">Team</h3>
                <div className="space-y-3">
                  {availableTeams.map((team) => (
                    <div
                      key={team}
                      className="flex items-center space-x-3 transition-colors hover:bg-accent rounded-md p-2 -m-2"
                    >
                      <Checkbox
                        id={`mobile-team-${team}`}
                        checked={filters.teams.includes(team)}
                        onCheckedChange={(checked) => handleTeamFilter(team, checked as boolean)}
                      />
                      <label htmlFor={`mobile-team-${team}`} className="text-base text-muted-foreground cursor-pointer">
                        {team}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-foreground">Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 transition-colors hover:bg-accent rounded-md p-2 -m-2">
                    <Checkbox
                      id="mobile-status-active"
                      checked={filters.status.includes('active')}
                      onCheckedChange={(checked) => handleStatusFilter('active', checked as boolean)}
                    />
                    <label htmlFor="mobile-status-active" className="text-base text-muted-foreground cursor-pointer">
                      Active
                    </label>
                  </div>
                  <div className="flex items-center space-x-3 transition-colors hover:bg-accent rounded-md p-2 -m-2">
                    <Checkbox
                      id="mobile-status-inactive"
                      checked={filters.status.includes('inactive')}
                      onCheckedChange={(checked) => handleStatusFilter('inactive', checked as boolean)}
                    />
                    <label htmlFor="mobile-status-inactive" className="text-base text-muted-foreground cursor-pointer">
                      Inactive
                    </label>
                  </div>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-foreground">Date Added</h3>
                <div className="space-y-3">
                  {[
                    { value: 'all', label: 'All time' },
                    { value: 'recent', label: 'Last 30 days' },
                    { value: 'older', label: 'Older than 30 days' }
                  ].map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-3 transition-colors hover:bg-accent rounded-md p-2 -m-2"
                    >
                      <input
                        type="radio"
                        id={`mobile-date-${option.value}`}
                        name="mobileDateRange"
                        value={option.value}
                        checked={filters.dateRange === option.value}
                        onChange={(e) => handleDateRangeFilter(e.target.value)}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <label htmlFor={`mobile-date-${option.value}`} className="text-base text-muted-foreground cursor-pointer">
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </BottomSheet>
      </div>

      <AddMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onUserInvited={handleUserInvited}
        currentSeats={currentSeats}
        seatLimit={actualSeats}
        availableSeats={availableSeats}
        isAtSeatLimit={isAtSeatLimit}
      />

      <EditMemberDialog
        open={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        member={selectedMember}
        permissionGroups={teams}
        onUpdateMember={handleUpdateMember}
        currentUserId={user?.id || ''}
      />
    </>
  );
};

export default Users;
