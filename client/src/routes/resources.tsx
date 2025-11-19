import { Calendar, CreditCard, ListIcon, Settings, User, Users, Zap } from 'lucide-react';
import React from 'react';

export type ResourceType =
  | 'organization_details'
  | 'teams'
  | 'permission_groups'
  | 'meeting_types'
  | 'report_types'
  | 'calendar'
  | 'billing'
  | 'integrations'
  | 'users'
  | 'access_control'
  | 'account'
  | 'advanced';

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  label?: string;
  icon?: React.ReactNode;
  permission?: string;
  children?: RouteConfig[];
}

// Map route paths to their corresponding permission keys
export const pathToPermissionMap: Record<string, string> = {
  'account': 'can_read_organization_details', // Account is always accessible
  'details': 'can_read_organization_details',
  'teams': 'can_read_teams',
  'meeting-types': 'can_read_meeting_types',
  'report-types': 'can_read_report_types',
  'calendar': 'can_read_calendar',
  'permissions': 'can_read_permission_groups',
  'users': 'can_read_organization_details',
  'advanced': 'can_read_organization_details' // Advanced settings require org admin access
};

// Extract resource configurations for organization routes
export const RESOURCE_CONFIG = [
  {
    key: 'organization_details' as ResourceType,
    label: 'Organization Details',
    icon: <Settings className="h-5 w-5" />,
    path: 'details',
    id: 'details'
  },
  {
    key: 'teams' as ResourceType,
    label: 'Teams',
    icon: <Users className="h-5 w-5" />,
    path: 'teams',
    id: 'teams'
  },
  {
    key: 'users' as ResourceType,
    label: 'Users',
    icon: <Users className="h-5 w-5" />,
    path: 'users',
    id: 'users'
  },
  {
    key: 'billing' as ResourceType,
    label: 'Billing',
    icon: <CreditCard className="h-5 w-5" />,
    path: 'billing',
    id: 'billing'
  },
  {
    key: 'meeting_types' as ResourceType,
    label: 'Meeting Types',
    icon: <ListIcon className="h-5 w-5" />,
    path: 'meeting-types',
    id: 'meeting-types'
  },
  // {
  //   key: 'report_types' as ResourceType,
  //   label: 'Report Types',
  //   icon: <FileText className="h-5 w-5" />,
  //   path: 'report-types',
  //   id: 'report-types'
  // },
  {
    key: 'calendar' as ResourceType,
    label: 'Calendar Integration',
    icon: <Calendar className="h-5 w-5" />,
    path: 'calendar',
    id: 'calendar'
  },
  {
    key: 'account' as ResourceType,
    label: 'Account',
    icon: <User className="h-5 w-5" />,
    path: 'account',
    id: 'account'
  },
  {
    key: 'advanced' as ResourceType,
    label: 'Advanced',
    icon: <Zap className="h-5 w-5" />,
    path: 'advanced',
    id: 'advanced'
  }
];
