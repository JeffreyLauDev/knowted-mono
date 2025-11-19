
import { Button } from '@/components/ui/button';
import { Share2, Download } from 'lucide-react';

interface MeetingHeaderProps {
  title: string;
}

const MeetingHeader = ({ title }: MeetingHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">{title || 'Untitled Meeting'}</h1>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>
    </div>
  );
};

export default MeetingHeader;
