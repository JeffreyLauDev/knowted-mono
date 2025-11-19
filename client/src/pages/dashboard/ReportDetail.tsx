import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, Download, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

// Mock data for a detailed report
const mockDetailedReport = {
  id: '1',
  name: 'Weekly Team Meeting Report',
  description: 'Summary of all team meetings held during the week',
  generatedAt: '2024-03-15T17:00:00',
  period: 'Mar 11 - Mar 15, 2024',
  status: 'completed',
  meetings: 12,
  summary: {
    totalParticipants: 45,
    totalDuration: '24 hours',
    keyTopics: [
      'Project Progress Review',
      'Team Collaboration',
      'Resource Allocation',
      'Technical Challenges',
    ],
    actionItems: 28,
    decisions: 15,
  },
  meetingDetails: [
    {
      id: '1',
      title: 'Weekly Team Sync',
      date: '2024-03-11T10:00:00',
      duration: '1 hour',
      participants: 8,
      summary: 'Team discussed current sprint progress and identified blockers in the authentication module.',
      actionItems: [
        'Update API documentation by Wednesday',
        'Schedule follow-up with DevOps team',
        'Review pull requests by end of day',
      ],
    },
    {
      id: '2',
      title: 'Project Planning',
      date: '2024-03-12T14:00:00',
      duration: '2 hours',
      participants: 12,
      summary: 'Detailed planning session for Q2 initiatives and resource allocation.',
      actionItems: [
        'Finalize project timeline',
        'Assign team leads for new modules',
        'Prepare budget proposal',
      ],
    },
  ],
  metrics: {
    participationRate: '85%',
    averageMeetingDuration: '1.5 hours',
    actionItemCompletion: '75%',
    decisionImplementation: '90%',
  },
  recommendations: [
    'Consider reducing meeting duration for weekly syncs',
    'Implement structured agenda templates',
    'Schedule more focused technical discussions',
  ],
};

const ReportDetail = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();

  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="gap-2 mb-4"
          onClick={() => navigate('/reports')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{mockDetailedReport.name}</h1>
            <p className="text-muted-foreground mt-1">{mockDetailedReport.description}</p>
          </div>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Report Overview */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Report Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Period</p>
                <p className="font-medium">{mockDetailedReport.period}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Generated</p>
                <p className="font-medium">
                  {new Date(mockDetailedReport.generatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {mockDetailedReport.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Meetings</p>
                <p className="font-medium">{mockDetailedReport.meetings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Participants</p>
                <p className="font-medium">{mockDetailedReport.summary.totalParticipants}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Duration</p>
                <p className="font-medium">{mockDetailedReport.summary.totalDuration}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Action Items</p>
                <p className="font-medium">{mockDetailedReport.summary.actionItems}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Decisions Made</p>
                <p className="font-medium">{mockDetailedReport.summary.decisions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Topics */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Key Topics Discussed</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {mockDetailedReport.summary.keyTopics.map((topic, index) => (
                <Badge key={index} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meeting Details */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Meeting Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-6">
              {mockDetailedReport.meetingDetails.map((meeting) => (
                <div key={meeting.id} className="border-b last:border-0 pb-6 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg">{meeting.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(meeting.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{meeting.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{meeting.participants} participants</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{meeting.summary}</p>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Action Items</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {meeting.actionItems.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Participation Rate</p>
                <p className="font-medium">{mockDetailedReport.metrics.participationRate}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Average Meeting Duration</p>
                <p className="font-medium">{mockDetailedReport.metrics.averageMeetingDuration}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Action Item Completion</p>
                <p className="font-medium">{mockDetailedReport.metrics.actionItemCompletion}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Decision Implementation</p>
                <p className="font-medium">{mockDetailedReport.metrics.decisionImplementation}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              {mockDetailedReport.recommendations.map((recommendation, index) => (
                <li key={index}>{recommendation}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportDetail; 