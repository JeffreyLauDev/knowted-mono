import type { AiConversationHistoriesResponseDtoReferenceItem } from '@/api/generated/models';
import { cn } from '@/lib/utils';
import { BookOpen, Calendar, Database, FileText, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ReferencesDisplayProps {
  references: AiConversationHistoriesResponseDtoReferenceItem[];
  className?: string;
  showInlineReferences?: boolean;
  sessionId?: string;
}

const ReferencesDisplay: React.FC<ReferencesDisplayProps> = ({
  references,
  className,
  showInlineReferences = true,
  sessionId
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const handleReferenceClick = (reference: AiConversationHistoriesResponseDtoReferenceItem): void => {
    if (reference.id && reference.id !== 'unknown') {
      switch (reference.type) {
        case 'meeting':
          // Navigate to meeting detail, maintaining session context if available
          if (sessionId) {
            navigate(`/dashboard/sessions/${sessionId}/meetings/${reference.id}`);
          } else {
            navigate(`/dashboard/meetings/${reference.id}`);
          }
          break;
      }
    }
  };

  if (!references || references.length === 0) {
    return null;
  }

  const getIconForType = (type: string): JSX.Element => {
    switch (type) {
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'knowledge_base':
        return <Database className="h-4 w-4" />;
      case 'meeting_type':
        return <Users className="h-4 w-4" />;
      case 'report_type':
        return <FileText className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'meeting':
        return 'Meeting';
      case 'knowledge_base':
        return 'Knowledge Base';
      case 'meeting_type':
        return 'Meeting Type';
      case 'report_type':
        return 'Report Type';
      default:
        return 'Source';
    }
  };

  const getSourceColor = (source: string): string => {
    if (source.includes('Search')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    }
    if (source.includes('Details')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    }
    if (source.includes('Knowledge')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <div className={cn('mt-4 border-t pt-4 pb-8', className)}>
      {/* References Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Sources ({references.length})
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      </div>

      {/* Inline Reference Pills (like "Vapi +1") */}
      {showInlineReferences && (
        <div className="flex flex-wrap gap-2 mb-3">
          {references.slice(0, 3).map((reference, index) => (
            <div
              key={`inline-${reference.id}-${index}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/50 border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer group"
              onClick={() => handleReferenceClick(reference)}
            >
              <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center">
                {getIconForType(reference.type)}
              </div>
              <span className="group-hover:text-foreground transition-colors">
                {getTypeLabel(reference.type)}
              </span>
              <Plus className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-xs font-bold text-primary">
                {index + 1}
              </span>
            </div>
          ))}
          {references.length > 3 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/50 border text-xs font-medium text-muted-foreground">
              <span>+{references.length - 3} more</span>
            </div>
          )}
        </div>
      )}

      {/* References List */}
      <div className="space-y-2">
        {references.slice(0, isExpanded ? references.length : 2).map((reference, index) => (
          <div
            key={`${reference.id}-${index}`}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => handleReferenceClick(reference)}
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                {getIconForType(reference.type)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="text-sm font-medium text-foreground line-clamp-2">
                  {reference.title}
                </h4>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Relevance Score */}
                  {reference.relevance && (
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                      {Math.round(reference.relevance * 100)}%
                    </span>
                  )}
                  {/* Source Tag */}
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full font-medium',
                    getSourceColor(reference.source || '')
                  )}>
                    {reference.source}
                  </span>
                </div>
              </div>

              {/* Type and ID */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {getIconForType(reference.type || '')}
                  {getTypeLabel(reference.type || '')}
                </span>
                {reference.id && reference.id !== 'unknown' && (
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                    {reference.id.slice(0, 8)}...
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More Button */}
      {!isExpanded && references.length > 2 && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full mt-3 text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2 rounded-lg border border-dashed hover:border-primary/50"
        >
          +{references.length - 2} more sources
        </button>
      )}
    </div>
  );
};

export default ReferencesDisplay;
