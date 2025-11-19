
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

interface CreateOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateOrg: (name: string) => Promise<void>;
}

const CreateOrgDialog: React.FC<CreateOrgDialogProps> = ({
  open,
  onOpenChange,
  onCreateOrg,
}) => {
  const [orgName, setOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    try {
      setIsCreating(true);
      setError('');
      await onCreateOrg(orgName);
      setOrgName('');
      onOpenChange(false);
      toast.success('Organization created successfully');
    } catch (error: any) {
      setError(error.message || 'Failed to create organization');
      toast.error('Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpenState: boolean) => {
    if (!isCreating) {
      setOrgName('');
      setError('');
      onOpenChange(newOpenState);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Enter a name for your new organization.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              placeholder="Acme, Inc."
              value={orgName}
              onChange={(e) => {
                setOrgName(e.target.value);
                setError('');
              }}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrgDialog;
