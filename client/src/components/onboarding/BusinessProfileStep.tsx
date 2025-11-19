import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOnboarding } from '@/context/OnboardingContext';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BusinessProfile {
  company_name: string;
  description: string;
  whatsYourOffering: string;
  industry: string;
  target_audience: string;
  channels: string;
}

interface BusinessProfileStepProps {
  onComplete: () => void;
}

const BusinessProfileStep = ({ onComplete }: BusinessProfileStepProps): JSX.Element => {
  const { onboardingData, updateEnhancedProfile } = useOnboarding();
  const [profile, setProfile] = useState<BusinessProfile>(
    onboardingData.enhancedProfile || {
      company_name: '',
      description: '',
      whatsYourOffering: '',
      industry: '',
      target_audience: '',
      channels: ''
    }
  );
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();

  // Sync profile with context changes
  useEffect(() => {
    if (onboardingData.enhancedProfile) {
      setProfile(onboardingData.enhancedProfile);
    }
  }, [onboardingData.enhancedProfile]);

  const handleVerify = (): void => {
    setIsVerified(true);
    updateEnhancedProfile(profile);
    onComplete();
  };

  const handleProfileChange = (field: keyof BusinessProfile, value: string): void => {
    const updatedProfile = {
      ...profile,
      [field]: value
    };
    setProfile(updatedProfile);
    updateEnhancedProfile(updatedProfile);
  };

  if (isVerified) {
    return (
      <div className="w-full animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6 lg:mb-8">
          <div className="flex justify-center mb-3 lg:mb-4">
            <div className="p-2 lg:p-3 rounded-full bg-primary/10 text-primary">
              <Briefcase size={20} className="lg:w-6 lg:h-6" />
            </div>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-foreground mb-2 lg:mb-3">Business Profile Verified</h1>
          <p className="text-sm lg:text-base text-gray-600 dark:text-muted-foreground max-w-2xl mx-auto">
            Your business profile has been successfully verified and updated
          </p>
        </div>

        {/* Profile Display */}
        <div className="bg-gray-50 dark:bg-muted rounded-lg lg:rounded-xl p-4 lg:p-6 mb-4 lg:mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div className="space-y-3 lg:space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wide">Company Name</Label>
                <p className="mt-1 text-sm lg:text-base font-medium text-gray-900 dark:text-foreground">{profile?.company_name}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wide">Industry</Label>
                <p className="mt-1 text-sm lg:text-base font-medium text-gray-900 dark:text-foreground">{profile?.industry}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wide">Target Audience</Label>
                <p className="mt-1 text-sm lg:text-base font-medium text-gray-900 dark:text-foreground">{profile?.target_audience}</p>
              </div>
            </div>
            <div className="space-y-3 lg:space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wide">Description</Label>
                <p className="mt-1 text-xs lg:text-sm text-gray-700 dark:text-foreground leading-relaxed">{profile?.description}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wide">What's Your Offering</Label>
                <p className="mt-1 text-xs lg:text-sm text-gray-700 dark:text-foreground leading-relaxed">{profile?.whatsYourOffering}</p>
              </div>
              {profile?.channels && (
                <div>
                  <Label className="text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wide">Channels</Label>
                  <p className="mt-1 text-xs lg:text-sm text-gray-700 dark:text-foreground leading-relaxed">{profile.channels}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3">
          <Button
            variant="outline"
            onClick={() => setIsVerified(false)}
            className="h-9 lg:h-10 px-4 lg:px-6 text-sm"
          >
            Edit Profile
          </Button>
          <Button
            onClick={handleVerify}
            className="h-9 lg:h-10 px-4 lg:px-6 text-sm bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-primary/20"
          >
            Continue
          </Button>
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
            <Briefcase size={20} className="lg:w-6 lg:h-6" />
          </div>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-foreground mb-2 lg:mb-3">Business Profile</h1>
        <p className="text-sm lg:text-base text-gray-600 dark:text-muted-foreground max-w-2xl mx-auto">
          Review and edit the enhanced information about your business
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4 lg:space-y-6">
        <div className="space-y-4 lg:space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-foreground">Company Name</Label>
            <Textarea
              value={profile?.company_name || ''}
              onChange={(e) => handleProfileChange('company_name', e.target.value)}
              className="min-h-[50px] text-sm border-2 border-gray-200 dark:border-input focus:border-primary focus:ring-primary/20 transition-colors resize-none"
              placeholder="Enter your company name"
            />
            <p className="text-xs text-gray-500 dark:text-muted-foreground">
              The official name of your organization
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-foreground">Industry</Label>
            <Textarea
              value={profile?.industry || ''}
              onChange={(e) => handleProfileChange('industry', e.target.value)}
              className="min-h-[50px] text-sm border-2 border-gray-200 dark:border-input focus:border-primary focus:ring-primary/20 transition-colors resize-none"
              placeholder="e.g., Technology, Healthcare, Finance"
            />
            <p className="text-xs text-gray-500 dark:text-muted-foreground">
              The primary industry your business operates in
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-foreground">Target Audience</Label>
            <Textarea
              value={profile?.target_audience || ''}
              onChange={(e) => handleProfileChange('target_audience', e.target.value)}
              className="min-h-[50px] text-sm border-2 border-gray-200 dark:border-input focus:border-primary focus:ring-primary/20 transition-colors resize-none"
              placeholder="e.g., Small business owners, Enterprise clients"
            />
            <p className="text-xs text-gray-500 dark:text-muted-foreground">
              Who your products or services are designed for
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-foreground">Description</Label>
            <Textarea
              value={profile?.description || ''}
              onChange={(e) => handleProfileChange('description', e.target.value)}
              className="min-h-[70px] text-sm border-2 border-gray-200 dark:border-input focus:border-primary focus:ring-primary/20 transition-colors resize-none"
              placeholder="Describe what your company does..."
              rows={3}
            />
            <p className="text-xs text-gray-500 dark:text-muted-foreground">
              A brief overview of your business and mission
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-foreground">What's Your Offering</Label>
            <Textarea
              value={profile?.whatsYourOffering || ''}
              onChange={(e) => handleProfileChange('whatsYourOffering', e.target.value)}
              className="min-h-[50px] text-sm border-2 border-gray-200 dark:border-input focus:border-primary focus:ring-primary/20 transition-colors resize-none"
              placeholder="e.g., Project management software, Consulting services"
            />
            <p className="text-xs text-gray-500 dark:text-muted-foreground">
              The main products or services you provide
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-foreground">Channels</Label>
            <Textarea
              value={profile?.channels || ''}
              onChange={(e) => handleProfileChange('channels', e.target.value)}
              className="min-h-[50px] text-sm border-2 border-gray-200 dark:border-input focus:border-primary focus:ring-primary/20 transition-colors resize-none"
              placeholder="e.g., Online, Retail stores, Partnerships"
            />
            <p className="text-xs text-gray-500 dark:text-muted-foreground">
              How you reach and serve your customers
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between pt-4 lg:pt-6 space-y-2 sm:space-y-0">
          <Button
            variant="outline"
            onClick={() => navigate('/onboarding/organization')}
            className="h-9 lg:h-10 px-4 lg:px-6 text-sm order-2 sm:order-1 sm:mt-0 mt-3"
          >
            <ArrowLeft size={16} className="mr-2 lg:w-4 lg:h-4" />
            Back
          </Button>
          <Button
            onClick={handleVerify}
            disabled={!profile.company_name.trim()}
            className="h-9 lg:h-10 px-4 lg:px-6 text-sm bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 order-1 sm:order-2"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfileStep;
