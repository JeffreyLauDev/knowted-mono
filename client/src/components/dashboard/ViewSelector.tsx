
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarDays, Calendar, List } from 'lucide-react';

type ViewType = 'list' | 'week' | 'month';

interface ViewSelectorProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const ViewSelector = ({ currentView, onViewChange }: ViewSelectorProps) => {
  return (
    <ToggleGroup type="single" value={currentView} onValueChange={(value) => onViewChange(value as ViewType)}>
      <ToggleGroupItem value="list" aria-label="List view">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="week" aria-label="Week view">
        <CalendarDays className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="month" aria-label="Month view">
        <Calendar className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ViewSelector;
