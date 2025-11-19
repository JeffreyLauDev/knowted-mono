
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Meeting, MeetingType } from '@/types';
import { toast } from '@/lib/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: Partial<Meeting>) => void;
  meeting?: Meeting;
  meetingTypes: MeetingType[];
}

const MeetingDialog = ({
  isOpen,
  onClose,
  onSave,
  meeting,
  meetingTypes,
}: MeetingDialogProps) => {
  const [formData, setFormData] = useState({
    title: '',
    host_email: '',
    transcript_url: '',
    duration: 30,
    participants_email: '',
    meeting_type: '',
    summary: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title || '',
        host_email: meeting.host_email || '',
        transcript_url: meeting.transcript_url || '',
        duration: meeting.duration,
        participants_email: meeting.participants_email ? meeting.participants_email.join(', ') : '',
        meeting_type: meeting.meeting_type || '',
        summary: meeting.summary_meta_data?.summary || '',
      });
    } else {
      setFormData({
        title: '',
        host_email: '',
        transcript_url: '',
        duration: 30,
        participants_email: '',
        meeting_type: '',
        summary: '',
      });
    }
  }, [meeting, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Meeting title is required');
      return;
    }
    
    if (!formData.host_email.trim()) {
      toast.error('Host email is required');
      return;
    }
    
    if (!formData.meeting_type) {
      toast.error('Please select a meeting type');
      return;
    }
    
    setIsLoading(true);
    
    // Process participants emails
    const participantsArray = formData.participants_email
      .split(',')
      .map(email => email.trim())
      .filter(email => email);
    
    // Prepare summary in the proper format
    const summary_meta_data = formData.summary ? { summary: formData.summary } : null;
    
    // Simulate API call
    setTimeout(() => {
      onSave({
        ...meeting,
        title: formData.title,
        host_email: formData.host_email,
        transcript_url: formData.transcript_url,
        duration: Number(formData.duration),
        participants_email: participantsArray,
        meeting_type: formData.meeting_type,
        summary_meta_data,
      });
      
      setIsLoading(false);
      onClose();
      
      toast.success(
        meeting ? 'Meeting updated' : 'Meeting created'
      );
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {meeting ? 'Edit Meeting' : 'Create Meeting'}
            </DialogTitle>
            <DialogDescription>
              {meeting
                ? 'Update the details of this meeting'
                : 'Add a new meeting to your organization'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Meeting title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="meeting_type">Meeting Type</Label>
                <Select 
                  value={formData.meeting_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, meeting_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a meeting type" />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.meeting_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="host_email">Host Email</Label>
                <Input
                  id="host_email"
                  name="host_email"
                  type="email"
                  value={formData.host_email}
                  onChange={handleChange}
                  placeholder="host@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="participants_email">Participants (comma-separated)</Label>
                <Input
                  id="participants_email"
                  name="participants_email"
                  value={formData.participants_email}
                  onChange={handleChange}
                  placeholder="participant1@example.com, participant2@example.com"
                />
              </div>
              
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="transcript_url">Transcript URL</Label>
                <Input
                  id="transcript_url"
                  name="transcript_url"
                  value={formData.transcript_url}
                  onChange={handleChange}
                  placeholder="https://example.com/transcript"
                />
              </div>
              
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="summary">Meeting Summary</Label>
                <Textarea
                  id="summary"
                  name="summary"
                  value={formData.summary}
                  onChange={handleChange}
                  placeholder="Meeting summary (optional)"
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingDialog;
