
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { CalendarClock, Edit, Eye, Pencil, Search, Shield, Trash2, User } from 'lucide-react';
import React, { useState } from 'react';

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  teams: any[];
}

interface MembersListProps {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (memberId: string) => void;
}

// Map role to icon and description
const roleConfig: Record<string, { icon: React.ReactNode; description: string; color: string }> = {
  'admin': { 
    icon: <Shield className="h-4 w-4" />, 
    description: 'Full control over the organization, including team management, billing, and all meetings', 
    color: 'bg-primary text-primary-foreground'
  },
  'meeting_owner': { 
    icon: <CalendarClock className="h-4 w-4" />, 
    description: 'Can create/edit/delete their meetings and manage meeting participants', 
    color: 'bg-green-500/80 text-white'
  },
  'editor': { 
    icon: <Pencil className="h-4 w-4" />, 
    description: 'Can view assigned meetings and edit content, but cannot delete meetings', 
    color: 'bg-blue-500/80 text-white'
  },
  'member': { 
    icon: <User className="h-4 w-4" />, 
    description: 'Can view meetings they are invited to and submit feedback', 
    color: 'bg-slate-500/80 text-white'
  },
  'viewer': { 
    icon: <Eye className="h-4 w-4" />, 
    description: 'Limited view-only access to shared meetings', 
    color: 'bg-gray-400 text-white'
  },
  // Default fallback for any other roles
  'default': { 
    icon: <User className="h-4 w-4" />, 
    description: 'Custom role', 
    color: 'bg-gray-300 text-gray-800'
  }
};

const MembersList = ({ members, onEdit, onDelete }: MembersListProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = members.filter(member => 
    (member.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (member.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (member.role?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const getRoleConfig = (role: string) => {
    return roleConfig[role.toLowerCase()] || roleConfig.default;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border rounded-md">
        <div className="p-3 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="font-medium">organization Members</span>
            <span className="text-sm text-muted-foreground">
              {members.length} total
            </span>
          </div>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="space-y-1">
            {filteredMembers.map((member) => {
              const roleInfo = getRoleConfig(member.role);
              
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 border-b last:border-b-0"
                >
                  <div className="flex-grow">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${roleInfo.color}`}>
                            {roleInfo.icon}
                            <span className="capitalize">{member.role}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-sm">{roleInfo.description}</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      {member.teams && member.teams.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {member.teams.length} team{member.teams.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onEdit(member)}
                      className="h-8 gap-1"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only">Edit</span>
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => onDelete(member.id)}
                      className="h-8 gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              );
            })}
            {filteredMembers.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                No members found matching your search.
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default MembersList;
