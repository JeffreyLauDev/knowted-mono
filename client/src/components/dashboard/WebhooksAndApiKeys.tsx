import { Key, Webhook } from 'lucide-react';
import React from 'react';
import ApiKeyManagement from './api-keys/ApiKeyManagement';
import WebhookManagement from './webhooks/WebhookManagement';

const WebhooksAndApiKeys: React.FC = () => {
  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Advanced Settings</h1>
        <p className="text-gray-600">
          Manage webhooks and API keys for integrations
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Webhooks Section */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Webhook className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Webhooks</h2>
          </div>
          <WebhookManagement />
        </div>

        {/* API Keys Section */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Key className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">API Keys</h2>
          </div>
          <ApiKeyManagement />
        </div>
      </div>
    </div>
  );
};

export default WebhooksAndApiKeys;
