import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscriptionCheck } from '@/hooks/useSubscriptionCheck';
import { AlertCircle, CheckCircle, CreditCard } from 'lucide-react';

const SubscriptionStatus = (): JSX.Element => {
  const { hasActiveSubscription, isLoading, redirectToPayment } = useSubscriptionCheck();

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center space-x-4">
            <div className="rounded-full bg-gray-200 h-8 w-8"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasActiveSubscription) {
    return (
      <Card className="w-full border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-800 text-sm">Active Subscription</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-green-700 text-xs">
            Your subscription is active and you have access to all features.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-orange-800 text-sm">Subscription Required</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <CardDescription className="text-orange-700 text-xs">
          You need an active subscription to access all features. Start your free trial today!
        </CardDescription>
        <Button
          onClick={redirectToPayment}
          size="sm"
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Start Free Trial
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;
