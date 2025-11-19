import RoleManagement from '@/components/dashboard/RoleManagement';
import { Users } from 'lucide-react';

const Teams = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Teams</h1>
      </div>
      <RoleManagement />
    </div>
  );
};

export default Teams;
