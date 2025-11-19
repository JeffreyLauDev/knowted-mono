import {
    Brain,
    Calculator,
    CheckCircle,
    Database,
    Loader2,
    MessageSquare,
    Search,
    XCircle,
    Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { AgentEvent, AgentState } from '../../hooks/useAgentEvents';
import { useStreamingAgent } from '../../hooks/useStreamingAgent';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';

const toolIcons: Record<string, React.ReactNode> = {
  search_meetings: <Search className="h-4 w-4" />,
  search_knowledge_base: <Database className="h-4 w-4" />,
  calculator: <Calculator className="h-4 w-4" />,
  analyze_meeting_query: <Brain className="h-4 w-4" />,
  get_meeting_details: <MessageSquare className="h-4 w-4" />,
};

interface StreamingAgentChatProps {
  onResponse?: (response: any) => void;
}

export function StreamingAgentChat({ onResponse }: StreamingAgentChatProps) {
  const [message, setMessage] = useState('');
  const [eventLog, setEventLog] = useState<AgentEvent[]>([]);

  const {
    isConnected,
    isProcessing,
    startAgent,
    cancelAgent,
    currentState,
    progress,
    currentThought,
    activeTools,
    events,
    finalResponse,
  } = useStreamingAgent({
    onEvent: (event) => {
      setEventLog(prev => [...prev, event]);
    },
    onStateChange: (state: AgentState) => {
          },
    onComplete: (response) => {
      onResponse?.(response);
    },
    onError: (error) => {
      console.error('Agent error:', error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isProcessing) return;

    await startAgent(message);
    setMessage('');
  };

  const handleCancel = () => {
    cancelAgent();
  };

  const getStatusColor = () => {
    if (!isConnected) return 'bg-red-500';
    if (isProcessing) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (isProcessing) return 'Processing';
    return 'Ready';
  };

  const formatTime = (timestamp: string | null | undefined): string => {
    if (!timestamp) return 'Invalid time';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      return date.toLocaleTimeString();
    } catch {
      return 'Invalid time';
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        {isProcessing && (
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* Chat Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Deep Agent Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask me anything about your meetings..."
              disabled={isProcessing || !isConnected}
            />
            <Button 
              type="submit" 
              disabled={isProcessing || !isConnected || !message.trim()}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Agent Status */}
      {currentState && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agent Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {currentState.completedSteps}/{currentState.totalSteps} steps
              </span>
            </div>
            <Progress value={progress} className="w-full" />
            
            {currentThought && (
              <div className="bg-muted p-3 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4" />
                  <span className="text-sm font-medium">Current Thought</span>
                </div>
                <p className="text-sm text-muted-foreground">{currentThought}</p>
              </div>
            )}

            {activeTools.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Active Tools</p>
                <div className="flex flex-wrap gap-2">
                  {activeTools.map((tool, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {toolIcons[tool] || <Loader2 className="h-3 w-3 animate-spin" />}
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Real-time Events</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {events.map((event, index) => (
                <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                  <div className="flex-shrink-0 mt-1">
                    {event.type === 'agent_completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {event.type === 'agent_failed' && <XCircle className="h-4 w-4 text-red-500" />}
                    {event.type === 'tool_started' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    {event.type === 'tool_completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {event.type === 'agent_thinking' && <Brain className="h-4 w-4 text-purple-500" />}
                    {!['agent_completed', 'agent_failed', 'tool_started', 'tool_completed', 'agent_thinking'].includes(event.type) && 
                      <div className="h-4 w-4 rounded-full bg-gray-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {event.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    {event.message && (
                      <p className="text-sm text-muted-foreground">{event.message}</p>
                    )}
                    {event.toolName && (
                      <div className="flex items-center gap-1 mt-1">
                        {toolIcons[event.toolName]}
                        <span className="text-xs font-medium">{event.toolName}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No events yet. Start a conversation to see real-time updates.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Final Response */}
      {finalResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Final Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p>{finalResponse.finalMessage || finalResponse.message}</p>
              
              {finalResponse.references && finalResponse.references.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">References</h4>
                  <div className="space-y-2">
                    {finalResponse.references.map((ref: any, index: number) => (
                      <div key={index} className="p-2 border rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{ref.type}</Badge>
                          <span className="font-medium">{ref.title}</span>
                        </div>
                        {ref.description && (
                          <p className="text-sm text-muted-foreground">{ref.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
