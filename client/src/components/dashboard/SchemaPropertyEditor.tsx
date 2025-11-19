
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SchemaProperty {
  name: string;
  description: string;
}

interface SchemaPropertyEditorProps {
  properties: SchemaProperty[];
  onChange: (properties: SchemaProperty[]) => void;
}

export const SchemaPropertyEditor = ({ properties, onChange }: SchemaPropertyEditorProps) => {
  // Handle case when properties array is empty
  if (!properties.length) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center text-gray-500 border border-dashed rounded-lg bg-gray-50">
        <div>
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">No Property Selected</p>
          <p className="text-sm text-gray-600">Please add or select a property to edit</p>
        </div>
      </div>
    );
  }

  const property = properties[0];

  const updateProperty = (field: keyof SchemaProperty, value: string) => {
    const newProperties = [{ ...property, [field]: value }];
    onChange(newProperties);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-semibold text-gray-900">Edit Analysis Header</h3>
        <p className="text-sm text-gray-600 mt-1">Configure the properties and description for this analysis header</p>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            Header Name
          </Label>
          <Input
            value={property.name}
            onChange={(e) => updateProperty('name', e.target.value)}
            placeholder="e.g., Timeline, Key Points, Action Items"
            className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
          />
          <p className="text-xs text-gray-500">This name will appear in the analysis results</p>
        </div>
        
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            Description
          </Label>
          <Textarea
            value={property.description}
            onChange={(e) => updateProperty('description', e.target.value)}
            placeholder="Describe what information should be extracted from meetings for this header..."
            className="min-h-[180px] resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm leading-relaxed"
          />
          <p className="text-xs text-gray-500">Provide clear guidance on what should be captured under this header</p>
        </div>
      </div>
    </div>
  );
};
