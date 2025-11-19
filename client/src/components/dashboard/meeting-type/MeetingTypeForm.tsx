import { useMeetingTypesControllerGenerateAnalysisTopics } from '@/api/generated/knowtedAPI';
import type { MeetingTypeResponse } from '@/api/generated/models/meetingTypeResponse';
import type { MeetingTypeResponseAnalysisMetadataStructure } from '@/api/generated/models/meetingTypeResponseAnalysisMetadataStructure';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import { Loader2, Wand2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import AnalysisHeaderList from './AnalysisHeaderList';

interface MeetingTypeFormProps {
  onSubmit: (data: Partial<MeetingTypeResponse>) => void;
  onClose: () => void;
  meetingType?: MeetingTypeResponse;
  isLoading: boolean;
}

const MeetingTypeForm = ({
  onSubmit,
  onClose,
  meetingType,
  isLoading
}: MeetingTypeFormProps): JSX.Element => {
  const { organization } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const [metadataStructure, setMetadataStructure] = useState<MeetingTypeResponseAnalysisMetadataStructure>({});
  const [hasValidationError, setHasValidationError] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [properties, setProperties] = useState<{ name: string; description: string }[]>([]);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [userClosedPanel, setUserClosedPanel] = useState(false);
  const generateAnalysisTopicsMutation = useMeetingTypesControllerGenerateAnalysisTopics();

  useEffect(() => {
    if (meetingType) {
      setFormData({
        name: meetingType.name || '',
        description: meetingType.description || ''
      });
      setMetadataStructure(meetingType.analysis_metadata_structure || {});
    } else {
      setFormData({
        name: '',
        description: ''
      });
      setMetadataStructure({});
    }
    setHasValidationError(false);
  }, [meetingType]);

  // Update properties when metadataStructure changes
  useEffect(() => {
    const newProperties = metadataStructure && typeof metadataStructure === 'object'
      ? Object.entries(metadataStructure).map(([name, description]: [string, string]) => ({
          name,
          description: description || ''
        }))
      : [];
    setProperties(newProperties);
  }, [metadataStructure]);

  // Handle selected index changes
  useEffect(() => {
    if (properties.length > 0 && selectedIndex === null && !userClosedPanel) {
      setSelectedIndex(0);
    } else if (properties.length === 0) {
      setSelectedIndex(null);
      setUserClosedPanel(false);
    } else if (selectedIndex !== null && selectedIndex >= properties.length) {
      setSelectedIndex(properties.length - 1);
    }
  }, [properties.length, selectedIndex, userClosedPanel]);

  // Reset scroll flag after scrolling
  useEffect((): (() => void) | void => {
    if (shouldScrollToBottom) {
      const timer = setTimeout(() => {
        setShouldScrollToBottom(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldScrollToBottom]);

  const handleMetadataChange = (newMetadata: MeetingTypeResponseAnalysisMetadataStructure): void => {
    setMetadataStructure(newMetadata);
  };

  const handlePropertiesChange = (newProperties: { name: string; description: string }[]): void => {
    try {
      // Filter out empty properties
      const validProperties = newProperties.filter((prop) => prop.name.trim() !== '');

      // Convert the array of properties back to a key-description object
      const metadataStructure = validProperties.reduce((acc, prop) => {
        acc[prop.name] = prop.description;
        return acc;
      }, {} as MeetingTypeResponseAnalysisMetadataStructure);

      // Update local state first
      setProperties(newProperties);

      // Then notify parent component
      handleMetadataChange(metadataStructure);
      setHasValidationError(false);
    } catch (err) {
      console.error('Error updating metadata structure:', err);
      setHasValidationError(true);
    }
  };

  const handleAddProperty = (): void => {
    // Generate default name with incremental number
    const existingNames = properties.map((prop) => prop.name.toLowerCase());
    let counter = 1;
    let defaultName = `Untitled ${counter}`;

    // Find the next available number
    while (existingNames.includes(defaultName.toLowerCase())) {
      counter++;
      defaultName = `Untitled ${counter}`;
    }

    const newProperty = { name: defaultName, description: '' };
    const newProperties = [...properties, newProperty];
    handlePropertiesChange(newProperties);
    setSelectedIndex(newProperties.length - 1);
    setShouldScrollToBottom(true);
  };

  const handleDeleteProperty = (index: number): void => {
    const newProperties = properties.filter((_, i) => i !== index);
    handlePropertiesChange(newProperties);

    // Adjust selected index
    if (selectedIndex === index) {
      if (newProperties.length === 0) {
        setSelectedIndex(null);
      } else if (selectedIndex >= newProperties.length) {
        setSelectedIndex(newProperties.length - 1);
      }
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleGenerateAnalysisTopics = async (): Promise<void> => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Please fill in both name and description before generating analysis topics');
      return;
    }

    try {
      const response = await generateAnalysisTopicsMutation.mutateAsync({
        data: {
          meeting_type: formData.name,
          meeting_type_description: formData.description,
          organisation: 'Grayza',
          organisation_about: 'Grayza a QR code ordering software for restaurants'
        },
        params: {
          organization_id: organization?.id || ''
        }
      });

      if (response?.analysis_metadata_structure) {
        const newMetadataStructure = response.analysis_metadata_structure;
        setMetadataStructure(newMetadataStructure);

        // Convert to properties format
        const newProperties = Object.entries(newMetadataStructure).map(([name, description]) => ({
          name,
          description: String(description || '')
        }));
        setProperties(newProperties);

        // Select the first topic
        if (newProperties.length > 0) {
          setSelectedIndex(0);
          setUserClosedPanel(false);
        }

        toast.success(`Generated ${newProperties.length} analysis topics!`);
      }
    } catch (error) {
      console.error('Error generating analysis topics:', error);
      toast.error('Failed to generate analysis topics. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    onSubmit({
      ...meetingType,
      name: formData.name,
      description: formData.description,
      analysis_metadata_structure: metadataStructure
    });
  };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Left side - Form fields */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Basic Information Section */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Sales Call, Team Standup"
                  className="h-9 border-border focus:border-primary focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value
                    }))
                  }
                  placeholder="Describe the purpose of this meeting type"
                  className="min-h-[60px] resize-none border-border focus:border-primary focus:ring-primary"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* AI Generation Section */}
          <div className="space-y-2">
            <div className="border-b border-border pb-2">
              <h3 className="text-base font-semibold text-foreground mb-1">AI Analysis Topics Generator</h3>
              <p className="text-xs text-muted-foreground">Generate analysis topics automatically based on your meeting type description</p>
            </div>

            <div className={`bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 transition-all duration-200 ${generateAnalysisTopicsMutation.isPending ? 'opacity-75' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Generate Analysis Topics
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAnalysisTopics}
                  disabled={generateAnalysisTopicsMutation.isPending || !formData.name.trim() || !formData.description.trim()}
                  className="h-8 px-3 text-xs border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                >
                  {generateAnalysisTopicsMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Topics'
                  )}
                </Button>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                {generateAnalysisTopicsMutation.isPending
                  ? 'AI is analyzing your meeting type description and generating analysis topics...'
                  : 'AI will analyze your meeting type description and generate 15-25 relevant analysis topics automatically.'
                }
              </p>
            </div>
          </div>

          {/* Property Details Section */}
          <div className="space-y-2">
            <div className="border-b border-border pb-2">
              <h3 className="text-base font-semibold text-foreground mb-1">Analysis Topic Configuration</h3>
              <p className="text-xs text-muted-foreground">Configure the selected analysis topic from the right panel</p>
            </div>

            {selectedIndex !== null && properties[selectedIndex] ? (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Editing: {properties[selectedIndex].name || 'Untitled'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedIndex(null);
                      setUserClosedPanel(true);
                    }}
                    className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Topic Name
                  </Label>
                  <Input
                    value={properties[selectedIndex].name}
                    onChange={(e) => {
                      const newProperties = [...properties];
                      newProperties[selectedIndex] = { ...newProperties[selectedIndex], name: e.target.value };
                      handlePropertiesChange(newProperties);
                    }}
                    placeholder="e.g., Timeline, Key Points, Action Items"
                    className="h-9 border-gray-300 dark:border-gray-600 focus:border-gray-500 focus:ring-gray-500 bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Topic Description
                  </Label>
                  <Textarea
                    value={properties[selectedIndex].description}
                    onChange={(e) => {
                      const newProperties = [...properties];
                      newProperties[selectedIndex] = { ...newProperties[selectedIndex], description: e.target.value };
                      handlePropertiesChange(newProperties);
                    }}
                    placeholder="Describe what information should be extracted from meetings for this topic..."
                    className="min-h-[120px] resize-none border-gray-300 dark:border-gray-600 focus:border-gray-500 focus:ring-gray-500 bg-background"
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">No Topic Selected</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Click on any analysis topic from the right panel to configure it</p>
                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>Select from right panel</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Headers list */}
        <div className="w-[320px] border-l border-border">
          <AnalysisHeaderList
            properties={properties}
            selectedIndex={selectedIndex}
            onSelect={(index) => {
              setSelectedIndex(index);
              setUserClosedPanel(false);
            }}
            onAdd={handleAddProperty}
            onDelete={handleDeleteProperty}
            shouldScrollToBottom={shouldScrollToBottom}
          />
        </div>
      </div>

      <DialogFooter className="flex-none pt-3 border-t border-border -mx-6 px-6">
        <Button type="button" variant="outline" onClick={onClose} className="h-8 px-4 text-sm">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || hasValidationError}
          className="h-8 px-4 text-sm"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default MeetingTypeForm;
