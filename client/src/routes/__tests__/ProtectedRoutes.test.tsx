import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProtectedRoutes from '../ProtectedRoutes';

// Mock the RoleManagementContext
vi.mock('@/routes/RoleManagementContext', () => ({
  useRoleManagement: () => ({
    userTeam: {
      organization_details_read: true,
      teams_read: false,
      report_types_read: true,
      meeting_types_read: false,

      calendar_read: false,
      permission_groups_read: false
    }
  })
}));

// Mock the route elements
vi.mock('../RouteElements', () => ({
  routeElements: {
    dashboard: <div data-testid="dashboard-page">Dashboard</div>,
    reports: <div data-testid="reports-page">Reports</div>,
    organization: (
      <div data-testid="organization-page">
        organization
        <Outlet />
      </div>
    ),
    organizationDetails: <div data-testid="organization-details-page">organization Details</div>,
    organizationTeams: <div data-testid="teams-page">Teams</div>,
    organizationReportTypes: <div data-testid="report-types-page">Report Types</div>,
    notFound: <div data-testid="not-found-page">Not Found</div>
  }
}));

describe('ProtectedRoutes', () => {
  const renderRoutes = (initialPath: string) => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          {ProtectedRoutes()}
        </Routes>
      </MemoryRouter>
    );
  };

  it('should render dashboard route', () => {
    renderRoutes('/dashboard');
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });

  it('should render reports route', () => {
    renderRoutes('/dashboard/reports');
    expect(screen.getByTestId('reports-page')).toBeInTheDocument();
  });

  it('should render organization layout with nested routes', () => {
        renderRoutes('/organization/details');
            const orgPage = screen.getByTestId('organization-page');
        expect(orgPage).toBeInTheDocument();
        const detailsPage = screen.getByTestId('organization-details-page');
        expect(detailsPage).toBeInTheDocument();
  });

  it('should redirect to dashboard when accessing teams without permission', () => {
    renderRoutes('/organization/teams');
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.queryByTestId('teams-page')).not.toBeInTheDocument();
  });

  it('should render report types page under organization', () => {
    renderRoutes('/organization/report-types');
    expect(screen.getByTestId('organization-page')).toBeInTheDocument();
    expect(screen.getByTestId('report-types-page')).toBeInTheDocument();
  });

  it('should render not found page for unknown routes', () => {
    renderRoutes('/unknown-route');
    expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
  });

  // New test cases for permission-based access control
  describe('Permission-based access control', () => {
    it('should allow access to organization details when user has permission', () => {
      renderRoutes('/organization/details');
      expect(screen.getByTestId('organization-page')).toBeInTheDocument();
      expect(screen.getByTestId('organization-details-page')).toBeInTheDocument();
    });

    it('should redirect to dashboard when user tries to access teams without permission', () => {
      renderRoutes('/organization/teams');
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('teams-page')).not.toBeInTheDocument();
    });

    it('should allow access to report types when user has permission', () => {
      renderRoutes('/organization/report-types');
      expect(screen.getByTestId('organization-page')).toBeInTheDocument();
      expect(screen.getByTestId('report-types-page')).toBeInTheDocument();
    });

    it('should redirect to dashboard when user tries to access meeting types without permission', () => {
      renderRoutes('/organization/meeting-types');
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('meeting-types-page')).not.toBeInTheDocument();
    });



    it('should redirect to dashboard when user tries to access calendar without permission', () => {
      renderRoutes('/organization/calendar');
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('calendar-page')).not.toBeInTheDocument();
    });
  });
}); 