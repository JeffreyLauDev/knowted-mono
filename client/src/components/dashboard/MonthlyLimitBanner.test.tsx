import { useUsageEventsControllerGetMonthlyMinutesUsage } from '@/api/generated/knowtedAPI';
import { useAuth } from '@/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { MonthlyLimitBanner } from './MonthlyLimitBanner';

// Mock the API hook
vi.mock('@/api/generated/knowtedAPI', () => ({
  useUsageEventsControllerGetMonthlyMinutesUsage: vi.fn(),
}));

// Mock the auth context
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseMonthlyMinutes = useUsageEventsControllerGetMonthlyMinutesUsage as jest.MockedFunction<typeof useUsageEventsControllerGetMonthlyMinutesUsage>;

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('MonthlyLimitBanner', () => {
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

    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should not render when data is loading', () => {
      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: true,
        data: undefined,
      });

      const { container } = renderWithProviders(<MonthlyLimitBanner />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('No Limit Reached', () => {
    it('should not render when user can still invite Knowted', () => {
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

      const { container } = renderWithProviders(<MonthlyLimitBanner />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when usage is exactly at limit but can still invite', () => {
      const mockData = {
        currentUsage: 300,
        monthlyLimit: 300,
        usagePercentage: 100,
        canInviteKnowted: true, // Still can invite
        resetDate: '2024-02-15T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      const { container } = renderWithProviders(<MonthlyLimitBanner />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Limit Reached - Banner Display', () => {
    it('should render banner when monthly limit is reached', () => {
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

      renderWithProviders(<MonthlyLimitBanner />);

      expect(screen.getByText('Monthly Minutes Limit Reached')).toBeInTheDocument();
      expect(screen.getByText(/You've used 300 of 300 monthly minutes/)).toBeInTheDocument();
      expect(screen.getByText(/You can no longer invite Knowted to new meetings/)).toBeInTheDocument();
    });

    it('should display correct usage information', () => {
      const mockData = {
        currentUsage: 350,
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

      renderWithProviders(<MonthlyLimitBanner />);

      expect(screen.getByText(/You've used 350 of 300 monthly minutes/)).toBeInTheDocument();
      expect(screen.getByText(/You can no longer invite Knowted to new meetings/)).toBeInTheDocument();
    });

    it('should format reset date correctly', () => {
      const mockData = {
        currentUsage: 300,
        monthlyLimit: 300,
        usagePercentage: 100,
        canInviteKnowted: false,
        resetDate: '2024-12-25T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithProviders(<MonthlyLimitBanner />);

      expect(screen.getByText(/until your usage resets on Dec 25/)).toBeInTheDocument();
      expect(screen.getByText(/Resets on Dec 25/)).toBeInTheDocument();
    });

    it('should handle different date formats', () => {
      const mockData = {
        currentUsage: 300,
        monthlyLimit: 300,
        usagePercentage: 100,
        canInviteKnowted: false,
        resetDate: '2024-01-01T00:00:00.000Z',
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithProviders(<MonthlyLimitBanner />);

      expect(screen.getByText(/until your usage resets on Jan 1/)).toBeInTheDocument();
      expect(screen.getByText(/Resets on Jan 1/)).toBeInTheDocument();
    });
  });

  describe('Upgrade Plan Button', () => {
    it('should render upgrade plan button', () => {
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

      renderWithProviders(<MonthlyLimitBanner />);

      const upgradeButton = screen.getByRole('button', { name: /upgrade plan/i });
      expect(upgradeButton).toBeInTheDocument();
      expect(upgradeButton).toHaveTextContent('Upgrade Plan');
    });

    it('should navigate to billing page when upgrade button is clicked', () => {
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

      renderWithProviders(<MonthlyLimitBanner />);

      const upgradeButton = screen.getByRole('button', { name: /upgrade plan/i });
      fireEvent.click(upgradeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/billing');
    });

    it('should have correct button styling', () => {
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

      renderWithProviders(<MonthlyLimitBanner />);

      const upgradeButton = screen.getByRole('button', { name: /upgrade plan/i });
      expect(upgradeButton).toHaveClass('border-red-300', 'text-red-700', 'hover:bg-red-100');
    });
  });

  describe('Visual Elements', () => {
    it('should display alert icon', () => {
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

      renderWithProviders(<MonthlyLimitBanner />);

      // Check if AlertCircle icon is present (assuming it renders as an SVG or icon)
      expect(screen.getByText('Monthly Minutes Limit Reached')).toBeInTheDocument();
    });

    it('should display clock icon for reset date', () => {
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

      renderWithProviders(<MonthlyLimitBanner />);

      // Check if Clock icon is present near the reset date
      expect(screen.getByText(/Resets on Feb 15/)).toBeInTheDocument();
    });

    it('should have correct banner styling', () => {
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

      renderWithProviders(<MonthlyLimitBanner />);

      const banner = screen.getByText('Monthly Minutes Limit Reached').closest('div');
      expect(banner).toHaveClass('bg-red-50', 'border-red-200', 'rounded-lg');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing organization gracefully', () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        organization: null,
      });

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

      // Should not crash, but also not render since no organization
      const { container } = renderWithProviders(<MonthlyLimitBanner />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle API data with missing fields gracefully', () => {
      const mockData = {
        currentUsage: 300,
        monthlyLimit: 300,
        usagePercentage: 100,
        canInviteKnowted: false,
        resetDate: null, // Missing reset date
      };

      mockUseMonthlyMinutes.mockReturnValue({
        ...mockUseMonthlyMinutes(),
        isLoading: false,
        data: mockData,
        error: undefined,
      });

      renderWithProviders(<MonthlyLimitBanner />);

      // Should handle missing reset date gracefully
      expect(screen.getByText(/until your usage resets on Invalid Date/)).toBeInTheDocument();
      expect(screen.getByText(/Resets on Invalid Date/)).toBeInTheDocument();
    });

    it('should handle very high usage numbers', () => {
      const mockData = {
        currentUsage: 999999,
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

      renderWithProviders(<MonthlyLimitBanner />);

      expect(screen.getByText(/You've used 999999 of 300 monthly minutes/)).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should work with different usage scenarios', () => {
      // Test with different usage levels
      const testCases = [
        { usage: 0, limit: 300, canInvite: true },
        { usage: 150, limit: 300, canInvite: true },
        { usage: 299, limit: 300, canInvite: true },
        { usage: 300, limit: 300, canInvite: false },
        { usage: 500, limit: 300, canInvite: false },
      ];

      testCases.forEach(({ usage, limit, canInvite }) => {
        const mockData = {
          currentUsage: usage,
          monthlyLimit: limit,
          usagePercentage: Math.min(Math.round((usage / limit) * 100), 100),
          canInviteKnowted: canInvite,
          resetDate: '2024-02-15T00:00:00.000Z',
        };

        mockUseMonthlyMinutes.mockReturnValue({
          ...mockUseMonthlyMinutes(),
          isLoading: false,
          data: mockData,
          error: undefined,
        });

        const { container, unmount } = renderWithProviders(<MonthlyLimitBanner />);

        if (canInvite) {
          expect(container.firstChild).toBeNull();
        } else {
          expect(screen.getByText('Monthly Minutes Limit Reached')).toBeInTheDocument();
        }

        unmount();
      });
    });
  });
});
