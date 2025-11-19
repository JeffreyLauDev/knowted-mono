
import MeetingDetailSection from '@/components/dashboard/detail/MeetingDetailSection';
import { useParams, useSearchParams } from 'react-router-dom';

const SharedMeeting = (): JSX.Element => {
  const { meetingId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // For shared meetings, we need to validate the token exists
  if (!meetingId || !token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Access Error</h2>
          <p className="text-muted-foreground">Invalid or missing share link</p>
          <div className="mt-4 text-xs text-muted-foreground">
            Debug info: Meeting ID: {meetingId}, Token: {token ? 'Present' : 'Missing'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      {/* Branding Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <img
              src="/logos/Knowted Logo - Stacked (Green)@1.5x@1.5x.png"
              alt="Knowted"
              className="h-6 w-auto sm:h-8"
            />
            <div className="text-xs sm:text-sm text-muted-foreground">
              Knowted
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-0 h-[calc(100vh-65px)]">
        {/* Use the entire MeetingDetailSection component in shared mode */}
        <MeetingDetailSection isSharedMode={true} />
      </div>
    </div>
  );
};

export default SharedMeeting;
