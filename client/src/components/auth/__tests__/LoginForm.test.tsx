import { AuthProvider } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../LoginForm';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      onAuthStateChange: vi.fn().mockImplementation((callback) => {
        return {
          data: {
            subscription: {
              id: 'test-subscription',
              unsubscribe: vi.fn(),
              callback: () => {}
            }
          }
        };
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null
      })
    }
  }
}));

// Mock toast
vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

// Wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>{children}</AuthProvider>
  </BrowserRouter>
);

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with email and password fields', () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const submitButton = screen.getByTestId('submit-button');
    
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required');
    expect(screen.getByTestId('password-error')).toHaveTextContent('Password is required');
  });

  it('shows validation error for invalid email', async () => {
    // Mock failed login with Supabase's actual error message
    const mockError = { 
      message: 'Invalid login credentials', 
      code: 'invalid-credentials', 
      status: 400, 
      __isAuthError: true, 
      name: 'AuthApiError' 
    } as unknown as AuthError;

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: mockError
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    // Fill in the form with invalid email
    fireEvent.change(emailInput, { target: { value: 'wefwef@awefaewf.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Submit the form and wait for state updates
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Check for login failure error
    const errorMessage = screen.getByTestId('email-error');
    expect(errorMessage).toHaveTextContent('Invalid login credentials');

    // Verify toast error was shown
    expect(toast.error).toHaveBeenCalledWith('Login failed: Invalid login credentials');

    // Verify the error message is associated with the email field
    const emailField = emailInput.closest('div');
    expect(emailField).toContainElement(errorMessage);
  });

  it('handles successful login', async () => {
    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      user_metadata: { name: 'Test User' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      role: 'authenticated'
    };

    const mockSession: Session = {
      user: mockUser,
      access_token: 'mock-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer'
    };

    // Mock successful login
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('handles login failure', async () => {
    // Mock failed login
    const mockError = { 
      message: 'Invalid credentials', 
      code: 'invalid-credentials', 
      status: 401, 
      __isAuthError: true, 
      name: 'AuthError' 
    } as unknown as AuthError;

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: mockError
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
      fireEvent.click(submitButton);
    });

    // Wait for the error message to appear under the email field
    await waitFor(() => {
      expect(screen.getByTestId('email-error')).toHaveTextContent('Invalid credentials');
    });

    // Verify the error message is associated with the email field
    const emailField = emailInput.closest('div');
    expect(emailField).toContainElement(screen.getByTestId('email-error'));
  });

  it('shows loading state during login attempt', async () => {
    // Mock delayed login response
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
    });

    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });
}); 