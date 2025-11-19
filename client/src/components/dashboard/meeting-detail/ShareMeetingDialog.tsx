import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { useMeetingShare } from '@/hooks/useMeetingShare';
import { toast } from '@/lib/toast';
import { Calendar, Link2, Share2, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ShareMeetingDialogProps {
  meetingTitle: string;
  meetingId: string;
}

const ShareMeetingDialog = ({ meetingTitle, meetingId }: ShareMeetingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const { organization } = useAuth();

  const { shareLink, isLoading, generateShareLink, toggleLinkStatus, deleteShareLink } = useMeetingShare(meetingId, organization?.id);

  const getShareUrl = () => {
    if (!shareLink) {return '';}
    return `${window.location.origin}/shared/${meetingId}?token=${shareLink.share_token}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    toast.success('Link copied to clipboard');
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) {return 'No expiry';}
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

  const handleGenerateNewLink = async () => {
    await generateShareLink(hasExpiry ? expiryDate : undefined);
    toast.success('New share link generated');
  };

  const handleDeleteLink = async () => {
    await deleteShareLink();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Meeting Minutes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Share these meeting minutes: <span className="font-medium text-foreground">{meetingTitle}</span>
            </p>
          </div>

          {!shareLink?.is_enabled ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Expiry Date</label>
                  <div className="flex items-center space-x-2">
                    <Switch checked={hasExpiry} onCheckedChange={setHasExpiry} />
                    <span className="text-sm text-muted-foreground">Set expiration date</span>
                  </div>
                </div>
              </div>

              {hasExpiry && (
                <div>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              <Button
                onClick={handleGenerateNewLink}
                disabled={isLoading || (hasExpiry && !expiryDate)}
                className="w-full"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Generate Share Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Share Link Status</label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={shareLink.is_enabled}
                      onCheckedChange={toggleLinkStatus}
                    />
                    <span className="text-sm text-muted-foreground">
                      {shareLink.is_enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {shareLink.expires_at && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  Expires: {formatDate(shareLink.expires_at)}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={getShareUrl()}
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={handleCopyLink}>
                    Copy Link
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDeleteLink}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Link
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleGenerateNewLink}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Generate New Link
                  </Button>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Anyone with this link can view these meeting minutes, even if they're not part of your organization.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareMeetingDialog;
