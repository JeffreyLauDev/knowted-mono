
import type { OrganizationInfoDto } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { Check, ChevronDown, PanelLeft, Plus } from 'lucide-react';
import React from 'react';

interface OrganizationSwitcherProps {
  currentOrg: OrganizationInfoDto | null;
  allOrgs: OrganizationInfoDto[];
  onSwitch: (orgId: string) => Promise<void>;
  onCreateNew: () => void;
}

const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  currentOrg,
  allOrgs,
  onSwitch,
  onCreateNew
}) => {
  const { toggleSidebar, state, closeMobileSidebar } = useSidebar();

  if (!currentOrg) {return null;}

  const handleCollapsedClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    toggleSidebar();
  };

  const handleSwitchOrg = (orgId: string): void => {
    // Close mobile sidebar when switching organizations
    closeMobileSidebar();
    onSwitch(orgId);
  };

  const handleCreateNew = (): void => {
    // Close mobile sidebar when creating new organization
    closeMobileSidebar();
    onCreateNew();
  };

  // In collapsed mode, render a simple button instead of dropdown
  if (state === 'collapsed') {
    return (
      <Button
        className="flex items-center justify-center w-full px-0 py-2 h-auto font-medium text-white hover:bg-white/10 border-0 shadow-none text-lg"
        onClick={handleCollapsedClick}
      >
        <div className="relative h-7 w-7 flex items-center justify-center">
          <img
            src="/logos/Knowted Logo - Stacked (White)@1.5x@1.5x.png"
            alt="Knowted Logo"
            className="h-7 w-7 object-contain flex-shrink-0 group-hover:opacity-0 transition-opacity duration-200"
          />
          <PanelLeft className="h-5 w-5 absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
      </Button>
    );
  }

  // In expanded mode, render the full dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="flex truncate items-center justify-between w-full px-0 py-2 h-auto font-medium text-white hover:bg-white/10 border-0 shadow-none text-lg dark:bg-transparent"
        >
          <div className="flex items-center gap-2 truncate">
            <img
              src="/logos/Knowted Logo - Stacked (White)@1.5x@1.5x.png"
              alt="Knowted Logo"
              className="h-7 w-7 object-contain flex-shrink-0"
            />
            <span className="truncate">{currentOrg.name}</span>
          </div>
          <ChevronDown className="h-5 w-5 text-white/70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60 mt-1 border border-border shadow-xl bg-background">
        <DropdownMenuLabel className="text-sm font-medium text-foreground px-4 py-3">Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        {allOrgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            className="flex items-center justify-between cursor-pointer px-4 py-3 hover:bg-accent focus:bg-accent"
            onClick={() => handleSwitchOrg(org.id)}
          >
            <span className="truncate text-foreground font-medium">{org.name}</span>
            {org.id === currentOrg.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          className="flex items-center gap-3 cursor-pointer px-4 py-3 hover:bg-accent focus:bg-accent"
          onClick={handleCreateNew}
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground font-medium">Create New Organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default OrganizationSwitcher;
