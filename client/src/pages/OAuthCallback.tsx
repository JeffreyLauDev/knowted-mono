import { calendarControllerHandleOAuthCallback } from '@/api/generated/knowtedAPI';
import { CalendarControllerHandleOAuthCallbackProvider } from '@/api/generated/models/calendarControllerHandleOAuthCallbackProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/lib/toast';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`OAuth error: ${error}`);
          toast.error(`OAuth failed: ${error}`);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Missing required OAuth parameters');
          toast.error('OAuth callback failed: Missing parameters');
          return;
        }

        // Parse the state parameter to get user and organization info
        const [userId, organizationId] = state.split('--');
        
        
        // Validate parsed parameters
        if (!userId || !organizationId) {
          console.error('Invalid state parameter format:', state);
          setStatus('error');
          setMessage('Invalid OAuth state parameter');
          toast.error('OAuth callback failed: Invalid state parameter');
          
          // Send error message to parent
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth-failed',
              error: 'Invalid state parameter format'
            }, window.location.origin);
            window.close();
          }
          return;
        }

        // Determine provider from URL or query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const providerParam = urlParams.get('provider') || 'google'; // Default to google if not specified
        
        
        // Send the authorization code to backend for token exchange
        try {
          const params = {
            code,
            state,
            provider: providerParam as CalendarControllerHandleOAuthCallbackProvider
          };

          
          // Call the backend API to handle OAuth callback (GET request)
          const response = await calendarControllerHandleOAuthCallback(params);
          
          console.log('Backend OAuth response:', response); 
          
          setStatus('success');
          setMessage(`${providerParam.charAt(0).toUpperCase() + providerParam.slice(1)} calendar connected successfully!`);
          toast.success(`${providerParam.charAt(0).toUpperCase() + providerParam.slice(1)} calendar connected successfully!`);

          // Close the popup window and send message to parent
          if (window.opener) {
                        window.opener.postMessage({
              type: 'oauth-success',
              provider: providerParam,
              organizationId,
              userId,
              response
            }, window.location.origin);
            
            // Add a small delay before closing to ensure message is sent
            setTimeout(() => {
              window.close();
            }, 100);
          } else {
            // If no opener, redirect to calendar page
            setTimeout(() => {
              navigate('/organization/calendar');
            }, 2000);
          }

        } catch (apiError: any) {
          console.error('Backend API error:', apiError);
          console.error('Error details:', {
            message: apiError.message,
            status: apiError.status,
            response: apiError.response,
            stack: apiError.stack
          });
          
          setStatus('error');
          setMessage('Failed to process OAuth with backend');
          toast.error('OAuth callback failed: Backend error');

          // Send error message to parent
          if (window.opener) {
                        window.opener.postMessage({
              type: 'oauth-failed',
              error: apiError.message || 'Backend API error'
            }, window.location.origin);
            
            // Add a small delay before closing to ensure message is sent
            setTimeout(() => {
              window.close();
            }, 100);
          }
        }

      } catch (error) {
        console.error('Error handling OAuth callback:', error);
        setStatus('error');
        setMessage('Failed to process OAuth callback');
        toast.error('OAuth callback failed');

        // Send error message to parent
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, window.location.origin);
          window.close();
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      navigate('/organization/calendar');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
            OAuth Callback
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'error' && (
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthCallback; 