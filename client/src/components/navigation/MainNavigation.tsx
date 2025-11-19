import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { LayoutDashboard } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface MainNavigationProps {
  currentPath: string;
}

const menuItems = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard
  }
  // {
  //   title: 'Reports',
  //   path: '/reports',
  //   icon: FileText
  // }
];

const MainNavigation = ({ currentPath }: MainNavigationProps): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { closeMobileSidebar } = useSidebar();

  const isActive = (path: string): boolean => currentPath === path;

  const handleNavigation = (path: string): void => {
    // Close mobile sidebar when navigating
    closeMobileSidebar();

    if (path === '/dashboard') {
      // Check if we're currently viewing a meeting and preserve that context
      const currentMeetingId = (/\/meetings\/([^\/]+)/.exec(location.pathname))?.[1];

      if (currentMeetingId) {
        // Preserve the meeting context when navigating to dashboard
        navigate(`/dashboard/meetings/${currentMeetingId}`);
      } else {
        // No meeting context, navigate normally to dashboard
        navigate('/dashboard');
      }
    } else {
      // For other paths, navigate normally
      navigate(path);
    }
  };

  return (
    <SidebarMenu>
      {menuItems.map((item) => (
        <SidebarMenuItem key={item.path} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <SidebarMenuButton
            asChild
            isActive={isActive(item.path)}
            tooltip={item.title}
            className="text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-sidebar-foreground font-medium group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:flex"
          >
            <button
              onClick={() => handleNavigation(item.path)}
              className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:w-full"
            >
              <item.icon className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
            </button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
};

export default MainNavigation;
