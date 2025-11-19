import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Plus, X } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import React, { useState } from 'react';

interface BulkEmailInputProps {
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  currentEmailInput?: string;
  onCurrentEmailInputChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  availableSeats?: number;
  isAtSeatLimit?: boolean;
}

interface EmailEntry {
  email: string;
  first_name: string;
  last_name: string;
}

export const BulkEmailInput: React.FC<BulkEmailInputProps> = ({
  emails,
  onEmailsChange,
  currentEmailInput: externalCurrentEmailInput,
  onCurrentEmailInputChange,
  placeholder = 'Type email and press Enter...',
  className = '',
  disabled = false,
  availableSeats,
  isAtSeatLimit
}) => {
  const [internalCurrentEmailInput, setInternalCurrentEmailInput] = useState('');
  const { toast } = useToast();

  // Use external state if provided, otherwise use internal state
  const currentEmailInput = externalCurrentEmailInput !== undefined
    ? externalCurrentEmailInput
    : internalCurrentEmailInput;
  const setCurrentEmailInput = onCurrentEmailInputChange || setInternalCurrentEmailInput;

  const parseEmailToEntry = (email: string): EmailEntry | null => {
    const trimmedEmail = email.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return null;
    }

    // Extract name from email
    const [localPart] = trimmedEmail.split('@');
    let firstName = localPart;
    let lastName = '';

    // Handle common email patterns
    if (localPart.includes('.')) {
      const parts = localPart.split('.');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    } else if (localPart.includes('_')) {
      const parts = localPart.split('_');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    } else if (localPart.includes('-')) {
      const parts = localPart.split('-');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    // Capitalize names
    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1);

    return {
      email: trimmedEmail,
      first_name: firstName,
      last_name: lastName
    };
  };

  const addEmail = (email: string): boolean => {
    const entry = parseEmailToEntry(email);
    if (!entry) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return false;
    }

    if (emails.includes(entry.email)) {
      toast({
        title: 'Duplicate email',
        description: 'This email has already been added',
        variant: 'destructive'
      });
      return false;
    }

    // Check seat limit
    if (isAtSeatLimit) {
      toast({
        title: 'Seat Limit Reached',
        description: 'You have reached your seat limit. Please upgrade your plan to invite more users.',
        variant: 'destructive'
      });
      return false;
    }

    if (availableSeats !== undefined && emails.length >= availableSeats) {
      toast({
        title: 'Too Many Invitations',
        description: `You can only invite ${availableSeats} more user${availableSeats !== 1 ? 's' : ''}. Please upgrade your plan or reduce the number of invitations.`,
        variant: 'destructive'
      });
      return false;
    }

    onEmailsChange([...emails, entry.email]);
    return true;
  };

  const removeEmail = (emailToRemove: string): void => {
    onEmailsChange(emails.filter((email) => email !== emailToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const email = currentEmailInput.trim();
      if (email) {
        if (addEmail(email)) {
          setCurrentEmailInput('');
        }
      }
    }
  };

  const handleEmailPaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    // Split on any newline (\r, \n, or \r\n), trim, and filter out empty lines
    const lines = pastedText.split(/[\r\n]+/).map((line) => line.trim()).filter((line) => line);

    if (lines.length > 1) {
      // Multiple lines pasted - treat as bulk paste
      let addedCount = 0;
      let duplicateCount = 0;
      let invalidCount = 0;
      const newEmails: string[] = [];

      for (const line of lines) {
        const entry = parseEmailToEntry(line);
        if (entry && !emails.includes(entry.email) && !newEmails.includes(entry.email)) {
          newEmails.push(entry.email);
          addedCount++;
        } else if (entry && (emails.includes(entry.email) || newEmails.includes(entry.email))) {
          duplicateCount++;
        } else {
          invalidCount++;
        }
      }

      // Check seat limit before adding emails
      if (isAtSeatLimit) {
        toast({
          title: 'Seat Limit Reached',
          description: 'You have reached your seat limit. Please upgrade your plan to invite more users.',
          variant: 'destructive'
        });
        setCurrentEmailInput('');
        return;
      }

      if (availableSeats !== undefined && (emails.length + newEmails.length) > availableSeats) {
        const canAdd = Math.max(0, availableSeats - emails.length);
        if (canAdd > 0) {
          // Only add what we can fit
          const limitedEmails = newEmails.slice(0, canAdd);
          onEmailsChange([...emails, ...limitedEmails]);
          toast({
            title: 'Limited Import',
            description: `Only ${canAdd} emails were added due to seat limit. ${newEmails.length - canAdd} emails were skipped.`,
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'No Seats Available',
            description: 'You have no available seats. Please upgrade your plan to invite more users.',
            variant: 'destructive'
          });
        }
        setCurrentEmailInput('');
        return;
      }

      if (newEmails.length > 0) {
        onEmailsChange([...emails, ...newEmails]);
      }

      // Show feedback
      let message = `Added ${addedCount} emails`;
      if (duplicateCount > 0) {
        message += `, ${duplicateCount} duplicates skipped`;
      }
      if (invalidCount > 0) {
        message += `, ${invalidCount} invalid entries ignored`;
      }

      toast({
        title: 'Bulk Import Complete',
        description: message,
        variant: addedCount === 0 ? 'destructive' : 'default'
      });

      setCurrentEmailInput('');
    } else {
      // Single line pasted - treat as normal input
      setCurrentEmailInput(pastedText);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex gap-2">
        <Input
          value={currentEmailInput}
          onChange={(e) => setCurrentEmailInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handleEmailPaste}
          placeholder={availableSeats !== undefined && emails.length >= availableSeats ? 'Seat limit reached' : placeholder}
          disabled={disabled || (availableSeats !== undefined && emails.length >= availableSeats)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (currentEmailInput.trim()) {
              if (addEmail(currentEmailInput.trim())) {
                setCurrentEmailInput('');
              }
            }
          }}
          disabled={
            disabled ||
            (availableSeats !== undefined && emails.length >= availableSeats) ||
            !currentEmailInput.trim()
          }
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Seat Limit Warning */}
      {isAtSeatLimit && (
        <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-xs text-destructive">
            ⚠️ You have reached your seat limit. Cannot invite more users.
          </p>
        </div>
      )}

      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <Badge
              key={email}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="text-xs">{email}</span>
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="ml-1 hover:text-destructive"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
