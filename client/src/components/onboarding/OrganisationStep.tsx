import { useOrganizationsControllerGetMyInvitations } from '@/api/generated/knowtedAPI';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOnboarding } from '@/context/OnboardingContext';
import { toast } from '@/lib/toast';
import { Building2, Users } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';

interface OrganizationStepProps {
  onComplete: (hasNewOrganization: boolean) => void;
}

const OrganizationStep = ({ onComplete }: OrganizationStepProps): JSX.Element => {
  const {
    updateorganizationName,
    updateWebsite,
    updateEnhancedProfile,
    updateSelectedInvitations,
    onboardingData
  } = useOnboarding();

  // Use context for selected invitations instead of local state
  const selectedInvitations = onboardingData.selectedInvitations;

  // State for creating new organization
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [website, setWebsite] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualDescription, setManualDescription] = useState('');

  // Add a ref to track if we're already processing a click
  const processingRef = useRef(false);

  // Get user's invitations
  const { data: invitationsResponse, isLoading: isLoadingInvitations } = useOrganizationsControllerGetMyInvitations();

  // Extract invitations from response and memoize to prevent unnecessary re-renders
  const invitations = React.useMemo(() =>
    Array.isArray(invitationsResponse) ? invitationsResponse : [],
    [invitationsResponse]
  );

  // Auto-check create new organization if no invitations are available
  React.useEffect(() => {
    if (invitations.length === 0 && !isLoadingInvitations) {
      setShowCreateNew(true);
    }
  }, [invitations.length, isLoadingInvitations]);

    const handleInvitationToggle = useCallback((invitationId: string): void => {
    // Prevent rapid successive clicks
    if (processingRef.current) {
      console.warn('Click already being processed, ignoring');
      return;
    }

    processingRef.current = true;
    console.warn('handleInvitationToggle called with:', invitationId);

    const newState = selectedInvitations.includes(invitationId)
      ? selectedInvitations.filter((id) => id !== invitationId)
      : [...selectedInvitations, invitationId];

    updateSelectedInvitations(newState);

    // Reset the processing flag after a short delay
    setTimeout(() => {
      processingRef.current = false;
    }, 100);
  }, [selectedInvitations, updateSelectedInvitations]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // If user is creating a new organization, validate required fields
    if (showCreateNew) {
      if (!organizationName.trim()) {
        toast.error('Please enter your organization name');
        return;
      }

      if (!showManualInput && !website.trim()) {
        toast.error('Please enter your website URL');
        return;
      }

      if (website && !isValidUrl(website)) {
        toast.error('Please enter a valid website URL');
        return;
      }
    }

    // If user has selected invitations to join, store them in context but don't process yet
    if (selectedInvitations.length > 0) {
      // Store selected invitations in context for later processing
      updateSelectedInvitations(selectedInvitations);

      // If they're only joining existing orgs (not creating new), complete onboarding
      if (!showCreateNew) {
        onComplete(false); // false means no new organization created
        return;
      }
    }

    // If user is creating a new organization, continue to business profile steps
    if (showCreateNew) {
      setIsLoading(true);
      try {
        updateorganizationName(organizationName);
        updateWebsite(website);

        if (website) {
          // Fetch business profile from website
          const response = await fetch('https://n8n-app-platform-01-957yy.ondigitalocean.app/webhook/Onboarding_Website_Scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ website })
          });
          const data = await response.json();
          updateEnhancedProfile(data);
        }

        // Continue to business profile steps since they're creating a new org
        onComplete(true); // true means new organization will be created
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to process your information. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else if (selectedInvitations.length === 0) {
      // User hasn't selected anything
      toast.error('Please select at least one option: join existing organizations or create a new one');
    }
  };

  const handleManualSubmit = async (): Promise<void> => {
    if (!manualDescription.trim()) {
      toast.error('Please enter a description of your business');
      return;
    }

    setIsLoading(true);
    try {
      updateorganizationName(organizationName);
      updateWebsite(website);

      const response = await fetch('https://n8n-app-platform-01-957yy.ondigitalocean.app/webhook/business-description-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: manualDescription,
          companyName: organizationName
        })
      });
      const data = await response.json();
      updateEnhancedProfile(data);

      // Continue to business profile steps
      onComplete(true);
    } catch (error) {
      console.error('Error enhancing description:', error);
      toast.error('Failed to process your description. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      // Auto-prepend https:// if no protocol is provided
      const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://${url}`;
      new URL(urlWithProtocol);
      return true;
    } catch {
      return false;
    }
  };

  if (isLoading || isLoadingInvitations) {
    return (
      <div className="w-full animate-fade-in">
        <div className="text-center py-12 lg:py-16">
          <div className="animate-spin rounded-full h-8 w-8 lg:h-10 lg:w-10 border-b-2 border-primary mx-auto mb-3 lg:mb-4"></div>
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-foreground mb-2">Processing your information...</h2>
          <p className="text-sm text-gray-600 dark:text-muted-foreground">This may take a few moments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 lg:mb-8">
        <div className="flex justify-center mb-3 lg:mb-4">
          <div className="p-2 lg:p-3 rounded-full bg-primary/10 text-primary">
            <Building2 size={20} className="lg:w-6 lg:h-6" />
          </div>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-foreground mb-2 lg:mb-3">Organization Setup</h1>
        <p className="text-sm lg:text-base text-gray-600 dark:text-muted-foreground max-w-2xl mx-auto">
          Join organizations you're invited to and/or create your own
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
        {/* Organization Options Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-3">
            <Users size={18} className="text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground">Organization Options</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-muted-foreground mb-4">
            Select one or more options below. You can join existing organizations and/or create your own.
          </p>

          <div className="space-y-3">
            {/* Join Existing Organizations */}
            {invitations.length > 0 && (
              <>
                <div className="text-sm font-medium text-gray-700 dark:text-foreground mb-2">Join Existing Organizations:</div>
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-input rounded-lg hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => handleInvitationToggle(invitation.id)}
                  >
                    <Checkbox
                      id={invitation.id}
                      checked={selectedInvitations.includes(invitation.id)}
                      onCheckedChange={() => {
                        // Do nothing when clicked directly - only div clicks are handled
                      }}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={invitation.id}
                        className="text-sm font-medium text-gray-900 dark:text-foreground cursor-pointer"
                      >
                        {invitation.organization?.name || 'Unknown Organization'}
                      </Label>
                      <p className="text-xs text-gray-600 dark:text-muted-foreground">
                        Team: {invitation.team?.name} • Expires: {invitation.expires_at ? new Date(invitation.expires_at).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Create New Organization */}
            <div className="pt-2">
              <div className="text-sm font-medium text-gray-700 dark:text-foreground mb-2">Name your organization:</div>
              <div
                className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                  invitations.length === 0
                    ? 'border-primary/50 bg-primary/5 cursor-default'
                    : 'border-gray-200 dark:border-input hover:border-primary/30 cursor-pointer'
                }`}
                onClick={() => {
                  // Only allow toggling if there are invitations available
                  if (invitations.length === 0) {
                    return;
                  }

                  // Prevent rapid successive clicks
                  if (processingRef.current) {
                    console.warn('Click already being processed, ignoring');
                    return;
                  }

                  processingRef.current = true;
                  console.warn('Create new organization clicked');
                  setShowCreateNew(!showCreateNew);

                  // Reset the processing flag after a short delay
                  setTimeout(() => {
                    processingRef.current = false;
                  }, 100);
                }}
              >
                <Checkbox
                  id="createNew"
                  checked={showCreateNew}
                  disabled={invitations.length === 0}
                  onCheckedChange={() => {
                    // Do nothing when clicked directly - only div clicks are handled
                  }}
                />
                <Label
                  htmlFor="createNew"
                  className={`text-sm font-medium cursor-pointer ${
                    invitations.length === 0 ? 'text-gray-700 dark:text-foreground' : 'text-gray-900 dark:text-foreground'
                  }`}
                >
                  {invitations.length === 0
                    ? 'Create your organization (only option available)'
                    : 'I want to create my own organization'
                  }
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Create New Organization Form */}
        {showCreateNew && (
          <div className="ml-6 space-y-4 border-l-2 border-primary/20 pl-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-sm font-medium text-gray-700 dark:text-foreground">
                Organization Name
              </Label>
              <Input
                id="organizationName"
                placeholder="Enter your organization name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required={showCreateNew}
                className="h-10 lg:h-11 text-sm border-2 border-gray-200 dark:border-input focus:border-primary focus:ring-primary/20 transition-colors"
              />
              <p className="text-xs text-gray-500 dark:text-muted-foreground">
                This is what we'll use for your account and invoices
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-sm font-medium text-gray-700 dark:text-foreground">
                Website
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                required={showCreateNew && !showManualInput}
                className="h-10 lg:h-11 text-sm border-2 border-gray-200 dark:border-input focus:border-primary focus:ring-primary/20 transition-colors"
              />
              <p className="text-xs text-gray-500 dark:text-muted-foreground">
                We'll analyze your website to better understand your business
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-primary hover:text-primary/80 hover:bg-primary/10 text-sm"
                onClick={() => setShowManualInput(true)}
              >
                I don't have a website or business profile
              </Button>
            </div>
          </div>
        )}

        {/* Business Description Input */}
        {showCreateNew && showManualInput && (
          <div className="ml-6 p-4 bg-gray-50 dark:bg-muted rounded-lg border-l-2 border-primary/20">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-foreground">
                  Business Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="e.g., We are a B2B SaaS company providing project management solutions for construction companies..."
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  rows={4}
                  className="text-sm border-2 border-gray-200 dark:border-input focus:border-primary focus:ring-primary/20 transition-colors resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-muted-foreground">
                  Be as detailed as possible to help us understand your business better
                </p>
              </div>

              <Button
                type="button"
                className="w-full h-10 lg:h-11 text-sm font-medium  transition-all duration-200"
                onClick={handleManualSubmit}
                disabled={isLoading || !manualDescription.trim()}
              >
                {isLoading ? 'Analyzing...' : 'Enhance Description'}
              </Button>
            </div>
          </div>
        )}

        {/* Action Summary */}
        <div className="pt-4 lg:pt-6 space-y-3">

          <Button
            type="submit"
            className="w-full h-10 lg:h-11 text-sm font-medium bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 transition-all duration-200"
            disabled={
              isLoading ||
              (showCreateNew && !organizationName.trim()) ||
              (selectedInvitations.length === 0 && !showCreateNew)
            }
          >
            {isLoading ? 'Processing...' : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OrganizationStep;
