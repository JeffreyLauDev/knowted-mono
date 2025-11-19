import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/lib/toast';
import { CheckCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const OAuthSuccess = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const provider = searchParams.get('provider') || 'calendar';
    const capitalizedProvider = provider.charAt(0).toUpperCase() + provider.slice(1);
    
    // Show success message
    toast.success(`${capitalizedProvider} connected successfully!`);

    // Send success message to parent window and close popup
    if (window.opener) {
            window.opener.postMessage({
        type: 'oauth-success',
        provider: provider,
        message: `${capitalizedProvider} connected successfully!`
      }, window.location.origin);
      
      // Close the popup after a short delay to ensure message is sent
      setTimeout(() => {
        window.close();
      }, 1000);
    } else {
      // If no opener (direct navigation), redirect to calendar page after showing message
      setTimeout(() => {
        window.location.href = '/organization/calendar';
      }, 2000);
    }
  }, [searchParams]);

  const provider = searchParams.get('provider') || 'calendar';
  const capitalizedProvider = provider.charAt(0).toUpperCase() + provider.slice(1);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Connection Successful!
          </CardTitle>
          <CardDescription>
            {capitalizedProvider} has been connected successfully.
            {window.opener ? ' This window will close automatically.' : ' Redirecting to calendar page...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-sm text-muted-foreground">
            You can now use your {provider} calendar with Knowted.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthSuccess; 