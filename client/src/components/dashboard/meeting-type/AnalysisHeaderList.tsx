import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface AnalysisHeaderListProps {
  properties: { name: string; description: string }[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
  shouldScrollToBottom?: boolean;
}

const AnalysisHeaderList = ({
  properties,
  selectedIndex,
  onSelect,
  onAdd,
  onDelete,
  shouldScrollToBottom = false
}: AnalysisHeaderListProps): JSX.Element => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleAddClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    onAdd();
  };

  // Auto-scroll to bottom when shouldScrollToBottom is true
  useEffect(() => {
    if (shouldScrollToBottom && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [shouldScrollToBottom, properties.length]);

  return (
    <div className="w-[320px] bg-background border-r border-border flex flex-col flex-shrink-0 h-full">
      <div className="p-3 border-b border-border bg-gradient-to-r from-primary/10 to-primary/20">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 bg-background hover:bg-primary/10 border-primary/30 text-primary hover:text-primary/80 hover:border-primary/50 shadow-sm text-xs"
          onClick={handleAddClick}
          type="button"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Analysis Topic
        </Button>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 h-0">
        <div className="p-3 space-y-2 bg-white dark:bg-background">
          {properties.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <div className="w-10 h-10 mx-auto mb-2 bg-muted rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium text-foreground mb-1">No Topics Yet</p>
              <p className="text-xs text-muted-foreground">Create your first analysis topic to get started</p>
            </div>
          ) : (
            properties.map((property, index) => (
              <div
                key={index}
                className={cn(
                  'group relative overflow-hidden transition-all duration-200 ease-in-out w-[290px]',
                  'border rounded-lg shadow-sm',
                  selectedIndex === index
                    ? 'ring-2 ring-primary ring-opacity-50 border-primary/50 bg-gradient-to-r from-primary/10 to-primary/20 shadow-md'
                    : 'border-border bg-background hover:shadow-md hover:border-border hover:bg-accent'
                )}
              >
                <div className="flex items-center min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelect(index);
                    }}
                    className={cn(
                      'flex-1 text-left px-3 py-3 flex items-center gap-2 transition-all duration-200 min-w-0',
                      'hover:bg-primary/10 rounded-l-lg',
                      selectedIndex === index && 'bg-primary/5'
                    )}
                  >

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <span className={cn(
                        'text-xs font-medium truncate block transition-colors duration-200 w-full',
                        selectedIndex === index
                          ? 'text-primary font-semibold'
                          : 'text-foreground group-hover:text-foreground'
                      )}>
                        {property.name || 'Untitled'}
                      </span>

                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(index);
                    }}
                    className={cn(
                      'px-3 py-3 transition-all duration-200 flex-shrink-0 rounded-r-lg',
                      'hover:bg-red-50 hover:text-red-600 hover:border-l hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-700',
                      'text-muted-foreground hover:text-red-600 dark:hover:text-red-400',
                      selectedIndex === index && 'hover:bg-red-100 dark:hover:bg-red-900/30'
                    )}
                    title="Delete analysis topic"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AnalysisHeaderList;
