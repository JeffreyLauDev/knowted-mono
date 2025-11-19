import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleManagementProvider, useRoleManagement } from '../RoleManagementContext';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock the auth context
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Test component that uses the context
const TestComponent = () => {
  const context = useRoleManagement();
  return (
    <div>
      <div data-testid="loading">{context.loading.toString()}</div>
      <div data-testid="user-team">{JSON.stringify(context.userTeam)}</div>
      <button onClick={() => context.createGroup('Test Group', 'Test Description')}>
        Create Group
      </button>
      <button onClick={() => context.deleteGroup('test-group-id')}>
        Delete Group
      </button>
      <button
        onClick={() =>
          context.updatePermission('test-group-id', 'teams', 'read', true)
        }
      >
        Update Permission
      </button>
    </div>
  );
};

describe('RoleManagementContext', () => {
  const mockorganization = {
    id: 'test-org-id',
    name: 'Test organization',
  };

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const mockTeam = {
    id: 'test-team-id',
    name: 'Test Team',
    description: 'Test Description',
    organization_id: 'test-org-id',
    monthly_report_enabled: true,
    organization_details_read: true,
    organization_details_write: true,
    teams_read: true,
    teams_write: true,
    permission_groups_read: true,
    permission_groups_write: true,
    meeting_types_read: true,
    meeting_types_write: true,
    report_types_read: true,
    report_types_write: true,

    calendar_read: true,
    calendar_write: true,
    billing_read: true,
    billing_write: true,
    integrations_read: true,
    integrations_write: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      organization: mockorganization,
      user: mockUser,
    });
  });



  it('should create a new group', async () => {
    const mockNewGroup = { ...mockTeam, id: 'new-group-id' };
    
    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockNewGroup, error: null }),
        }),
      }),
    });

    render(
      <RoleManagementProvider>
        <TestComponent />
      </RoleManagementProvider>
    );

    const createButton = screen.getByText('Create Group');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('teams');
    });
  });

  it('should delete a group', async () => {
    (supabase.from as any).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    render(
      <RoleManagementProvider>
        <TestComponent />
      </RoleManagementProvider>
    );

    const deleteButton = screen.getByText('Delete Group');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('teams');
    });
  });

  it('should update permissions', async () => {
    (supabase.from as any).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    render(
      <RoleManagementProvider>
        <TestComponent />
      </RoleManagementProvider>
    );

    const updateButton = screen.getByText('Update Permission');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('teams');
    });
  });

  it('should handle errors when fetching team', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('Test error') }),
        }),
      }),
    });

    render(
      <RoleManagementProvider>
        <TestComponent />
      </RoleManagementProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user-team')).toHaveTextContent('null');
    });
  });

  it('should handle errors when creating group', async () => {
    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('Test error') }),
        }),
      }),
    });

    render(
      <RoleManagementProvider>
        <TestComponent />
      </RoleManagementProvider>
    );

    const createButton = screen.getByText('Create Group');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('teams');
    });
  });
});
