import { aiConversationSessionsControllerFindAll, aiConversationSessionsControllerUpdate, usePaymentControllerGetCurrentPlan } from '@/api/generated/knowtedAPI';
import type { CurrentPlanDto } from '@/api/generated/models';
import ChatHistoryNav from '@/components/dashboard/chat/ChatHistoryNav';
import { UsageIndicator } from '@/components/dashboard/UsageIndicator';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarTrigger
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import OrganizationSwitcher from '../OrganizationSwitcher';
import MainNavigation from './MainNavigation';
import UserDropdownMenu from './UserDropdownMenu';

interface ChatSessionResponse {
  id: string;
  title: string;
  created_at: string;
}

interface AIChatSession {
  id: string;
  title: string;
  date: Date;
}

interface SidebarWrapperProps {
  onSelectSession: (id: string) => void;
  initialSessionId?: string;
}

const SidebarWrapper = ({ onSelectSession, initialSessionId }: SidebarWrapperProps) => {
  const { user, logout, organization, organizations, switchOrganization } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams();

  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Get current plan data for usage limits
  const { data: currentPlan } = usePaymentControllerGetCurrentPlan<CurrentPlanDto>(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id,
        refetchInterval: 30000 // Refetch every 30 seconds
      }
    }
  );

  useEffect(() => {
    if (!user || !organization) {return;}

    const loadSessions = async () => {
      try {
        const response = await aiConversationSessionsControllerFindAll({
          organization_id: organization.id
        });

        const sessions = (response as any).data || response || [];
        const fetchedSessions = (sessions as any[]).map((s: any) => ({
          id: s.id,
          title: s.title || 'New Chat',
          date: s.created_at ? new Date(s.created_at) : new Date()
        }));
        setSessions(fetchedSessions);
        if (!activeSessionId && fetchedSessions.length > 0) {
          setActiveSessionId(fetchedSessions[0].id);
        }
      } catch (error) {
        console.error('Failed to load chat sessions:', error);
        toast.error('Failed to load chat sessions');
      }
    };

    loadSessions();
  }, [user, organization, activeSessionId]);

  const handleCreateSession = () => {
    // Navigate to dashboard page without creating a session
    navigate('/dashboard');
  };

  // Wrapper function that matches the expected signature for ChatHistoryNav
  const handleNewSession = () => {
    handleCreateSession();
  };

  const handleUpdateSessionTitle = async (sessionId: string, newTitle: string): Promise<boolean> => {
    if (!organization) {return false;}
    try {
      await aiConversationSessionsControllerUpdate(
        sessionId,
        { title: newTitle },
        { organization_id: organization.id }
      );

      // Refresh sessions list
      const response = await aiConversationSessionsControllerFindAll({
        organization_id: organization.id
      });
      const sessions = (response as any).data || response || [];
      const updatedSessions = (sessions as any[]).map((s: any) => ({
        id: s.id,
        title: s.title || 'New Chat',
        date: s.created_at ? new Date(s.created_at) : new Date()
      }));
      setSessions(updatedSessions);
      return true;
    } catch (error) {
      console.error('Failed to update chat session:', error);
      toast.error('Failed to update chat session');
      return false;
    }
  };

  // Use the initial session ID if available, then our state's session, then fallback to first session
  const currentSessionId = initialSessionId || activeSessionId || sessions[0]?.id;

  // Create a handler that calls both the parent handler and our state's handler
  const handleSelectSession = (id: string) => {
    // Check if we're currently viewing a meeting and preserve that context
    const currentMeetingId = (/\/meetings\/([^\/]+)/.exec(location.pathname))?.[1];

    if (currentMeetingId) {
      // Preserve the meeting context when switching sessions
      navigate(`/dashboard/sessions/${id}/meetings/${currentMeetingId}`);
    } else {
      // No meeting context, just navigate to the session
      navigate(`/dashboard/sessions/${id}`);
    }

    if (onSelectSession) {
      onSelectSession(id);
    }
    setActiveSessionId(id);
  };

  return (
    <Sidebar className={cn('bg-sidebar text-sidebar-foreground group/sidebar')} collapsible="icon">
      <SidebarHeader className="p-4 sticky top-0 z-10 bg-sidebar/90 backdrop-blur group-data-[collapsible=icon]:p-2">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          {user && organization && (
            <OrganizationSwitcher
              currentOrg={organization}
              allOrgs={organizations}
              onSwitch={switchOrganization}
              onCreateNew={() => navigate('/create-organization')}
            />
          )}
          <SidebarTrigger className="opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 h-6 w-6 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-transparent">
        <div className="flex flex-col h-full">
          <MainNavigation currentPath={location.pathname} />
                    <div className="mt-6 px-2 group-data-[collapsible=icon]:hidden">
            <ChatHistoryNav
              sessions={sessions}
              activeSessionId={currentSessionId}
              onSelectSession={handleSelectSession}
              onNewSession={handleNewSession}
              onUpdateSessionTitle={handleUpdateSessionTitle}
            />
          </div>
        </div>
      </SidebarContent>

      {/* Usage Indicator - positioned above footer but outside content area */}
      <div className="px-4 py-2 border-sidebar-border bg-sidebar/90 backdrop-blur group-data-[collapsible=icon]:hidden">
        <UsageIndicator />

        {/* Show monthly limit exceeded message */}
        {currentPlan && currentPlan.canInviteKnowted === false && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <div className="flex items-center gap-1">
              <span>⚠️ Monthly limit reached</span>
            </div>
            <div className="mt-1 text-red-600">
              {currentPlan.currentUsage} of {currentPlan.monthlyLimit} minutes used
            </div>
          </div>
        )}
      </div>

      <SidebarFooter className="p-4 sticky bottom-0 z-10 mt-auto border-t border-sidebar-border bg-sidebar/90 backdrop-blur group-data-[collapsible=icon]:p-2">
        {user && <UserDropdownMenu email={user.email} onLogout={logout} />}
      </SidebarFooter>
    </Sidebar>
  );
};

export default SidebarWrapper;
