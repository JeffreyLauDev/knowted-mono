import {
  useMeetingTypesControllerCreate,
  useMeetingTypesControllerFindAll,
  useMeetingTypesControllerUpdate
} from '@/api/generated/knowtedAPI';
import type { MeetingTypeResponse } from '@/api/generated/models/meetingTypeResponse';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import { ListIcon, Pencil, Plus } from 'lucide-react';
import React, { useState } from 'react';
import MeetingTypeDialog from './meeting-type/MeetingTypeDialog';

type MeetingTypeManagerProps = Record<string, never>;

const MeetingTypeManager: React.FC<MeetingTypeManagerProps> = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeetingType, setEditingMeetingType] = useState<MeetingTypeResponse | undefined>();
  const { organization } = useAuth();

  const { data: meetingTypes, isLoading, refetch } = useMeetingTypesControllerFindAll(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );

  const createMutation = useMeetingTypesControllerCreate();
  const updateMutation = useMeetingTypesControllerUpdate();

  const handleSave = async (meetingType: Partial<MeetingTypeResponse>): Promise<void> => {
    try {
      if (editingMeetingType) {
        await updateMutation.mutateAsync({
          id: editingMeetingType.id,
          data: {
            name: meetingType.name || '',
            description: meetingType.description,
            analysis_metadata_structure: meetingType.analysis_metadata_structure
          },
          params: { organization_id: organization?.id || '' }
        });
        toast.success('Meeting type updated successfully');
      } else {
        await createMutation.mutateAsync({
          data: {
            name: meetingType.name || '',
            description: meetingType.description,
            analysis_metadata_structure: meetingType.analysis_metadata_structure
          },
          params: { organization_id: organization?.id || '' }
        });
        toast.success('Meeting type created successfully');
      }

      await refetch();
      setIsDialogOpen(false);
      setEditingMeetingType(undefined);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Error saving meeting type: ${errorMessage}`);
    }
  };

  const handleEdit = (meetingType: MeetingTypeResponse): void => {
    setEditingMeetingType(meetingType);
    setIsDialogOpen(true);
  };

  const meetingTypesList = Array.isArray(meetingTypes) ? meetingTypes : [];

  return (
    <div className="space-y-8">
      {/* Meeting Types Section */}
      <div>
        {/* Section Header */}
        <div className="py-6 px-4">
          <div className="flex flex-col gap-4">
            {/* Title and Add Button Row */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-1 sm:space-y-0">
                <h2 className="text-2xl font-bold text-foreground">All Meeting Types</h2>
                <span className="text-sm text-muted-foreground">
                  {meetingTypesList.length} type{meetingTypesList.length !== 1 ? 's' : ''} in your organization
                </span>
              </div>

              {/* Add Meeting Type - Desktop only */}
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="hidden sm:flex h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Type
              </Button>
            </div>
          </div>
        </div>

        {/* Meeting Types Table */}
        <div className="overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-md" />
                ))}
              </div>
            </div>
          ) : meetingTypesList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium">No meeting types found</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Create your first meeting type to organize your meetings and set analysis schemas.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table Layout */}
              <div className="hidden sm:block">
                <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-muted-foreground border-b border-border">
                  <div className="col-span-6">Meeting Type</div>
                  <div className="col-span-5">Description</div>
                  <div className="col-span-1"></div>
                </div>

                {meetingTypesList.map((type, index) => (
                  <div key={type.id} className={`grid grid-cols-12 gap-4 p-4 items-start transition-colors ${index < meetingTypesList.length - 1 ? 'border-b border-border' : ''}`}>
                    <div className="col-span-6">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <ListIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{type.name}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-5">
                      <div className="text-sm text-muted-foreground">
                        {type.description || 'No description provided'}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(type)}
                          className="h-8 w-8 p-0 hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile List Layout */}
              <div className="sm:hidden">
                {meetingTypesList.map((type, index) => (
                  <div key={type.id} className={`hover:bg-accent transition-colors ${index < meetingTypesList.length - 1 ? 'border-b border-border' : ''}`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <ListIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-foreground truncate">{type.name}</div>
                            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {type.description || 'No description provided'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-3 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(type)}
                            className="h-9 w-9 p-0 hover:bg-muted"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button */}
      <div className="sm:hidden fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Meeting Type Dialog */}
      <MeetingTypeDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingMeetingType(undefined);
        }}
        onSave={handleSave}
        meetingType={editingMeetingType}
      />
    </div>
  );
};

export default MeetingTypeManager;
