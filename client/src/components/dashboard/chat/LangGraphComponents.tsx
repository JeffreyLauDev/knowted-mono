import MeetingCard from '../MeetingCard';
import MeetingList from '../MeetingList';
import StatsCard from '../StatsCard';
import type { MeetingListResponseDto } from '@/api/generated/models';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Component map for LangGraph Generative UI
 * Wraps your existing components to work with LangGraph's UI system
 */

interface MeetingCardUIProps {
  meeting: MeetingListResponseDto;
  getMeetingTypeName?: (typeId: string | null) => string;
}

const MeetingCardUI = (props: MeetingCardUIProps) => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();

  const handleClick = (meetingId: string) => {
    if (sessionId) {
      navigate(`/dashboard/sessions/${sessionId}/meetings/${meetingId}`);
    } else {
      navigate(`/dashboard/meetings/${meetingId}`);
    }
  };

  return (
    <MeetingCard
      meeting={props.meeting}
      onClick={handleClick}
      getMeetingTypeName={props.getMeetingTypeName}
    />
  );
};

interface MeetingListUIProps {
  meetings: MeetingListResponseDto[];
  loading?: boolean;
  getMeetingTypeName: (typeId: string) => string;
}

const MeetingListUI = (props: MeetingListUIProps) => {
  return (
    <MeetingList
      meetings={props.meetings}
      loading={props.loading}
      getMeetingTypeName={props.getMeetingTypeName}
    />
  );
};

interface ReportSummaryUIProps {
  title: string;
  summary: string;
  metrics?: Array<{
    title: string;
    value: string | number;
    description?: string;
    trend?: {
      value: number;
      direction: 'up' | 'down' | 'neutral';
    };
  }>;
}

const ReportSummaryUI = (props: ReportSummaryUIProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">{props.title}</h3>
        <p className="text-sm text-muted-foreground">{props.summary}</p>
      </div>

      {props.metrics && props.metrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {props.metrics.map((metric, idx) => (
            <StatsCard
              key={idx}
              title={metric.title}
              value={metric.value}
              description={metric.description}
              trend={metric.trend}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface TeamInsightsUIProps {
  teamName: string;
  memberCount: number;
  recentMeetings?: number;
  averageDuration?: number;
}

const TeamInsightsUI = (props: TeamInsightsUIProps) => {
  const metrics = [
    {
      title: 'Members',
      value: props.memberCount,
    },
    ...(props.recentMeetings !== undefined
      ? [
          {
            title: 'Recent Meetings',
            value: props.recentMeetings,
          },
        ]
      : []),
    ...(props.averageDuration !== undefined
      ? [
          {
            title: 'Avg Duration',
            value: `${props.averageDuration} min`,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{props.teamName}</h3>
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((metric, idx) => (
          <StatsCard key={idx} title={metric.title} value={metric.value} />
        ))}
      </div>
    </div>
  );
};

// Export component map for LangGraph
export const langGraphComponents = {
  meeting_card: MeetingCardUI,
  meeting_list: MeetingListUI,
  report_summary: ReportSummaryUI,
  team_insights: TeamInsightsUI,
};

