import type { MeetingTypeResponseAnalysisMetadataStructure } from '@/api/generated/models/meetingTypeResponseAnalysisMetadataStructure';
import { useEffect, useState } from 'react';
import { SchemaPropertyEditor } from './SchemaPropertyEditor';
import AnalysisHeaderList from './meeting-type/AnalysisHeaderList';

interface MetadataSchemaEditorProps {
  value: MeetingTypeResponseAnalysisMetadataStructure;
  onChange: (value: MeetingTypeResponseAnalysisMetadataStructure) => void;
  onValidationError: (hasError: boolean) => void;
}

const MetadataSchemaEditor = ({
  value,
  onChange,
  onValidationError
}: MetadataSchemaEditorProps): JSX.Element => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [properties, setProperties] = useState<{ name: string; description: string }[]>([]);

  // Update properties when value changes
  useEffect(() => {
    const newProperties = value && typeof value === 'object'
      ? Object.entries(value).map(([name, description]: [string, string]) => ({
          name,
          description: description || ''
        }))
      : [];
    setProperties(newProperties);
  }, [value]);

  // Handle selected index changes
  useEffect(() => {
    if (properties.length > 0 && selectedIndex === null) {
      setSelectedIndex(0);
    } else if (properties.length === 0) {
      setSelectedIndex(null);
    } else if (selectedIndex !== null && selectedIndex >= properties.length) {
      setSelectedIndex(properties.length - 1);
    }
  }, [properties.length, selectedIndex]);

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
      onChange(metadataStructure);
      onValidationError(false);
    } catch (err) {
      console.error('Error updating metadata structure:', err);
      onValidationError(true);
    }
  };

  const handleAddProperty = (): void => {
    const newProperties = [...properties, { name: 'New Property', description: '' }];
    handlePropertiesChange(newProperties);
    // Set selected index after state update
    setTimeout(() => {
      setSelectedIndex(newProperties.length - 1);
    }, 0);
  };

  const handlePropertyChange = (newProps: { name: string; description: string }[]): void => {
    if (selectedIndex === null) {return;}

    const updatedProperties = [...properties];
    updatedProperties[selectedIndex] = newProps[0];
    handlePropertiesChange(updatedProperties);
  };

  const handleDeleteProperty = (indexToDelete: number): void => {
    const newProperties = properties.filter((_, index) => index !== indexToDelete);
    handlePropertiesChange(newProperties);
  };

  return (
    <div className="flex border border-border rounded-lg overflow-hidden bg-background shadow-sm max-h-[550px]">
      <AnalysisHeaderList
        properties={properties}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onAdd={handleAddProperty}
        onDelete={handleDeleteProperty}
      />

      <div className="flex-1 bg-gradient-to-br from-muted/50 to-background border-l border-border">
        {selectedIndex !== null && properties[selectedIndex] ? (
          <div className="h-full p-6">
            <SchemaPropertyEditor
              properties={[properties[selectedIndex]]}
              onChange={handlePropertyChange}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-foreground mb-2">No Property Selected</p>
              <p className="text-sm text-muted-foreground">Select an analysis header from the left panel or create a new one to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetadataSchemaEditor;
