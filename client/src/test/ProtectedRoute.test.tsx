import ProtectedRoute from '@/components/ProtectedRoute';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the useAuth hook
const mockUseAuth = vi.fn();

// Mock the AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the InvitationProvider
vi.mock('@/components/invitations/InvitationProvider', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="invitation-provider">{children}</div>,
}));

// Mock Navigate component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to}>Navigate to {to}</div>,
    Outlet: () => <div data-testid="outlet">Outlet</div>,
    useLocation: () => ({ pathname: '/dashboard' }),
  };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should redirect to login after 5 seconds when user is not authenticated and stuck in loading', async () => {
    // Mock unauthenticated user stuck in loading state
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      organizations: [],
      isOnboardingComplete: false,
      isReady: false,
      orgsLoading: true,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute />
      </BrowserRouter>
    );

    // Initially should show loading spinner
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we load your account information...')).toBeInTheDocument();

    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);

    // Should now redirect to login
    await waitFor(() => {
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    });
  });

  it('should not redirect if user becomes authenticated before timeout', async () => {
    // Start with unauthenticated user
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      organizations: [],
      isOnboardingComplete: false,
      isReady: false,
      orgsLoading: true,
    });

    const { rerender } = render(
      <BrowserRouter>
        <ProtectedRoute />
      </BrowserRouter>
    );

    // Fast-forward 3 seconds (before timeout)
    vi.advanceTimersByTime(3000);

    // User becomes authenticated
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      organizations: [{ id: '1', name: 'Test Org' }],
      isOnboardingComplete: true,
      isReady: true,
      orgsLoading: false,
    });

    rerender(
      <BrowserRouter>
        <ProtectedRoute />
      </BrowserRouter>
    );

    // Fast-forward remaining 2 seconds (total 5 seconds)
    vi.advanceTimersByTime(2000);

    // Should not redirect, should show outlet instead
    await waitFor(() => {
      expect(screen.getByTestId('outlet')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });
  });

  it('should show outlet for authenticated user with organizations', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      organizations: [{ id: '1', name: 'Test Org' }],
      isOnboardingComplete: true,
      isReady: true,
      orgsLoading: false,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute />
      </BrowserRouter>
    );

    expect(screen.getByTestId('outlet')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });
});
