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
    Eye,
    EyeOff,
    Key,
    Plus,
    Trash2
} from 'lucide-react';
import React, { useState } from 'react';
import {
    useApiKeysControllerCreate,
    useApiKeysControllerDelete,
    useApiKeysControllerFindAll,
    useApiKeysControllerToggleActive,
    useApiKeysControllerUpdate
} from '../../../api/generated/knowtedAPI';
import type { ApiKeyResponseDto, CreateApiKeyDto } from '../../../api/generated/models';

const ApiKeyManagement: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<CreateApiKeyDto>({ name: '', is_active: true });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const { organization } = useAuth();
  const organizationId = organization?.id || '';

  // Use the real API hooks
  const { data: apiKeysResponse, refetch } = useApiKeysControllerFindAll(organizationId, {
    query: {
      enabled: !!organizationId
    }
  });
  const apiKeys = (apiKeysResponse && 'data' in apiKeysResponse ? apiKeysResponse.data : apiKeysResponse) as ApiKeyResponseDto[] || [];
  const createMutation = useApiKeysControllerCreate();
  const updateMutation = useApiKeysControllerUpdate();
  const deleteMutation = useApiKeysControllerDelete();
  const toggleMutation = useApiKeysControllerToggleActive();

  const maskApiKey = (key: string): string => {
    if (key.length <= 8) {return '********';}
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  const handleCreateApiKey = async (): Promise<void> => {
    if (!newApiKey.name) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a name for the API key',
        variant: 'destructive'
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        organizationId,
        data: newApiKey
      });
      setNewApiKey({ name: '', is_active: true });
      setIsCreateDialogOpen(false);
      refetch();

      toast({
        title: 'API Key Created',
        description: `API Key "${newApiKey.name}" has been created successfully`
      });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      const errorMessage = apiError?.response?.data?.message || 'Failed to create API key';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteApiKey = async (apiKeyId: string): Promise<void> => {
    const apiKey = apiKeys.find((key) => key.id === apiKeyId);
    try {
      await deleteMutation.mutateAsync({
        organizationId,
        id: apiKeyId
      });
      refetch();

      toast({
        title: 'API Key Deleted',
        description: `API Key "${apiKey?.name}" has been deleted`
      });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      const errorMessage = apiError?.response?.data?.message || 'Failed to delete API key';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleToggleApiKey = async (apiKeyId: string): Promise<void> => {
    const toggledKey = apiKeys.find((key) => key.id === apiKeyId);
    try {
      await toggleMutation.mutateAsync({
        organizationId,
        id: apiKeyId
      });
      refetch();

      toast({
        title: 'API Key Status Updated',
        description: `API Key "${toggledKey?.name}" is now ${toggledKey?.is_active ? 'inactive' : 'active'}`
      });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      const errorMessage = apiError?.response?.data?.message || 'Failed to update API key status';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard',
      description: 'API key has been copied to your clipboard'
    });
  };

  const toggleKeyVisibility = (apiKeyId: string): void => {
    setShowKeys((prev) => ({
      ...prev,
      [apiKeyId]: !prev[apiKeyId]
    }));
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (!organization) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-gray-500">Generate and manage API keys</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Generate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Generate New API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for your application.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newApiKey.name}
                  onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="active" className="text-right">
                  Active
                </Label>
                <Switch
                  id="active"
                  checked={newApiKey.is_active}
                  onCheckedChange={(checked) => setNewApiKey({ ...newApiKey, is_active: checked })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateApiKey} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Generating...' : 'Generate Key'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* API Keys List */}
      <div className="space-y-3">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Key className="h-8 w-8 text-gray-400 mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-2">No API keys</h3>
              <p className="text-gray-500 text-center mb-3 text-sm">
                Generate your first API key to start integrating.
              </p>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Generate Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-sm font-medium truncate">{apiKey.name}</h3>
                      <Badge variant={apiKey.is_active ? 'default' : 'secondary'} className="text-xs">
                        {apiKey.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Key className="h-3 w-3 text-gray-400" />
                      <code className="text-xs font-mono text-gray-600 truncate">
                        {showKeys[apiKey.id] ? apiKey.key : maskApiKey(apiKey.key)}
                      </code>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Created {formatTimestamp(apiKey.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      className="h-8 w-8 p-0"
                    >
                      {showKeys[apiKey.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(apiKey.key)}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleApiKey(apiKey.id)}
                      className="h-8 w-8 p-0 text-xs"
                      disabled={deleteMutation.isPending}
                    >
                      {apiKey.is_active ? 'Off' : 'On'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteApiKey(apiKey.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ApiKeyManagement;
