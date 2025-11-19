import { SidebarProvider } from '@/components/ui/sidebar';
import { AuthProvider } from '@/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import UserDropdownMenu from './UserDropdownMenu';

// Mock the API hooks
vi.mock('@/api/generated/knowtedAPI', () => ({
  useMeetingTypesControllerFindAll: vi.fn()
}));

const mockUseMeetingTypesControllerFindAll = vi.mocked(
  require('@/api/generated/knowtedAPI').useMeetingTypesControllerFindAll
);

// Mock the auth context
const mockUseAuth = vi.fn();

vi.mock('@/context/AuthContext', async () => {
  const actual = await vi.importActual('@/context/AuthContext');
  return {
    ...actual,
    useAuth: () => mockUseAuth()
  };
});

// Mock the sidebar context
const mockUseSidebar = vi.fn();

vi.mock('@/components/ui/sidebar', async () => {
  const actual = await vi.importActual('@/components/ui/sidebar');
  return {
    ...actual,
    useSidebar: () => mockUseSidebar()
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SidebarProvider>
          <AuthProvider>
            {component}
          </AuthProvider>
        </SidebarProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('UserDropdownMenu', () => {
  const defaultProps = {
    email: 'test@example.com',
    onLogout: vi.fn()
  };

  const mockOrganization = { id: 'org-123' };
  const mockMeetingTypes = [
    { id: 'mt-1', name: 'Meeting Type 1' },
    { id: 'mt-2', name: 'Meeting Type 2' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseSidebar.mockReturnValue({
      state: 'expanded'
    });

    mockUseAuth.mockReturnValue({
      organization: mockOrganization,
      currentPlan: null
    });

    mockUseMeetingTypesControllerFindAll.mockReturnValue({
      data: mockMeetingTypes,
      isLoading: false,
      error: null
    });
  });

  it('should render the add to live meeting button when meeting types are available', () => {
    renderWithProviders(<UserDropdownMenu {...defaultProps} />);
    
    expect(screen.getByText('Add to live meeting')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to live meeting/i })).not.toBeDisabled();
  });

  it('should disable the button when monthly limit is exceeded', () => {
    mockUseAuth.mockReturnValue({
      organization: mockOrganization,
      currentPlan: {
        canInviteKnowted: false,
        currentUsage: 1500,
        monthlyLimit: 1500
      }
    });

    renderWithProviders(<UserDropdownMenu {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /add to live meeting/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Monthly limit exceeded. Please upgrade your plan to continue.');
  });

  it('should show monthly limit exceeded message when limit is reached', () => {
    mockUseAuth.mockReturnValue({
      organization: mockOrganization,
      currentPlan: {
        canInviteKnowted: false,
        currentUsage: 1500,
        monthlyLimit: 1500
      }
    });

    renderWithProviders(<UserDropdownMenu {...defaultProps} />);
    
    expect(screen.getByText('⚠️ Monthly limit reached')).toBeInTheDocument();
    expect(screen.getByText('1500 of 1500 minutes used')).toBeInTheDocument();
  });

  it('should not show monthly limit message when limit is not exceeded', () => {
    mockUseAuth.mockReturnValue({
      organization: mockOrganization,
      currentPlan: {
        canInviteKnowted: true,
        currentUsage: 500,
        monthlyLimit: 1500
      }
    });

    renderWithProviders(<UserDropdownMenu {...defaultProps} />);
    
    expect(screen.queryByText('⚠️ Monthly limit reached')).not.toBeInTheDocument();
    expect(screen.queryByText(/minutes used/)).not.toBeInTheDocument();
  });

  it('should disable button when loading meeting types', () => {
    mockUseMeetingTypesControllerFindAll.mockReturnValue({
      data: [],
      isLoading: true,
      error: null
    });

    renderWithProviders(<UserDropdownMenu {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toBeDisabled();
  });

  it('should disable button when no meeting types available', () => {
    mockUseMeetingTypesControllerFindAll.mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    });

    renderWithProviders(<UserDropdownMenu {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /no meeting types/i });
    expect(button).toBeDisabled();
  });
});
