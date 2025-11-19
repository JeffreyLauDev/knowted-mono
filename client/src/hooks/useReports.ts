import { useMeetingTypesControllerFindAll, useReportTypesControllerFindAll } from '@/api/generated/knowtedAPI';
import { MeetingTypeResponse } from '@/api/generated/models/meetingTypeResponse';
import { ReportTypeResponseDto } from '@/api/generated/models/reportTypeResponseDto';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

export const useReports = (organizationId: string) => {
  const { user } = useAuth();
  const [reportTypesWithMeetingTypes, setReportTypesWithMeetingTypes] = useState<(ReportTypeResponseDto & { meeting_types?: MeetingTypeResponse[] })[]>([]);

  const { data: reportTypesResponse, isLoading: isReportTypesLoading, error: reportTypesError } = useReportTypesControllerFindAll<ReportTypeResponseDto[]>(
    { organization_id: organizationId },
    {
      query: {
        enabled: !!organizationId && !!user,
      },
    }
  );

  const { data: meetingTypesResponse, isLoading: isMeetingTypesLoading } = useMeetingTypesControllerFindAll<MeetingTypeResponse[]>(
    { organization_id: organizationId },
    {
      query: {
        enabled: !!organizationId && !!user,
      }
    }
  );

  useEffect(() => {
    if (reportTypesResponse && meetingTypesResponse) {
      // For now, we'll assume all meeting types are associated with all report types
      // This should be replaced with actual data from the backend
      const combinedData = reportTypesResponse.map(reportType => ({
        ...reportType,
        meeting_types: meetingTypesResponse
      }));
      setReportTypesWithMeetingTypes(combinedData);
    }
  }, [reportTypesResponse, meetingTypesResponse]);

  // TODO: Add reports API endpoint and hook
  const reports: ReportTypeResponseDto[] = [];
  const isReportsLoading = false;
  const reportsError = null;

  return {
    reportTypes: reportTypesWithMeetingTypes,
    reports,
    isLoading: isReportTypesLoading || isMeetingTypesLoading || isReportsLoading,
    error: reportsError,
  };
}; 