import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Copy,
  Edit,
  ExternalLink,
  Plus,
  Trash2,
  Webhook
} from 'lucide-react';
import React, { useState } from 'react';
import {
  useWebhooksControllerCreate,
  useWebhooksControllerDelete,
  useWebhooksControllerFindOne,
  useWebhooksControllerToggleActive,
  useWebhooksControllerUpdate
} from '../../../api/generated/knowtedAPI';
import type { CreateWebhookDto, UpdateWebhookDto, WebhookResponseDto } from '../../../api/generated/models';

interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: {
        response?: {
          errors?: {
            constraints?: {
              isUrl?: string;
            };
          }[];
        };
      };
    };
  };
}

const WebhookManagement: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState<CreateWebhookDto>({ name: '', url: '', is_active: true });
  const [editWebhookData, setEditWebhookData] = useState<UpdateWebhookDto>({});

  const { organization } = useAuth();
  const organizationId = organization?.id || '';

  // Use the real API hooks
  const { data: webhookResponse, refetch } = useWebhooksControllerFindOne(organizationId, {
    query: {
      enabled: !!organizationId
    }
  });
  const webhook = (webhookResponse && 'data' in webhookResponse ? webhookResponse.data : webhookResponse) as WebhookResponseDto | undefined;
  const createMutation = useWebhooksControllerCreate();
  const updateMutation = useWebhooksControllerUpdate();
  const deleteMutation = useWebhooksControllerDelete();
  const toggleMutation = useWebhooksControllerToggleActive();

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  const handleCreateWebhook = async (): Promise<void> => {
    if (!newWebhook.name || !newWebhook.url) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a name and URL for the webhook',
        variant: 'destructive'
      });
      return;
    }

    // Validate URL format
    try {
      new URL(newWebhook.url);
    } catch {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid URL (e.g., https://example.com/webhook)',
        variant: 'destructive'
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        organizationId,
        data: newWebhook
      });
      setNewWebhook({ name: '', url: '', is_active: true });
      setIsCreateDialogOpen(false);
      refetch();
      toast({
        title: 'Webhook Created',
        description: `Webhook "${newWebhook.name}" has been created successfully`
      });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError?.response?.data?.error?.response?.errors?.[0]?.constraints?.isUrl ||
                          apiError?.response?.data?.message ||
                          'Failed to create webhook';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteWebhook = async (): Promise<void> => {
    if (webhook) {
      try {
        await deleteMutation.mutateAsync({
          organizationId,
          id: webhook.id
        });
        refetch();
        toast({
          title: 'Webhook Deleted',
          description: `Webhook "${webhook.name}" has been deleted`
        });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError?.response?.data?.message || 'Failed to delete webhook';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
    }
  };

  const handleToggleWebhook = async (): Promise<void> => {
    if (webhook) {
      try {
        await toggleMutation.mutateAsync({
          organizationId,
          id: webhook.id
        });
        refetch();
        toast({
          title: 'Webhook Status Updated',
          description: `Webhook "${webhook.name}" is now ${webhook.is_active ? 'inactive' : 'active'}`
        });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError?.response?.data?.message || 'Failed to update webhook status';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
    }
  };

  const handleUpdateWebhook = async (): Promise<void> => {
    if (webhook && Object.keys(editWebhookData).length > 0) {
      // Validate URL format if URL is being updated
      if (editWebhookData.url) {
        try {
          new URL(editWebhookData.url);
        } catch {
          toast({
            title: 'Validation Error',
            description: 'Please enter a valid URL (e.g., https://example.com/webhook)',
            variant: 'destructive'
          });
          return;
        }
      }

      try {
        await updateMutation.mutateAsync({
          organizationId,
          id: webhook.id,
          data: editWebhookData
        });
        setIsEditDialogOpen(false);
        setEditWebhookData({});
        refetch();
        toast({
          title: 'Webhook Updated',
          description: `Webhook "${webhook.name}" has been updated successfully`
        });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError?.response?.data?.message || 'Failed to update webhook';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
    }
  };

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard',
      description: 'Webhook secret has been copied to your clipboard'
    });
  };

  const openEditDialog = (): void => {
    if (webhook) {
      setEditWebhookData({
        name: webhook.name,
        url: webhook.url,
        is_active: webhook.is_active
      });
      setIsEditDialogOpen(true);
    }
  };

  if (!organization) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-gray-500">Configure webhook notifications</p>
        </div>
        {!webhook && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Webhook</DialogTitle>
                <DialogDescription>
                  Set up a webhook to receive notifications about events.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="url" className="text-right">
                    URL
                  </Label>
                  <Input
                    id="url"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="active" className="text-right">
                    Active
                  </Label>
                  <Switch
                    id="active"
                    checked={newWebhook.is_active}
                    onCheckedChange={(checked) => setNewWebhook({ ...newWebhook, is_active: checked })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateWebhook} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Webhook'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Webhook Display */}
      <div className="space-y-3">
        {!webhook ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Webhook className="h-8 w-8 text-gray-400 mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-2">No webhook configured</h3>
              <p className="text-gray-500 text-center mb-3 text-sm">
                Create a webhook to receive notifications.
              </p>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Webhook
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium truncate">{webhook.name}</h3>
                    <Badge variant={webhook.is_active ? 'default' : 'secondary'} className="text-xs">
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ExternalLink className="h-3 w-3 text-gray-400" />
                    <code className="text-xs font-mono text-gray-600 truncate">{webhook.url}</code>
                  </div>
                  <div className="mt-2">
                    <h4 className="text-xs font-medium text-gray-700 mb-1">Secret</h4>
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono flex-1 truncate">
                        {webhook.secret}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(webhook.secret)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Created {formatTimestamp(webhook.created_at)}
                  </p>
                </div>
                <div className="flex items-center space-x-1 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openEditDialog}
                    className="h-8 w-8 p-0"
                    disabled={deleteMutation.isPending}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleWebhook}
                    className="h-8 w-8 p-0 text-xs"
                    disabled={deleteMutation.isPending}
                  >
                    {webhook.is_active ? 'Off' : 'On'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteWebhook}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      {webhook && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Webhook</DialogTitle>
              <DialogDescription>
                Modify the settings for your webhook.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={editWebhookData.name || ''}
                  onChange={(e) => setEditWebhookData({ ...editWebhookData, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-url" className="text-right">
                  URL
                </Label>
                <Input
                  id="edit-url"
                  value={editWebhookData.url || ''}
                  onChange={(e) => setEditWebhookData({ ...editWebhookData, url: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-active" className="text-right">
                  Active
                </Label>
                <Switch
                  id="edit-active"
                  checked={editWebhookData.is_active ?? webhook.is_active}
                  onCheckedChange={(checked) => setEditWebhookData({ ...editWebhookData, is_active: checked })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateWebhook} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default WebhookManagement;
