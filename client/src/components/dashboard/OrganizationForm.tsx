import {
    useOrganizationsControllerFindAll,
    useOrganizationsControllerUpdate
} from '@/api/generated/knowtedAPI';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useOrganizationDetails } from '@/hooks/useOrganizationDetails';
import { toast } from '@/lib/toast';
import { Loader2, Save } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface OrganizationFormData {
  name: string;
  website: string;
  company_analysis: string;
  company_type: string;
  team_size: string;
  business_description: string;
  business_offering: string;
  industry: string;
  target_audience: string;
  channels: string;
}

// Auto-expanding Textarea component
const AutoExpandingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<typeof Textarea> & { minRows?: number }
>(
  ({ value, minRows = 2, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';

        // Calculate the height based on content
        const scrollHeight = textarea.scrollHeight;
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
        const minHeight = lineHeight * minRows;

        // Set the height to the larger of scrollHeight or minHeight
        textarea.style.height = `${Math.max(scrollHeight, minHeight)}px`;
      }
    }, [value, minRows, textareaRef]);

    return <Textarea ref={textareaRef} value={value} {...props} />;
  }
);

const OrganizationForm: React.FC = (): JSX.Element => {
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    website: '',
    company_analysis: '',
    company_type: '',
    team_size: '',
    business_description: '',
    business_offering: '',
    industry: '',
    target_audience: '',
    channels: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user, organization } = useAuth();
  const { organizationDetails, isLoading: detailsLoading, refetch } = useOrganizationDetails();
  const updateOrganization = useOrganizationsControllerUpdate();

  // Hook to refetch all organizations from /api/v1/organizations
  const { refetch: refetchAllOrganizations } = useOrganizationsControllerFindAll({
    query: {
      enabled: false, // Don't fetch automatically, only when we call refetch
      staleTime: 0
    }
  });

  useEffect(() => {
    if (organizationDetails) {
      // Handle both direct response and AxiosResponse wrapper
      const orgData = 'data' in organizationDetails ? organizationDetails.data : organizationDetails;
      setFormData({
        name: orgData.name || '',
        website: orgData.website || '',
        company_analysis: orgData.company_analysis || '',
        company_type: orgData.company_type || '',
        team_size: orgData.team_size || '',
        business_description: orgData.business_description || '',
        business_offering: orgData.business_offering || '',
        industry: orgData.industry || '',
        target_audience: orgData.target_audience || '',
        channels: orgData.channels || ''
      });
    }
  }, [organizationDetails]);

  const handleInputChange = (field: keyof OrganizationFormData, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Organization name is required');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to update organization details');
      return;
    }

    setIsLoading(true);

    try {
      await updateOrganization.mutateAsync({
        id: organization.id,
        data: formData
      });

      toast.success('Organization details updated successfully');

      // Refetch both the specific organization and all organizations from /api/v1/organizations
      await Promise.all([
        refetch(),
        refetchAllOrganizations()
      ]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update organization: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (detailsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      <form onSubmit={handleSubmit}>
        {/* Basic Information Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-28">
            {/* Left Column - Description */}
            <div className="lg:col-span-1">
              <h3 className="text-base font-semibold text-foreground mb-1">Basic Information</h3>
              <p className="text-sm text-muted-foreground">Essential details about your organization. Helps Knowted AI customize meeting insights and recommendations.</p>
            </div>

            {/* Right Column - Settings */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="org-name" className="text-sm font-medium text-foreground">
                    Organization Name *
                  </Label>
                  <Input
                    id="org-name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter organization name"
                    className="h-10"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Personalizes AI meeting summaries</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-sm font-medium text-foreground">
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://example.com"
                    className="h-10"
                    type="url"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Separator */}
        <div className="border-t border-gray-200 my-8"></div>

        {/* Company Details Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-28">
            {/* Left Column - Description */}
            <div className="lg:col-span-1">
              <h3 className="text-base font-semibold text-foreground mb-1">Company Details</h3>
              <p className="text-sm text-muted-foreground">Company structure, industry, and team size. Helps Knowted AI provide relevant meeting analysis and industry insights.</p>
            </div>

            {/* Right Column - Settings */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="company-type" className="text-sm font-medium text-foreground">
                    Company Type
                  </Label>
                  <Input
                    id="company-type"
                    value={formData.company_type}
                    onChange={(e) => handleInputChange('company_type', e.target.value)}
                    placeholder="SaaS, E-commerce, Agency"
                    className="h-10 border-gray-300 focus:border-primary focus:ring-primary ring-offset-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="team-size" className="text-sm font-medium text-foreground">
                    Team Size
                  </Label>
                  <Input
                    id="team-size"
                    value={formData.team_size}
                    onChange={(e) => handleInputChange('team_size', e.target.value)}
                    placeholder="1-10, 11-50, 51-200, 200+"
                    className="h-10 border-gray-300 focus:border-primary focus:ring-primary ring-offset-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="industry" className="text-sm font-medium text-foreground">
                    Industry
                  </Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    placeholder="Technology, Healthcare, Finance"
                    className="h-10 border-gray-300 focus:border-primary focus:ring-primary ring-offset-background"
                  />
                  <p className="text-xs text-muted-foreground">Industry-specific AI insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Separator */}
        <div className="border-t border-gray-200 my-8"></div>

        {/* Business Description Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-28">
            {/* Left Column - Description */}
            <div className="lg:col-span-1">
              <h3 className="text-base font-semibold text-foreground mb-1">Business Description</h3>
              <p className="text-sm text-muted-foreground">What your business does and its mission. Helps Knowted AI generate accurate meeting summaries and action items.</p>
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80 font-medium mt-2 transition-colors underline"
                onClick={() => {
                  // TODO: Add examples functionality
                  // Show examples functionality will be implemented here
                }}
              >
                View examples
              </button>
            </div>

            {/* Right Column - Settings */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="business-description" className="text-sm font-medium text-foreground">
                  Business Description
                </Label>
                <AutoExpandingTextarea
                  id="business-description"
                  value={formData.business_description}
                  onChange={(e) => handleInputChange('business_description', e.target.value)}
                  placeholder="Detailed description of what your business does and its mission"
                  className=" border-gray-300 focus:border-primary focus:ring-primary ring-offset-background min-h-[80px] resize-none overflow-hidden"
                  minRows={3}
                />
                <p className="text-xs text-muted-foreground">AI uses this to understand your business context and generate relevant meeting insights</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="business-offering" className="text-sm font-medium text-foreground">
                  What You Offer
                </Label>
                <AutoExpandingTextarea
                  id="business-offering"
                  value={formData.business_offering}
                  onChange={(e) => handleInputChange('business_offering', e.target.value)}
                  placeholder="Software solutions, consulting services, digital products"
                  className="border-gray-300 focus:border-primary focus:ring-primary ring-offset-background min-h-[60px] resize-none overflow-hidden"
                  minRows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-analysis" className="text-sm font-medium text-foreground">
                  Company Analysis
                </Label>
                <AutoExpandingTextarea
                  id="company-analysis"
                  value={formData.company_analysis}
                  onChange={(e) => handleInputChange('company_analysis', e.target.value)}
                  placeholder="We are a SaaS company focused on providing innovative solutions for small businesses."
                  className="border-gray-300 focus:border-primary focus:ring-primary ring-offset-background min-h-[60px] resize-none overflow-hidden"
                  minRows={2}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section Separator */}
        <div className="border-t border-gray-200 my-8"></div>

        {/* Target Audience & Marketing Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-28">
            {/* Left Column - Description */}
            <div className="lg:col-span-1">
              <h3 className="text-base font-semibold text-foreground mb-1">Target Audience & Marketing</h3>
              <p className="text-sm text-muted-foreground">Target market and marketing approach. Helps Knowted AI understand customer conversations and provide relevant insights.</p>
            </div>

            {/* Right Column - Settings */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="target-audience" className="text-sm font-medium text-foreground">
                  Target Audience
                </Label>
                <AutoExpandingTextarea
                  id="target-audience"
                  value={formData.target_audience}
                  onChange={(e) => handleInputChange('target_audience', e.target.value)}
                  placeholder="Small businesses, Enterprise clients, Startups"
                  className="border-gray-300 focus:border-primary focus:ring-primary ring-offset-background min-h-[60px] resize-none overflow-hidden"
                  minRows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="channels" className="text-sm font-medium text-foreground">
                  Marketing Channels
                </Label>
                <AutoExpandingTextarea
                  id="channels"
                  value={formData.channels}
                  onChange={(e) => handleInputChange('channels', e.target.value)}
                  placeholder="Social media, Email, Content marketing"
                  className="border-gray-300 focus:border-primary focus:ring-primary ring-offset-background min-h-[60px] resize-none overflow-hidden"
                  minRows={2}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 my-8"></div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-8">
          <Button
            type="button"
            variant="outline"
            className="px-4 py-2 h-9 text-sm text-foreground border-border hover:bg-accent"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 h-9 text-sm font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OrganizationForm;
