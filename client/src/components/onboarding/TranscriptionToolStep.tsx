
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/context/OnboardingContext';
import { Mic } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const TranscriptionToolStep = () => {
  const { onboardingData, updateTranscriptionTool, nextStep, prevStep } = useOnboarding();

  const handleSelectTool = (value: 'fireflies' | 'otter.ai') => {
    updateTranscriptionTool(value);
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Mic size={24} />
            </div>
          </div>
          <CardTitle className="text-xl text-center">Choose Transcription Tool</CardTitle>
          <CardDescription className="text-center">
            Select the transcription and note-taking tool you use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={onboardingData.transcriptionTool || undefined} 
            onValueChange={(value) => handleSelectTool(value as 'fireflies' | 'otter.ai')}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2 border dark:border-input p-4 rounded-md">
              <RadioGroupItem value="fireflies" id="fireflies" />
              <Label htmlFor="fireflies" className="flex-1 cursor-pointer">
                <div className="font-medium text-foreground">Fireflies.ai</div>
                <div className="text-sm text-muted-foreground">
                  Automatically record, transcribe, and get insights from your meetings
                </div>
              </Label>
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center space-x-2 border dark:border-input p-4 rounded-md opacity-50 cursor-not-allowed">
                  <RadioGroupItem value="otter.ai" id="otter" disabled />
                  <Label htmlFor="otter" className="flex-1">
                    <div className="font-medium text-foreground">Otter.ai</div>
                    <div className="text-sm text-muted-foreground">
                      Generate real-time meeting notes with AI assistance
                    </div>
                  </Label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coming soon!</p>
              </TooltipContent>
            </Tooltip>
          </RadioGroup>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={prevStep}>
            Back
          </Button>
          <Button 
            type="button" 
            onClick={nextStep} 
            disabled={!onboardingData.transcriptionTool}
          >
            Continue
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TranscriptionToolStep;
