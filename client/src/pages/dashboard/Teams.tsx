import { useOrganizationsControllerGetOrganizationMembers } from '@/api/generated/knowtedAPI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';

const getInitials = (name: string) => {
  if (!name) {return '';}
  const parts = name.split(' ');
  if (parts.length === 1) {return parts[0][0];}
  return parts[0][0] + parts[1][0];
};

const Teams = () => {
  const { organization } = useAuth();
  const { data: membersData, isLoading } = useOrganizationsControllerGetOrganizationMembers(
    organization?.id || '',
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );
  const [search, setSearch] = useState('');
  const members = ((membersData as any)?.data as any[]) || [];
  const filteredMembers = members.filter((member) => {
    const searchLower = search.toLowerCase();
    return (
      member.name?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Teams</h1>
        <p className="text-gray-600">Manage team members and their roles within your organization</p>
      </div>

      {/* Teams Management Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Description */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Members</h3>
            <p className="text-gray-600">View and manage your organization's team members, assign roles, and control access permissions.</p>
          </div>

          {/* Right Column - Settings */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <Button className="h-11 px-6 py-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />Invite User
              </Button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10 h-11 bg-white border-gray-300 focus:border-primary focus:ring-primary"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Team Members Table */}
            <div className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-medium text-gray-700">User</th>
                    <th className="text-left py-4 px-4 font-medium text-gray-700">Role</th>
                    <th className="text-left py-4 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-4 px-4 font-medium text-gray-700">Last Active</th>
                    <th className="text-left py-4 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="ml-2 text-gray-500">Loading team members...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12">
                        <div className="text-gray-500">
                          <p className="text-sm">No team members found.</p>
                          <p className="text-xs mt-1">Try adjusting your search or invite new members.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <span className="relative flex shrink-0 overflow-hidden rounded-full h-10 w-10">
                              <span className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                                {getInitials(member.name)}
                              </span>
                            </span>
                            <div>
                              <div className="font-medium text-gray-900">{member.name}</div>
                              <div className="text-sm text-gray-500">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Button variant="outline" className="flex h-9 items-center justify-between w-40 border-gray-300 text-gray-700 hover:bg-gray-50">
                            <span>{member.role || 'Member'}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down h-4 w-4 opacity-50"><path d="m6 9 6 6 6-6"></path></svg>
                          </Button>
                        </td>
                        <td className="py-4 px-4">
                          <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-500 text-sm">Never</td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="icon" className="h-9 w-9 border-gray-300 text-gray-600 hover:bg-gray-50">
                              <SquarePen className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-9 w-9 border-red-300 text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teams;
