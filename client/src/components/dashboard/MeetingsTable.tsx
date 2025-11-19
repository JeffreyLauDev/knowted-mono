
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Meeting } from '@/types';
import { Eye, Pencil, Trash2 } from 'lucide-react';

interface MeetingsTableProps {
  meetings: Meeting[];
  getMeetingTypeName: (id: string) => string;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meeting: Meeting) => void;
  onView: (meeting: Meeting) => void;
}

const MeetingsTable = ({ 
  meetings, 
  getMeetingTypeName,
  onEdit,
  onDelete,
  onView
}: MeetingsTableProps) => {
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'No date';
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return 'Invalid date';
      }
      return parsedDate.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  if (meetings.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No meetings match your criteria</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Host</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="w-[120px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {meetings.map((meeting) => (
          <TableRow key={meeting.id}>
            <TableCell className="font-medium">
              {meeting.title || 'Untitled'}
            </TableCell>
            <TableCell>
              {meeting.meeting_type && (
                <div className="px-2 py-1 text-xs inline-block rounded-full bg-primary/10 text-primary">
                  {getMeetingTypeName(meeting.meeting_type)}
                </div>
              )}
            </TableCell>
            <TableCell>{meeting.host_email || 'Unknown'}</TableCell>
            <TableCell>{meeting.duration} min</TableCell>
            <TableCell>
              {formatDate(meeting.meeting_date || meeting.created_at)}
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView(meeting)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(meeting)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(meeting)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default MeetingsTable;
