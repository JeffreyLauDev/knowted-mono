import { Database } from '../../../integrations/supabase/types';

export type MeetingType = Database['public']['Tables']['meeting_types']['Row'];
export type ReportType = Database['public']['Tables']['report_types']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type MeetingTypePermission = Database['public']['Tables']['meeting_type_permissions']['Row'];
export type ReportTypePermission = Database['public']['Tables']['report_type_permissions']['Row'];

export type PermissionGroup = Database['public']['Tables']['permission_groups']['Row'] & {
  permissions: string[];
  name?: string;
  description?: string | null;
  organization_id?: string;
};

export type GroupPermission = {
  id: string;
  permission_group_id: string;
  meeting_type_id?: string;
  report_type_id?: string;
  can_read: boolean;
  can_write: boolean;
  created_at: string;
  updated_at: string;
};

export interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, permissions: Record<string, boolean>) => void;
  meetingTypePermissions: MeetingTypePermission[];
  reportTypePermissions: ReportTypePermission[];
  onGroupCreated: () => void;
  group?: PermissionGroup | null;
  groupPermissions?: (MeetingTypePermission | ReportTypePermission)[];
  existingGroups?: PermissionGroup[];
} 