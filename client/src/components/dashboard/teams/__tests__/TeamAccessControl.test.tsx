import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TeamAccessControl from '../TeamAccessControl';

// Mock the API hooks
vi.mock('@/api/generated/knowtedAPI', () => ({
  useMeetingTypesControllerFindAll: vi.fn(() => ({
    data: [
      { id: '1', name: 'Team Meeting' },
      { id: '2', name: 'Client Call' }
    ],
    isLoading: false
  })),
  usePermissionsControllerGetTeamPermissions: vi.fn(() => ({
    data: [],
    isLoading: false,
    refetch: vi.fn()
  })),
  usePermissionsControllerBulkSetTeamPermissions: vi.fn(() => ({
    mutate: vi.fn()
  }))
}));

// Mock the auth context
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    organization: { id: 'org-1' }
  }))
}));

// Mock the toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('TeamAccessControl', () => {
  it('renders meeting types access section', () => {
    render(
      <TestWrapper>
        <TeamAccessControl teamId="team-1" />
      </TestWrapper>
    );

    expect(screen.getByText('Meeting Types Access')).toBeInTheDocument();
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.getByText('Client Call')).toBeInTheDocument();
  });

  it('renders page access section', () => {
    render(
      <TestWrapper>
        <TeamAccessControl teamId="team-1" />
      </TestWrapper>
    );

    expect(screen.getByText('Page Access')).toBeInTheDocument();
    expect(screen.getByText('Organization Details')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('shows save button when showSaveButton is true', () => {
    render(
      <TestWrapper>
        <TeamAccessControl teamId="team-1" showSaveButton={true} />
      </TestWrapper>
    );

    expect(screen.getByText('Update Access Control')).toBeInTheDocument();
  });

  it('hides save button when showSaveButton is false', () => {
    render(
      <TestWrapper>
        <TeamAccessControl teamId="team-1" showSaveButton={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('Update Access Control')).not.toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(
      <TestWrapper>
        <TeamAccessControl teamId="team-1" compact={true} />
      </TestWrapper>
    );

    // In compact mode, the legend should not be visible
    expect(screen.queryByText('Read access allows viewing')).not.toBeInTheDocument();
    expect(screen.queryByText('Write access allows editing')).not.toBeInTheDocument();
  });
});
