import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicRoutes from '../PublicRoutes';

// Mock the AuthRoute component
vi.mock('@/components/AuthRoute', () => ({
  default: () => <div data-testid="auth-route">Auth Route</div>
}));

// Mock the Login component
vi.mock('@/pages/Login', () => ({
  default: () => <div data-testid="login-page">Login Page</div>
}));

// Mock the SharedMeeting component
vi.mock('@/pages/SharedMeeting', () => ({
  default: () => <div data-testid="shared-meeting-page">Shared Meeting Page</div>
}));

describe('PublicRoutes', () => {
  const renderRoutes = (initialPath: string) => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          {PublicRoutes()}
        </Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route rendering', () => {
    it('should render auth route at root path', () => {
      renderRoutes('/');
      expect(screen.getByTestId('auth-route')).toBeDefined();
    });

    it('should render login page at /login', () => {
      renderRoutes('/login');
      expect(screen.getByTestId('login-page')).toBeDefined();
    });

    it('should render shared meeting page at /shared/:meetingId', () => {
      renderRoutes('/shared/123');
      expect(screen.getByTestId('shared-meeting-page')).toBeDefined();
    });

    it('should render shared meeting page with different meeting IDs', () => {
      renderRoutes('/shared/abc-xyz');
      expect(screen.getByTestId('shared-meeting-page')).toBeDefined();
    });
  });

  describe('Route accessibility', () => {
    it('should render auth route even when not authenticated', () => {
      renderRoutes('/');
      expect(screen.getByTestId('auth-route')).toBeDefined();
    });

    it('should render login page even when not authenticated', () => {
      renderRoutes('/login');
      expect(screen.getByTestId('login-page')).toBeDefined();
    });

    it('should render shared meeting page even when not authenticated', () => {
      renderRoutes('/shared/123');
      expect(screen.getByTestId('shared-meeting-page')).toBeDefined();
    });
  });

});
