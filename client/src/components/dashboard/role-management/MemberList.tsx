import type { OrganizationMemberResponseDto } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Plus, Search, Settings, Trash2 } from 'lucide-react';

type organizationMember = OrganizationMemberResponseDto;

interface MemberListProps {
  members: organizationMember[];
  search: string;
  onSearchChange: (value: string) => void;
  onAddMember: () => void;
  onEditMember: (member: organizationMember) => void;
  onDeleteMember: (memberId: string) => void;
}

export const MemberList = ({
  members,
  search,
  onSearchChange,
  onAddMember,
  onEditMember,
  onDeleteMember
}: MemberListProps) => {
  const filteredMembers = members.filter((member) => {
    const searchLower = search.toLowerCase();
    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
    return (
      fullName.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Members</CardTitle>
          <CardDescription>Manage your organization members and their permissions</CardDescription>
        </div>
        <div className="flex items-center gap-2">

          <Button onClick={onAddMember}>
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{`${member.first_name || ''} ${member.last_name || ''}`.trim()}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  {member.team ? (
                    <span className="text-sm text-gray-500">
                      {member.team}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">No team assigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-500">N/A</span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditMember(member)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDeleteMember(member.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
