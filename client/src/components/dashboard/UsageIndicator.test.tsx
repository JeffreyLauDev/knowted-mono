import { useUsageEventsControllerGetMonthlyMinutesUsage } from '@/api/generated/knowtedAPI';
import { useAuth } from '@/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { UsageIndicator } from './UsageIndicator';

// Mock the API hook
vi.mock('@/api/generated/knowtedAPI', () => ({
  useUsageEventsControllerGetMonthlyMinutesUsage: vi.fn(),
}));

// Mock the auth context
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock the Progress component
vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className, style }: any) => (
    <div 
      data-testid="progress-bar" 
      className={className}
      style={style}
      data-value={value}
    >
      Progress: {value}%
    </div>
  ),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseMonthlyMinutes = useUsageEventsControllerGetMonthlyMinutesUsage as jest.MockedFunction<typeof useUsageEventsControllerGetMonthlyMinutesUsage>;

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('UsageIndicator', () => {
  const mockOrganization = { id: 'org-123' };

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      organization: mockOrganization,
      user: { id: 'user-123', email: 'test@example.com' },
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      switchOrganization: vi.fn(),
      createOrganization: vi.fn(),
      organizations: [],
      loading: false,
      isAuthenticated: true,
      isReady: true,
      orgsLoading: false,
      accessToken: 'token-123',
      isOnboardingComplete: true,
      hasActiveSubscription: false,
      isSubscriptionLoading: false,
      currentPlan: null,
      isSubscriptionDataLoading: false,
    });

    mockUseMonthlyMinutes.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch: vi.fn(),
      isFetching: false,
      isError: false,
      isSuccess: false,
      status: 'loading',
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: false,
      isFetchedAfterMount: false,
      isInitialLoading: false,
      isPaused: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetching: false,
      isStale: false,
      remove: vi.fn(),
      fetchNextPage: vi.fn(),
      fetchPreviousPage: vi.fn(),
      hasNextPage: false,
      hasPreviousPage: false,
      isFetchingNextPage: false,
      isFetchingPreviousPage: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading skeleton when data is loading', () => {
      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: true,
        data: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.getByText('Monthly Minutes')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when API call fails', () => {
      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        error: new Error('API Error'),
        data: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      expect(screen.getByText('Failed to load usage data')).toBeInTheDocument();
      expect(screen.getByText('Monthly Minutes')).toBeInTheDocument();
    });
  });

  describe('Success State - Under Limit', () => {
    it('should display usage information correctly when under limit', () => {
      const mockData = {
        currentUsage: 150,
        monthlyLimit: 300,
        usagePercentage: 50,
        canInviteKnowted: true,
        resetDate: '2024-02-15T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      expect(screen.getByText('Monthly Minutes')).toBeInTheDocument();
      expect(screen.getByText('150 of 300 minutes used')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Resets on Feb 15')).toBeInTheDocument();
      expect(screen.queryByText('Monthly limit reached')).not.toBeInTheDocument();
      expect(screen.queryByText('Approaching monthly limit')).not.toBeInTheDocument();
    });

    it('should show green progress bar when usage is low', () => {
      const mockData = {
        currentUsage: 50,
        monthlyLimit: 300,
        usagePercentage: 17,
        canInviteKnowted: true,
        resetDate: '2024-02-15T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('data-value', '17');
      // Should have green color for low usage
      expect(progressBar.style.getPropertyValue('--progress-background')).toBe('#10b981');
    });
  });

  describe('Success State - Near Limit', () => {
    it('should show warning when approaching limit (80%+)', () => {
      const mockData = {
        currentUsage: 250,
        monthlyLimit: 300,
        usagePercentage: 83,
        canInviteKnowted: true,
        resetDate: '2024-02-15T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      expect(screen.getByText('250 of 300 minutes used')).toBeInTheDocument();
      expect(screen.getByText('83%')).toBeInTheDocument();
      expect(screen.getByText('Approaching monthly limit')).toBeInTheDocument();
      expect(screen.queryByText('Monthly limit reached')).not.toBeInTheDocument();
    });

    it('should show yellow progress bar when approaching limit', () => {
      const mockData = {
        currentUsage: 250,
        monthlyLimit: 300,
        usagePercentage: 83,
        canInviteKnowted: true,
        resetDate: '2024-02-15T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar.style.getPropertyValue('--progress-background')).toBe('#f59e0b');
    });
  });

  describe('Success State - At/Over Limit', () => {
    it('should show error message when limit is reached', () => {
      const mockData = {
        currentUsage: 300,
        monthlyLimit: 300,
        usagePercentage: 100,
        canInviteKnowted: false,
        resetDate: '2024-02-15T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      expect(screen.getByText('300 of 300 minutes used')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('Monthly limit reached. Upgrade to continue recording meetings.')).toBeInTheDocument();
      expect(screen.queryByText('Approaching monthly limit')).not.toBeInTheDocument();
    });

    it('should show red progress bar when limit is reached', () => {
      const mockData = {
        currentUsage: 300,
        monthlyLimit: 300,
        usagePercentage: 100,
        canInviteKnowted: false,
        resetDate: '2024-02-15T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar.style.getPropertyValue('--progress-background')).toBe('#ef4444');
    });

    it('should handle usage over limit correctly', () => {
      const mockData = {
        currentUsage: 350,
        monthlyLimit: 300,
        usagePercentage: 100, // Capped at 100%
        canInviteKnowted: false,
        resetDate: '2024-02-15T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      expect(screen.getByText('350 of 300 minutes used')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('Monthly limit reached. Upgrade to continue recording meetings.')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should format reset date correctly', () => {
      const mockData = {
        currentUsage: 150,
        monthlyLimit: 300,
        usagePercentage: 50,
        canInviteKnowted: true,
        resetDate: '2024-12-25T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      expect(screen.getByText('Resets on Dec 25')).toBeInTheDocument();
    });

    it('should handle different date formats', () => {
      const mockData = {
        currentUsage: 150,
        monthlyLimit: 300,
        usagePercentage: 50,
        canInviteKnowted: true,
        resetDate: '2024-01-01T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      expect(screen.getByText('Resets on Jan 1')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero usage correctly', () => {
      const mockData = {
        currentUsage: 0,
        monthlyLimit: 300,
        usagePercentage: 0,
        canInviteKnowted: true,
        resetDate: '2024-02-15T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      expect(screen.getByText('0 of 300 minutes used')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('Monthly Minutes')).toBeInTheDocument();
    });

    it('should handle missing organization gracefully', () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        organization: null,
      });

      renderWithQueryClient(<UsageIndicator />);

      // Should still render without crashing
      expect(screen.getByText('Monthly Minutes')).toBeInTheDocument();
    });

    it('should handle API data with missing fields gracefully', () => {
      const mockData = {
        currentUsage: 150,
        monthlyLimit: 300,
        usagePercentage: 50,
        canInviteKnowted: true,
        resetDate: null, // Missing reset date
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      expect(screen.getByText('150 of 300 minutes used')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      // Should handle missing reset date gracefully
      expect(screen.getByText('Resets on Invalid Date')).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('should apply custom className when provided', () => {
      const mockData = {
        currentUsage: 150,
        monthlyLimit: 300,
        usagePercentage: 50,
        canInviteKnowted: true,
        resetDate: '2024-02-15T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator className="custom-class" />);

      const container = screen.getByText('Monthly Minutes').closest('div');
      expect(container).toHaveClass('custom-class');
    });

    it('should render without className when not provided', () => {
      const mockData = {
        currentUsage: 150,
        monthlyLimit: 300,
        usagePercentage: 50,
        canInviteKnowted: true,
        resetDate: '2024-02-15T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithQueryClient(<UsageIndicator />);

      const container = screen.getByText('Monthly Minutes').closest('div');
      expect(container).toHaveClass('px-4 bg-white/10 rounded-lg border border-white/20');
    });
  });
});
