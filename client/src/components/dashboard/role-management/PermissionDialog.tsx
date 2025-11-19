
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Database } from '@/integrations/supabase/types';
import { RESOURCE_CONFIG } from '@/routes/resources';
import { Calendar, Copy, FileText, Settings, Shield } from 'lucide-react';
import { useState } from 'react';

type organizationMember = Database['public']['Tables']['organization_members']['Row'];
type MeetingType = Database['public']['Tables']['meeting_types']['Row'];
type ReportType = Database['public']['Tables']['report_types']['Row'];

interface PermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMember: organizationMember | null;
  meetingTypes: MeetingType[];
  reportTypes: ReportType[];
  pendingPermissions: Record<string, Record<string, boolean>>;
  isSaving: boolean;
  onSave: () => void;
  getPermissionValue: (memberId: string, resourceType: string, permission: string) => boolean;
  onPermissionChange: (memberId: string, resourceType: string, permission: string, value: boolean) => void;
  members: organizationMember[];
  onCopyPermissions: (sourceMemberId: string, targetMemberId: string) => void;
}

export const PermissionDialog = ({
  open,
  onOpenChange,
  selectedMember,
  meetingTypes,
  reportTypes,
  pendingPermissions,
  isSaving,
  onSave,
  getPermissionValue,
  onPermissionChange,
  members,
  onCopyPermissions,
}: PermissionDialogProps) => {
  const [sourceMemberId, setSourceMemberId] = useState<string>('');

  const handleCopyPermissions = () => {
    if (sourceMemberId && selectedMember) {
      onCopyPermissions(sourceMemberId, selectedMember.id);
      setSourceMemberId('');
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open && Object.keys(pendingPermissions).length > 0) {
          if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
            onOpenChange(false);
          }
        } else {
          onOpenChange(open);
        }
      }}
    >
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              Permissions for {selectedMember?.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Select
                value={sourceMemberId}
                onValueChange={setSourceMemberId}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Copy from member" />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter(m => m.id !== selectedMember?.id)
                    .map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPermissions}
                disabled={!sourceMemberId || !selectedMember}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Permissions
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-8 py-4">
              {/* General Resources */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  General Resources
                </h3>
                <div className="space-y-4">
                  {RESOURCE_CONFIG.map(resource => (
                    <Card key={resource.key} className="p-4 flex flex-col gap-3 border-muted hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {resource.icon}
                        </div>
                        <span className="font-medium text-base">{resource.label}</span>
                      </div>
                      <div className="flex gap-6 flex-wrap pl-12">
                        {['create', 'read', 'update', 'delete'].map(action => (
                          <div key={action} className="flex items-center gap-2">
                            <Label className="capitalize text-sm font-medium">{action}</Label>
                            <Switch
                              checked={selectedMember ? getPermissionValue(selectedMember.id, resource.key, `can_${action}`) : false}
                              onCheckedChange={checked =>
                                selectedMember && onPermissionChange(
                                  selectedMember.id,
                                  resource.key,
                                  `can_${action}`,
                                  checked
                                )
                              }
                              disabled={!selectedMember}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Meeting Types */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Meeting Types
                </h3>
                <div className="space-y-4">
                  {meetingTypes.map(type => (
                    <Card key={type.id} className="p-4 flex flex-col gap-3 border-muted hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium text-base">{type.meeting_type}</span>
                      </div>
                      <div className="flex gap-6 flex-wrap pl-12">
                        {['create', 'read', 'update', 'delete'].map(action => (
                          <div key={action} className="flex items-center gap-2">
                            <Label className="capitalize text-sm font-medium">{action}</Label>
                            <Switch
                              checked={selectedMember ? getPermissionValue(selectedMember.id, `meeting_type_${type.id}`, `can_${action}`) : false}
                              onCheckedChange={checked =>
                                selectedMember && onPermissionChange(
                                  selectedMember.id,
                                  `meeting_type_${type.id}`,
                                  `can_${action}`,
                                  checked
                                )
                              }
                              disabled={!selectedMember}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Report Types */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Report Types
                </h3>
                <div className="space-y-4">
                  {reportTypes.map(type => (
                    <Card key={type.id} className="p-4 flex flex-col gap-3 border-muted hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium text-base">{type.report_title}</span>
                      </div>
                      <div className="flex gap-6 flex-wrap pl-12">
                        {['create', 'read', 'update', 'delete'].map(action => (
                          <div key={action} className="flex items-center gap-2">
                            <Label className="capitalize text-sm font-medium">{action}</Label>
                            <Switch
                              checked={selectedMember ? getPermissionValue(selectedMember.id, `report_type_${type.id}`, `can_${action}`) : false}
                              onCheckedChange={checked =>
                                selectedMember && onPermissionChange(
                                  selectedMember.id,
                                  `report_type_${type.id}`,
                                  `can_${action}`,
                                  checked
                                )
                              }
                              disabled={!selectedMember}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={Object.keys(pendingPermissions).length === 0 || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 