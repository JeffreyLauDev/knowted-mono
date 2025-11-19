import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Database } from '@/integrations/supabase/types';
import { useEffect, useState } from 'react';

type MeetingType = Database['public']['Tables']['meeting_types']['Row'];
type ReportType = Database['public']['Tables']['report_types']['Row'];

type CRUD = 'create' | 'read' | 'update' | 'delete';
type TypePermissions = Record<string, Record<CRUD, boolean>>;

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, permissions: Record<string, boolean>) => void;
  meetingTypes: MeetingType[];
  reportTypes: ReportType[];
  onGroupCreated: () => void;
}

export const CreateGroupDialog = ({
  open,
  onClose,
  onCreateGroup,
  meetingTypes,
  reportTypes,
  onGroupCreated,
}: CreateGroupDialogProps) => {
  const [groupName, setGroupName] = useState('');
  const [meetingTypePerms, setMeetingTypePerms] = useState<TypePermissions>({});
  const [reportTypePerms, setReportTypePerms] = useState<TypePermissions>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const mt: TypePermissions = {};
      meetingTypes.forEach(mtType => {
        mt[mtType.id] = { create: false, read: false, update: false, delete: false };
      });
      setMeetingTypePerms(mt);
      const rt: TypePermissions = {};
      reportTypes.forEach(rtType => {
        rt[rtType.id] = { create: false, read: false, update: false, delete: false };
      });
      setReportTypePerms(rt);
      setGroupName('');
    }
  }, [open, meetingTypes, reportTypes]);

  const handleCRUDChange = (type: 'meeting' | 'report', id: string, action: CRUD, checked: boolean) => {
    if (type === 'meeting') {
      setMeetingTypePerms(prev => ({
        ...prev,
        [id]: { ...prev[id], [action]: checked },
      }));
    } else {
      setReportTypePerms(prev => ({
        ...prev,
        [id]: { ...prev[id], [action]: checked },
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Combine all permissions
      const allPermissions: Record<string, boolean> = {};
      
      // Add meeting type permissions
      Object.entries(meetingTypePerms).forEach(([id, perms]) => {
        Object.entries(perms).forEach(([action, value]) => {
          allPermissions[`meeting_type_${id}:${action}`] = value;
        });
      });

      // Add report type permissions
      Object.entries(reportTypePerms).forEach(([id, perms]) => {
        Object.entries(perms).forEach(([action, value]) => {
          allPermissions[`report_type_${id}:${action}`] = value;
        });
      });

      await onCreateGroup(groupName, allPermissions);
      onGroupCreated();
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create Permission Group</DialogTitle>
          <DialogDescription>
            Create a new permission group and set its access rights.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Meeting Types Access</h4>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Meeting Type</TableHead>
                    <TableHead className="text-center">Create</TableHead>
                    <TableHead className="text-center">Read</TableHead>
                    <TableHead className="text-center">Update</TableHead>
                    <TableHead className="text-center">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetingTypes.map(mt => (
                    <TableRow key={mt.id}>
                      <TableCell className="font-medium">{mt.meeting_type}</TableCell>
                      {(['create', 'read', 'update', 'delete'] as CRUD[]).map(action => (
                        <TableCell key={action} className="text-center">
                          <Checkbox
                            checked={meetingTypePerms[mt.id]?.[action] || false}
                            onCheckedChange={checked => handleCRUDChange('meeting', mt.id, action, checked as boolean)}
                            className="mx-auto"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-lg">Report Types Access</h4>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Report Type</TableHead>
                    <TableHead className="text-center">Create</TableHead>
                    <TableHead className="text-center">Read</TableHead>
                    <TableHead className="text-center">Update</TableHead>
                    <TableHead className="text-center">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportTypes.map(rt => (
                    <TableRow key={rt.id}>
                      <TableCell className="font-medium">{rt.report_title}</TableCell>
                      {(['create', 'read', 'update', 'delete'] as CRUD[]).map(action => (
                        <TableCell key={action} className="text-center">
                          <Checkbox
                            checked={reportTypePerms[rt.id]?.[action] || false}
                            onCheckedChange={checked => handleCRUDChange('report', rt.id, action, checked as boolean)}
                            className="mx-auto"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create Group'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 