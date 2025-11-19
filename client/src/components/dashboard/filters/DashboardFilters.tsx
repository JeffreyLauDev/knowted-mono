import MeetingFilters from '../MeetingFilters';

interface DashboardFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  meetingTypes: { id: string; name: string }[];
}

const DashboardFilters = ({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  setDateRange,
  meetingTypes
}: DashboardFiltersProps): JSX.Element => {
  const handleFilterTypeChange = (type: string) => {
    console.warn('🎛️ DashboardFilters: Filter type change received', {
      oldType: filterType,
      newType: type,
      timestamp: new Date().toISOString()
    });
    setFilterType(type);
  };

  return (
    <div className="p-2 bg-white dark:bg-background border-b">
      <MeetingFilters
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filterType={filterType}
        onFilterTypeChange={handleFilterTypeChange}
        onDateRangeChange={setDateRange}
        meetingTypes={meetingTypes}
      />
    </div>
  );
};

export default DashboardFilters;
