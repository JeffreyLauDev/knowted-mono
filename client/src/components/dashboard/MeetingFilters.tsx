import type { MeetingTypeResponse } from '@/api/generated/models/meetingTypeResponse';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Search, X } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

interface MeetingFiltersProps {
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  filterType?: string;
  onFilterTypeChange?: (type: string) => void;
  onDateRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
  meetingTypes: MeetingTypeResponse[];
}

const MeetingFilters = ({
  searchQuery = '',
  onSearchQueryChange,
  filterType = 'all',
  onFilterTypeChange,
  onDateRangeChange,
  meetingTypes
}: MeetingFiltersProps): JSX.Element => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handleDateRangeSelect = (range: DateRange | undefined): void => {
    setDateRange(range || { from: undefined, to: undefined });
    if (onDateRangeChange) {
      onDateRangeChange({ 
        from: range?.from || undefined, 
        to: range?.to || undefined 
      });
    }
  };

  const handleResetDateRange = (): void => {
    const resetRange = { from: undefined, to: undefined };
    setDateRange(resetRange);
    if (onDateRangeChange) {
      onDateRangeChange(resetRange);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange?.(e.target.value)}
            className="pl-9 w-full bg-background/50"
          />
        </div>

        <Select
          value={filterType}
          onValueChange={(value) => {
            console.warn('🔄 MeetingFilters: Filter type changed', {
              oldValue: filterType,
              newValue: value,
              timestamp: new Date().toISOString()
            });
            onFilterTypeChange?.(value);
          }}
        >
          <SelectTrigger className="w-full bg-background/50">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {meetingTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'flex-1 justify-start text-left font-normal bg-background/50',
                  !dateRange.from && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    `${dateRange.from?.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                  ) : (
                    dateRange.from.toLocaleDateString()
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DateRangePicker
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                onClose={() => setIsDatePickerOpen(false)}
              />
            </PopoverContent>
          </Popover>

          {dateRange.from && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleResetDateRange}
              className="bg-background/50"
              title="Reset date range"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingFilters;
