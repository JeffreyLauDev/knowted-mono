import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { useReports } from '@/hooks/useReports';
import { Download, Pencil } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

const Reports = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: isAuthLoading, organization } = useAuth();
  const {
    reports,
    isLoading: isReportsLoading,
    error
  } = useReports(organization?.id || '');

  // Show loading state while auth or reports are loading
  if (isAuthLoading || isReportsLoading) {
    return (
        <div className="p-4 max-w-[1400px] mx-auto flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
  }

  // Only check for authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Show error state if there's an error
  if (error) {
    return (
        <div className="p-4 max-w-[1400px] mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Reports</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        </div>
    );
  }

  const handleViewReport = (reportId: string) => {
    navigate(`/reports/${reportId}`);
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'No date';
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return 'Invalid date';
      }
      return parsedDate.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports</h1>
        <p className="text-gray-600">View and manage your organization's reports and analytics</p>
      </div>

      {/* Reports Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Description */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Report Management</h3>
            <p className="text-gray-600 mb-4">Access and manage all reports generated for your organization. Click on any report to view detailed information and analytics.</p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Completed reports ready for review</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Reports in progress</span>
              </div>
            </div>
          </div>

          {/* Right Column - Settings */}
          <div className="lg:col-span-2">
            {reports.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">No reports found</p>
                <p className="text-xs mt-1">Reports will appear here once they are generated.</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 font-medium text-gray-700">Title</th>
                      <th className="text-left py-4 px-4 font-medium text-gray-700">Type</th>
                      <th className="text-left py-4 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-left py-4 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-right py-4 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr
                        key={report.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleViewReport(report.id)}
                      >
                        <TableCell className="py-4 px-4 font-medium">{report.title}</TableCell>
                        <TableCell className="py-4 px-4 text-gray-600">{report.type}</TableCell>
                        <TableCell className="py-4 px-4 text-gray-600">{formatDate(report.created_at)}</TableCell>
                        <TableCell className="py-4 px-4">
                          <Badge 
                            variant={report.status === 'completed' ? 'default' : 'secondary'}
                            className={report.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-4 px-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 border-gray-300 text-gray-600 hover:bg-gray-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewReport(report.id);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 border-gray-300 text-gray-600 hover:bg-gray-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement download functionality
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
