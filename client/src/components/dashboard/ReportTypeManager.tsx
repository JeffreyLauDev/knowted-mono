import {
    useReportTypesControllerCreate,
    useReportTypesControllerFindAll,
    useReportTypesControllerRemove,
    useReportTypesControllerUpdate,
} from '@/api/generated/knowtedAPI';
import type { ReportTypeResponseDto } from '@/api/generated/models/reportTypeResponseDto';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import { Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { ReportTypeDialog } from './ReportTypeDialog';

interface ReportTypeManagerProps {}

const ReportTypeManager: React.FC<ReportTypeManagerProps> = () => {
  const { user, organization } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReportType, setEditingReportType] = useState<ReportTypeResponseDto | undefined>();

  const { data: reportTypes, isLoading, refetch } = useReportTypesControllerFindAll<ReportTypeResponseDto[]>(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id,
      },
    }
  );

  const createMutation = useReportTypesControllerCreate();
  const updateMutation = useReportTypesControllerUpdate();
  const removeMutation = useReportTypesControllerRemove();

  const handleSave = async (reportType: Partial<ReportTypeResponseDto> & { meeting_types?: string[] }) => {
    if (!user?.id) {
      toast.error('User information is required');
      return;
    }

    try {
      if (editingReportType) {
        await updateMutation.mutateAsync({
          id: editingReportType.id,
          data: {
            report_title: reportType.report_title || '',
            report_prompt: reportType.report_prompt || '',
            report_schedule: reportType.report_schedule!,
            organization_id: organization?.id || '',
            user_id: user.id,
            active: reportType.active,
            generation_date: reportType.generation_date,
            run_at_utc: reportType.run_at_utc,
          },
          params: { organization_id: organization?.id || '' },
        });
        toast.success('Report type updated successfully');
      } else {
        await createMutation.mutateAsync({
          data: {
            report_title: reportType.report_title || '',
            report_prompt: reportType.report_prompt || '',
            report_schedule: reportType.report_schedule!,
            organization_id: organization?.id || '',
            user_id: user.id,
            active: reportType.active,
            generation_date: reportType.generation_date,
            run_at_utc: reportType.run_at_utc,
            meeting_types: reportType.meeting_types,
          },
          params: { organization_id: organization?.id || '' },
        });
        toast.success('Report type created successfully');
      }

      await refetch();
      setIsDialogOpen(false);
      setEditingReportType(undefined);
    } catch (error: any) {
      toast.error('Error saving report type: ' + error.message);
    }
  };

  const handleEdit = (reportType: ReportTypeResponseDto) => {
    setEditingReportType(reportType);
    setIsDialogOpen(true);
  };

  const handleDelete = async (reportType: ReportTypeResponseDto) => {
    if (!user?.id) {
      toast.error('User information is required');
      return;
    }

    try {
      await removeMutation.mutateAsync({
        id: reportType.id,
        params: { organization_id: organization?.id || '' },
      });
      toast.success('Report type deleted successfully');
      await refetch();
    } catch (error: any) {
      toast.error('Error deleting report type: ' + error.message);
    }
  };

  const formatSchedule = (schedule: any): string => {
    if (!schedule) return 'Not scheduled';
    if (schedule.frequency === 'weekly') {
      const days = [ 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday','Sunday'];
      const dayName = days[parseInt(schedule.day) - 1];
      return `Every ${dayName} at ${schedule.time}`;
    } else if (schedule.frequency === 'monthly') {
      return `Monthly on day ${schedule.day} at ${schedule.time}`;
    } else if (schedule.frequency === 'quarterly') {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = months[parseInt(schedule.month || '1') - 1];
      return `Quarterly on ${monthName} ${schedule.day} at ${schedule.time}`;
    }
    return 'Not scheduled';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Report Types</CardTitle>
          <CardDescription>
            Manage and organize different types of automated reports
          </CardDescription>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Type
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-md" />
            ))}
          </div>
        ) : !reportTypes || reportTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No report types defined yet. Add your first report type to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Meeting Types</TableHead>
                <TableHead>Status</TableHead>
                {/* <TableHead>Created</TableHead> */}
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.report_title}</TableCell>
                  <TableCell>{formatSchedule(type.report_schedule)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {type.meeting_types?.map((mt) => (
                        <span
                          key={mt.id}
                          className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full"
                        >
                          {mt.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      type.active 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {type.active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  {/* <TableCell>
                    {type.created_at ? new Date(type.created_at).toLocaleDateString() : '-'}
                  </TableCell> */}
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(type)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(type)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <ReportTypeDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingReportType(undefined);
          }}
          reportType={editingReportType}
          onSubmit={handleSave}
          organizationId={organization?.id || ''}
        />
      </CardContent>
    </Card>
  );
};

export default ReportTypeManager; 