
import React from 'react';
import { Card } from '@/components/ui/card';
import { Shield, CalendarClock, Pencil, User, Eye } from 'lucide-react';

const roleConfig = {
  admin: {
    icon: <Shield className="h-5 w-5" />,
    description: 'Full control over the organization, including team management, billing, and all meetings',
    permissions: [
      'Create and manage all meetings',
      'Manage meeting types and templates',
      'Manage team members and their roles',
      'Access billing and organization settings',
      'Full access to all organization data'
    ]
  },
  meeting_owner: {
    icon: <CalendarClock className="h-5 w-5" />,
    description: 'Can create and manage their own meetings, plus view shared content',
    permissions: [
      'Create and manage their own meetings',
      'View meeting types and templates',
      'Invite participants to their meetings',
      'Access meeting analytics for their meetings',
      'View shared organization content'
    ]
  },
  editor: {
    icon: <Pencil className="h-5 w-5" />,
    description: 'Can edit assigned meetings and contribute content',
    permissions: [
      'View and edit assigned meetings',
      'Add comments and feedback',
      'View meeting types',
      'Cannot delete meetings',
      'View shared organization content'
    ]
  },
  member: {
    icon: <User className="h-5 w-5" />,
    description: 'Basic access to view meetings they are invited to',
    permissions: [
      'View meetings they are invited to',
      'View meeting types',
      'Cannot create or edit meetings',
      'Cannot manage team members',
      'Basic organization access'
    ]
  },
  viewer: {
    icon: <Eye className="h-5 w-5" />,
    description: 'Limited view-only access to shared content',
    permissions: [
      'View shared meetings only',
      'Cannot create or edit meetings',
      'Cannot manage team members',
      'Limited organization access',
      'Read-only access to shared content'
    ]
  }
};

const RolePermissionsDisplay = () => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Role-Based Access Control</h2>
        <p className="text-muted-foreground">
          Our platform uses a hierarchical role system to manage access and permissions
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(roleConfig).map(([role, config]) => (
          <Card key={role} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {config.icon}
              </div>
              <h3 className="text-lg font-semibold capitalize">
                {role.replace('_', ' ')}
              </h3>
            </div>
            
            <p className="text-muted-foreground mb-4">
              {config.description}
            </p>
            
            <div className="space-y-2">
              <p className="text-sm font-medium mb-2">Permissions:</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                {config.permissions.map((permission, index) => (
                  <li key={index}>{permission}</li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RolePermissionsDisplay;
