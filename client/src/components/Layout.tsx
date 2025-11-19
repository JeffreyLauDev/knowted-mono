import GlobalInvitationNotification from '@/components/invitations/GlobalInvitationNotification';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { MobileHeaderProvider } from '@/context/MobileHeaderContext';
import React from 'react';
import Header from './navigation/Header';
import MobileBottomNav from './navigation/MobileBottomNav';
import SidebarWrapper from './navigation/SidebarWrapper';

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

const Layout = ({ children, showSidebar = false }: LayoutProps): JSX.Element => {
  const { user } = useAuth();

  const handleSelectSession = (): void => {
    // This is handled by the SidebarWrapper internally
  };

  return (
    <MobileHeaderProvider>
      <SidebarProvider>
        {showSidebar && user ? (
          <>
            <SidebarWrapper onSelectSession={handleSelectSession} />
            <SidebarInset className="">
              <Header />
              <main className="flex-1 sm:pt-0 pt-16 pb-16 max-h-screen overflow-y-auto bg:white dark:bg-background">
                {children}
              </main>
              <MobileBottomNav />
              <GlobalInvitationNotification />
            </SidebarInset>
          </>
        ) : (
          <div className="w-full">
            <div className="flex flex-col">
              <Header />
              <main className="flex-1 pt-16 pb-16 bg-white dark:bg-background">
                {children}
              </main>
            </div>
            <MobileBottomNav />
            <GlobalInvitationNotification />
          </div>
        )}
      </SidebarProvider>
    </MobileHeaderProvider>
  );
};

export default Layout;
