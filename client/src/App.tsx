import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { StrictMode } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import AuthOnlyRoute from './components/AuthOnlyRoute';
import CalendarIntegration from './components/dashboard/CalendarIntegration';
import MeetingTypeManager from './components/dashboard/MeetingTypeManager';
import OrganizationForm from './components/dashboard/OrganizationForm';
import RoleManagement from './components/dashboard/RoleManagement';
import WebhooksAndApiKeys from './components/dashboard/WebhooksAndApiKeys';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

import PermissionGroups from './components/dashboard/teams/TeamGroups';
import AcceptInvitation from './pages/AcceptInvitation';
import CreateOrganization from './pages/CreateOrganization';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import OAuthCallback from './pages/OAuthCallback';
import OAuthSuccess from './pages/OAuthSuccess';
import Onboarding from './pages/Onboarding';
import ResetPassword from './pages/ResetPassword';
import SharedMeeting from './pages/SharedMeeting';
import Signup from './pages/Signup';

import Account from './pages/dashboard/Account';
import Billing from './pages/dashboard/Billing';
import DashboardIndex from './pages/dashboard/Index';
import MeetingsPage from './pages/dashboard/MeetingsPage';
import Organization from './pages/dashboard/Organization';
import Reports from './pages/dashboard/Reports';
import Users from './pages/dashboard/Users';
import Profile from './pages/Profile';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: (attemptIndex: number): number => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  }
});

const App = (): JSX.Element => {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" forcedTheme="light">
          <BrowserRouter>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                {/* Public Routes */}
                <Route element={<PublicRoute />}>
                  <Route path='/login' element={<Login />} />
                  <Route path='/signup' element={<Signup />} />
                  <Route path='/reset-password' element={<ResetPassword />} />
                  <Route path='/shared/:meetingId' element={<SharedMeeting />} />
                  <Route path='/' element={<Login />} />
                </Route>

                {/* OAuth Callback Route - Public but can be accessed by popup */}
                <Route path='/calendar-oauth/callback' element={<OAuthCallback />} />
                <Route path='/calendar-oauth/success' element={<OAuthSuccess />} />

                {/* Accept Invitation Route - Requires authentication but not onboarding completion */}
                <Route element={<AuthOnlyRoute />}>
                  <Route path='/accept-invite/:invitationId' element={<AcceptInvitation />} />
                </Route>

                {/* Onboarding Route - Only requires authentication, not onboarding completion */}
                <Route element={<AuthOnlyRoute />}>
                  <Route path='/onboarding/*' element={<Onboarding />} />
                </Route>

                {/* Protected Routes - Requires both authentication and onboarding completion */}
                <Route element={<ProtectedRoute />}>
                  <Route path='/create-organization' element={<CreateOrganization />} />
                  <Route element={<Layout showSidebar={true}><Outlet /></Layout>}>
                    <Route path='/dashboard' element={<DashboardIndex />} />
                    <Route path='/dashboard/meetings-list' element={<MeetingsPage />} />
                    <Route path='/dashboard/sessions/:sessionId' element={<DashboardIndex />} />
                    <Route path='/dashboard/meetings/:meetingId' element={<DashboardIndex />} />
                    <Route path='/dashboard/sessions/:sessionId/meetings/:meetingId' element={<DashboardIndex />} />
                    <Route path='/reports' element={<Reports />} />

                    {/* Organization Routes */}
                    <Route path='/organization' element={<Organization />}>
                      <Route path='account' element={<Account />} />
                      <Route path='details' element={<OrganizationForm />} />
                      <Route path='roles' element={<RoleManagement />} />
                      <Route path='teams' element={<PermissionGroups />} />
                      <Route path='users' element={<Users />} />
                      <Route path='billing' element={<Billing />} />
                      <Route path='calendar' element={<CalendarIntegration />} />
                      <Route path='meeting-types' element={<MeetingTypeManager />} />
                      <Route path='advanced' element={<WebhooksAndApiKeys />} />
                      {/* <Route path='report-types' element={<ReportTypeManager />} /> */}
                    </Route>
                    {/* Profile Route */}
                    <Route path='/profile' element={<Profile />} />
                  </Route>
                </Route>

                {/* 404 Route */}
                <Route path='*' element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
        </ThemeProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
    </StrictMode>
  );
};

export default App;
