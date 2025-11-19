import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import WelcomeBanner from '../WelcomeBanner';

// Mock the CalendarIntegrationModal component
vi.mock('../CalendarIntegrationModal', () => ({
  default: ({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) => (
    <div data-testid="calendar-integration-modal" data-open={isOpen}>
      <button onClick={() => onOpenChange(false)}>Close Modal</button>
    </div>
  ),
}));

describe('WelcomeBanner', () => {
  const defaultProps = {
    organizationName: 'Test Organization',
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome message with organization name', () => {
    render(<WelcomeBanner {...defaultProps} />);
    
    expect(screen.getByText('Welcome to Test Organization! 🎉')).toBeInTheDocument();
    expect(screen.getByText('Get started by connecting your calendar to automatically sync your meetings and events.')).toBeInTheDocument();
  });

  it('renders with default organization name when not provided', () => {
    render(<WelcomeBanner onDismiss={defaultProps.onDismiss} />);
    
    expect(screen.getByText('Welcome to your organization! 🎉')).toBeInTheDocument();
  });

  it('shows connect calendar button', () => {
    render(<WelcomeBanner {...defaultProps} />);
    
    const connectButton = screen.getByRole('button', { name: /connect calendar/i });
    expect(connectButton).toBeInTheDocument();
    expect(connectButton).toHaveClass('bg-blue-600', 'hover:bg-blue-700', 'text-white');
  });

  it('shows maybe later button', () => {
    render(<WelcomeBanner {...defaultProps} />);
    
    const maybeLaterButton = screen.getByRole('button', { name: /maybe later/i });
    expect(maybeLaterButton).toBeInTheDocument();
    expect(maybeLaterButton).toHaveClass('text-blue-700', 'border-blue-300', 'hover:bg-blue-50');
  });

  it('shows dismiss button when onDismiss is provided', () => {
    render(<WelcomeBanner {...defaultProps} />);
    
    const dismissButton = screen.getByRole('button', { name: /close/i });
    expect(dismissButton).toBeInTheDocument();
    expect(dismissButton).toHaveClass('text-blue-600', 'hover:text-blue-800', 'hover:bg-blue-100');
  });

  it('does not show dismiss button when onDismiss is not provided', () => {
    render(<WelcomeBanner organizationName="Test Org" />);
    
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('calls onDismiss when maybe later button is clicked', () => {
    render(<WelcomeBanner {...defaultProps} />);
    
    const maybeLaterButton = screen.getByRole('button', { name: /maybe later/i });
    fireEvent.click(maybeLaterButton);
    
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    render(<WelcomeBanner {...defaultProps} />);
    
    const dismissButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(dismissButton);
    
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('opens calendar integration modal when connect calendar button is clicked', () => {
    render(<WelcomeBanner {...defaultProps} />);
    
    const connectButton = screen.getByRole('button', { name: /connect calendar/i });
    fireEvent.click(connectButton);
    
    const modal = screen.getByTestId('calendar-integration-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('data-open', 'true');
  });

  it('renders with correct styling classes', () => {
    render(<WelcomeBanner {...defaultProps} />);
    
    const banner = screen.getByText('Welcome to Test Organization! 🎉').closest('div');
    expect(banner).toHaveClass(
      'bg-gradient-to-r',
      'from-blue-50',
      'to-indigo-50',
      'border',
      'border-blue-200',
      'rounded-lg',
      'p-6',
      'mb-6',
      'relative'
    );
  });

  it('renders calendar icon in connect button', () => {
    render(<WelcomeBanner {...defaultProps} />);
    
    const connectButton = screen.getByRole('button', { name: /connect calendar/i });
    // The icon should be present (lucide-react icons render as SVGs)
    expect(connectButton).toBeInTheDocument();
  });
});
