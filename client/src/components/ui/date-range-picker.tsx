
import { format, startOfDay, subDays, subWeeks } from 'date-fns';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  className?: string
  selected?: DateRange
  onSelect?: (range: DateRange | undefined) => void
  onClose?: () => void
}

type SelectionState = 'from' | 'to' | 'complete'

export const DateRangePicker = ({
  className,
  selected,
  onSelect,
  onClose
}: DateRangePickerProps) => {
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(selected);
  const [selectionState, setSelectionState] = React.useState<SelectionState>('from');

  // Quick date range presets
  const quickRanges = [
    {
      label: 'Today',
      range: {
        from: startOfDay(new Date()),
        to: startOfDay(new Date())
      }
    },
    {
      label: '3 days ago',
      range: {
        from: startOfDay(subDays(new Date(), 3)),
        to: startOfDay(new Date())
      }
    },
    {
      label: 'Last week',
      range: {
        from: startOfDay(subWeeks(new Date(), 1)),
        to: startOfDay(new Date())
      }
    },
    {
      label: '2 weeks ago',
      range: {
        from: startOfDay(subWeeks(new Date(), 2)),
        to: startOfDay(new Date())
      }
    },
    {
      label: 'Last 30 days',
      range: {
        from: startOfDay(subDays(new Date(), 30)),
        to: startOfDay(new Date())
      }
    }
  ];

  const handleQuickSelect = (range: DateRange) => {
    setTempRange(range);
    setSelectionState(range.from && range.to ? 'complete' : 'from');
    onSelect?.(range);
    onClose?.();
  };

  // Update temp range when selected prop changes
  React.useEffect(() => {
    setTempRange(selected);
    if (selected?.from && selected?.to) {
      setSelectionState('complete');
    } else if (selected?.from) {
      setSelectionState('to');
    } else {
      setSelectionState('from');
    }
  }, [selected]);

  return (
    <div className={cn('grid gap-2', className)}>
      {/* Quick access buttons */}
      <div className="flex flex-wrap gap-1 p-2 border-b">
        {quickRanges.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => handleQuickSelect(preset.range)}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={() => handleQuickSelect({ from: undefined, to: undefined })}
        >
          Clear
        </Button>
      </div>

      {/* Calendar */}
      <Calendar
        initialFocus
        mode="single"
        defaultMonth={tempRange?.from ? new Date(tempRange.from.getFullYear(), tempRange.from.getMonth() - 1) : new Date(new Date().getFullYear(), new Date().getMonth() - 1)}
        selected={tempRange?.from}
        toMonth={new Date()}
        onSelect={(date) => {
          if (!date) {return;}

          if (selectionState === 'from') {
            // First click: set from date
            const newRange = { from: date, to: undefined };
            setTempRange(newRange);
            setSelectionState('to');
            onSelect?.(newRange);
          } else if (selectionState === 'to') {
            // Second click: set to date
            if (tempRange?.from) {
              const fromDate = tempRange.from;
              const toDate = date;

              // Ensure from date is before to date
              const finalRange = fromDate <= toDate
                ? { from: fromDate, to: toDate }
                : { from: toDate, to: fromDate };

              setTempRange(finalRange);
              setSelectionState('complete');
              onSelect?.(finalRange);
            }
          } else if (selectionState === 'complete') {
            // Third click: start new selection
            const newRange = { from: date, to: undefined };
            setTempRange(newRange);
            setSelectionState('to');
            onSelect?.(newRange);
          }
        }}
        modifiers={{
          selected: tempRange?.from,
          range_start: tempRange?.from,
          range_end: tempRange?.to,
          in_range: tempRange?.from && tempRange?.to ?
            (date: Date) => {
              if (!tempRange.from || !tempRange.to) {return false;}
              return date > tempRange.from && date < tempRange.to;
            } : undefined
        }}
        modifiersClassNames={{
          selected: '!bg-primary !text-primary-foreground rounded-md',
          range_start: '!bg-primary !text-primary-foreground rounded-l-md',
          range_end: '!bg-primary !text-primary-foreground rounded-r-md',
          in_range: '!bg-primary/20 !text-primary-foreground rounded-none'
        }}
        numberOfMonths={2}
        className="p-3 pointer-events-auto"
      />

      {/* Selected range display */}
      {tempRange?.from && (
        <div className="px-3 pb-2 text-sm text-muted-foreground border-t pt-2">
          <div className="flex items-center justify-between">
            <span>
              {tempRange.from && format(tempRange.from, 'MMM dd, yyyy')}
              {tempRange.to && ` - ${format(tempRange.to, 'MMM dd, yyyy')}`}
              {tempRange.from && !tempRange.to && (
                <span className="text-primary font-medium">
                  {' '}- Click to select end date
                </span>
              )}
            </span>
            {selectionState === 'complete' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => {
                  setTempRange(undefined);
                  setSelectionState('from');
                  onSelect?.(undefined);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
