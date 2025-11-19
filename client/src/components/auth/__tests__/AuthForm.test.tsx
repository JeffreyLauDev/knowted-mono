import { AuthProvider } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from '../AuthForm';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
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
    error: vi.fn(),
    success: vi.fn(),
  },
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

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders login form by default', () => {
    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    );

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });

  it('switches to signup form when toggle is clicked', () => {
    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    );

    const signupLink = screen.getByText('Sign up');
    fireEvent.click(signupLink);

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('Join us and start your journey')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
  });

  it('shows signup fields when in signup mode', () => {
    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    );

    // Switch to signup mode
    fireEvent.click(screen.getByText('Sign up'));

    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Organization Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  it('validates required fields in signup mode', async () => {
    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    );

    // Switch to signup mode
    fireEvent.click(screen.getByText('Sign up'));

    // Try to submit without filling required fields
    const submitButton = screen.getByText('Create Account');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
      expect(screen.getByText('Organization name is required')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByText('Sign In');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });
  });

  it('validates password confirmation in signup mode', async () => {
    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    );

    // Switch to signup mode
    fireEvent.click(screen.getByText('Sign up'));

    // Fill required fields
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Organization Name'), { target: { value: 'Test Corp' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'different' } });

    const submitButton = screen.getByText('Create Account');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('handles successful login', async () => {
    const mockSession = {
      access_token: 'mock-token',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      }
    } as unknown as Session;

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: mockSession, user: mockSession.user },
      error: null
    });

    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByText('Sign In');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles successful signup', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: { name: 'John Doe' }
    } as unknown as User;

    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: mockUser, session: null },
      error: null
    });

    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    );

    // Switch to signup mode
    fireEvent.click(screen.getByText('Sign up'));

    // Fill all fields
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Organization Name'), { target: { value: 'Test Corp' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });

    const submitButton = screen.getByText('Create Account');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
            organization_name: 'Test Corp',
            name: 'John Doe'
          }
        }
      });
      expect(toast.success).toHaveBeenCalledWith('Account created successfully! Please check your email to verify your account.');
    });
  });

  it('handles login error', async () => {
    const mockError = new AuthError('Invalid credentials');
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: mockError
    });

    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByText('Sign In');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid credentials');
    });
  });
}); 