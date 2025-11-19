import type { AgentEventDto } from '@/api/generated/models';
import { cn } from '@/lib/utils';
import {
    Activity,
    Brain,
    CheckCircle,
    Clock,
    Cog,
    FileText,
    Loader2,
    Search,
    XCircle
} from 'lucide-react';

interface InlineAgentActivityProps {
  events: AgentEventDto[];
  isActive: boolean;
  currentThought?: string;
  className?: string;
}

const getEventIcon = (type: string): JSX.Element => {
  switch (type) {
    case 'agent_started':
      return <Activity className="h-3 w-3 text-blue-500" />;
    case 'agent_thinking':
      return <Brain className="h-3 w-3 text-purple-500" />;
    case 'tool_started':
      return <Cog className="h-3 w-3 text-orange-500" />;
    case 'tool_progress':
      return <Loader2 className="h-3 w-3 text-orange-500 animate-spin" />;
    case 'tool_completed':
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case 'tool_failed':
      return <XCircle className="h-3 w-3 text-red-500" />;
    case 'subagent_started':
      return <Activity className="h-3 w-3 text-indigo-500" />;
    case 'subagent_completed':
      return <CheckCircle className="h-3 w-3 text-indigo-500" />;
    case 'research_findings':
      return <Search className="h-3 w-3 text-cyan-500" />;
    case 'todos_updated':
      return <FileText className="h-3 w-3 text-yellow-500" />;
    case 'agent_completed':
      return <CheckCircle className="h-3 w-3 text-green-600" />;
    case 'agent_failed':
      return <XCircle className="h-3 w-3 text-red-600" />;
    default:
      return <Clock className="h-3 w-3 text-gray-500" />;
  }
};

const getEventLabel = (type: string): string => {
  switch (type) {
    case 'agent_started':
      return 'Started';
    case 'agent_thinking':
      return 'Thinking';
    case 'tool_started':
      return 'Using tool';
    case 'tool_completed':
      return 'Completed';
    case 'tool_failed':
      return 'Failed';
    case 'subagent_started':
      return 'Sub-task';
    case 'research_findings':
      return 'Found';
    case 'todos_updated':
      return 'Planning';
    case 'agent_completed':
      return 'Done';
    default:
      return type.replace(/_/g, ' ');
  }
};

const formatTime = (timestamp: string): string => {
  if (!timestamp) return 'Invalid time';
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid time';
    }
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Invalid time';
  }
};

const InlineAgentActivity: React.FC<InlineAgentActivityProps> = ({
  events,
  isActive,
  currentThought,
  className
}) => {
    // Get the most recent events (backend now only sends meaningful events)
  const recentEvents = events.slice(-3);
  // Calculate overall progress
  const totalTools = events.filter((e) => e.type === 'tool_started').length;
  const completedTools = events.filter((e) =>
    e.type === 'tool_completed' || e.type === 'tool_failed'
  ).length;
  const progress = totalTools > 0 ? Math.round((completedTools / totalTools) * 100) : 0;

  // Get current todos
  const latestTodosEvent = events.filter((e) => e.type === 'todos_updated').slice(-1)[0];
  const todos = (latestTodosEvent?.data?.todos as { status: string; content: string }[]) || [];
  const activeTodos = todos.filter((todo) => todo.status === 'in_progress');
  const completedTodos = todos.filter((todo) => todo.status === 'completed');

  if (!isActive && events.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'bg-muted/30 rounded-lg p-3 space-y-2 text-xs border-l-2',
      isActive ? 'border-l-blue-500' : 'border-l-gray-300',
      className
    )}>
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isActive ? (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="font-medium text-blue-700">Agent Working</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="font-medium text-green-700">Completed</span>
            </div>
          )}
        </div>

        {totalTools > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{completedTools}/{totalTools} tools</span>
            {progress > 0 && (
              <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current Thought */}
      {currentThought && isActive && (
        <div className="flex items-start gap-2 p-2 bg-purple-50 rounded border-l-2 border-l-purple-300">
          <Brain className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
          <span className="text-purple-700 italic">{currentThought}</span>
        </div>
      )}

      {/* Active Tasks */}
      {activeTodos.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-blue-500" />
            <span className="font-medium text-blue-700">Current Tasks</span>
          </div>
          {activeTodos.slice(0, 3).map((todo, index: number) => (
            <div key={index} className="flex items-center gap-2 pl-4">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-600">{todo.content}</span>
            </div>
          ))}
          {activeTodos.length > 3 && (
            <div className="pl-4 text-muted-foreground">
              +{activeTodos.length - 3} more tasks...
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {recentEvents.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-gray-500" />
            <span className="font-medium text-gray-700">Recent Activity</span>
          </div>
          <div className="space-y-1">
            {recentEvents.map((event, index) => (
              <div key={index} className="flex items-center gap-2 pl-4">
                {getEventIcon(event.type)}
                <span className="flex-1 truncate">
                  {getEventLabel(event.type)}
                  {event.type === 'research_findings' && event.data?.findings &&
                    ` (${(event.data.findings as unknown[]).length} items found)`
                  }
                  {event.type === 'todos_updated' && event.data?.todos &&
                    ` (${(event.data.todos as unknown[]).length} tasks)`
                  }
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatTime(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks Summary */}
      {completedTodos.length > 0 && !isActive && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span>Completed {completedTodos.length} task{completedTodos.length === 1 ? '' : 's'}</span>
        </div>
      )}
    </div>
  );
};

export default InlineAgentActivity;
