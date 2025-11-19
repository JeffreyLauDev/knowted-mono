import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

export type FeedbackType = 'thumbs_up' | 'thumbs_down';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedbackType: FeedbackType;
  messageId: string | number;
  onSubmit: (feedback: {
    messageId: string | number;
    type: FeedbackType;
    issueType?: string;
    details?: string;
    correction?: string;
  }) => void;
}

const ISSUE_TYPES = [
  'Incorrect information',
  'Not helpful',
  'Too verbose',
  'Too brief',
  'Off-topic',
  'Harmful or unsafe',
  'Other'
];

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  open,
  onOpenChange,
  feedbackType,
  messageId,
  onSubmit
}) => {
  const [issueType, setIssueType] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [correction, setCorrection] = useState<string>('');

  const handleSubmit = (): void => {
    onSubmit({
      messageId,
      type: feedbackType,
      issueType: feedbackType === 'thumbs_down' ? issueType : undefined,
      details: details.trim() || undefined,
      correction: correction.trim() || undefined
    });
    // Reset form
    setIssueType('');
    setDetails('');
    setCorrection('');
    onOpenChange(false);
  };

  const handleCancel = (): void => {
    setIssueType('');
    setDetails('');
    setCorrection('');
    onOpenChange(false);
  };

  const isThumbsDown = feedbackType === 'thumbs_down';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Feedback</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isThumbsDown && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                What type of issue do you wish to report? (optional)
              </label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Please provide details: (optional)
            </label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={
                isThumbsDown
                  ? 'What was unsatisfying about this response?'
                  : 'What was satisfying about this response?'
              }
              className="min-h-[100px] resize-none"
            />
          </div>

          {isThumbsDown && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Correction (optional)
              </label>
              <Textarea
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="What should the correct answer be?"
                className="min-h-[100px] resize-none"
              />
            </div>
          )}

          <DialogDescription className="text-xs text-muted-foreground">
            Submitting this report will send the entire current conversation to
            Knowted for future improvements to our models.{' '}
            <a
              href="https://knowted.io/privacyimage.png"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Learn More
            </a>
          </DialogDescription>
        </div>

        <DialogFooter className="flex-col">
          <Button
            onClick={handleSubmit}
            className="w-full"
            variant="default"
          >
            Submit
          </Button>
          <Button
            onClick={handleCancel}
            className="w-full"
            variant="outline"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;

