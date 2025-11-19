import OrganizationForm from '@/components/dashboard/OrganizationForm';
import { useOutletContext } from 'react-router-dom';

const organizationDetails = () => {
  const { organization } = useOutletContext<{ organization: any }>();

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Organization Details</h1>
        <p className="text-gray-600">Manage your organization profile information and settings</p>
      </div>

      {/* Organization Form */}
      <OrganizationForm />
    </div>
  );
};

export default organizationDetails; 